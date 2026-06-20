import {
  createChatGlobal,
  addMessageToGlobalChat,
  createChatForTopic,
  addMessageToTopicChat,
  updateGlobalChatMessage,
  updateTopicChatMessage,
  updateChatSummary,
  getTopicData,
  updateTopicMemory,
  getUserLibraryStoreId,
  setTopicVectorStoreId,
  addLibraryFileRecords,
  getLibraryFiles,
  deleteLibraryFileRecordsByIds,
} from "@/firebase/chatStore";
import { indexTextSnippet } from "./attachmentProcessing";
import { fetchChatSummary } from "@/ai/chatSummary";
import { fetchChatTitle } from "@/ai/chatTitle";
import { updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

async function fetchChatSummaryFromStore({ uid, chatId, topicId }) {
  const ref = topicId
    ? doc(db, "users", uid, "topics", topicId, "chats", chatId)
    : doc(db, "users", uid, "chats", chatId);

  const snap = await getDoc(ref);
  return snap.exists() ? snap.data()?.summary || "" : "";
}

const getMessagesRef = (uid, chatId, topicId) =>
  topicId
    ? collection(db, "users", uid, "topics", topicId, "chats", chatId, "messages")
    : collection(db, "users", uid, "chats", chatId, "messages");

async function fetchLastMessages({ uid, chatId, topicId, limitCount = 10 }) {
  const q = query(
    getMessagesRef(uid, chatId, topicId),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  );

  const snap = await getDocs(q);
  return snap.docs.reverse().map(d => d.data()).map(({ role, content }) => ({ role, content }));
}

// ── Shared library TTL ──
// Files uploaded in regular (non-topic) chats are short-lived: they expire from
// the shared per-user library after this many days. Topic files are exempt —
// they live until the topic is deleted. Cleanup is lazy & throttled (at most
// once an hour per session) and runs fire-and-forget so it never blocks a send.
const LIBRARY_TTL_DAYS = 7;
const TTL_SWEEP_INTERVAL_MS = 60 * 60 * 1000;
let lastTtlSweepAt = 0;

async function sweepExpiredLibrary(uid) {
  if (!uid) return;
  const now = Date.now();
  if (now - lastTtlSweepAt < TTL_SWEEP_INTERVAL_MS) return;
  lastTtlSweepAt = now;

  try {
    const files = await getLibraryFiles({ uid, topicId: null });
    if (!files.length) return;

    const cutoff = now - LIBRARY_TTL_DAYS * 24 * 60 * 60 * 1000;
    const expired = files.filter((f) => {
      const ms = f.addedAt?.toMillis?.();
      return typeof ms === "number" && ms < cutoff;
    });
    if (!expired.length) return;

    const storeId = await getUserLibraryStoreId(uid);
    const fileIds = expired.map((f) => f.openaiFileId).filter(Boolean);

    if (fileIds.length > 0) {
      await fetch("/api/library/expire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vectorStoreId: storeId, fileIds }),
      }).catch(() => {});
    }

    await deleteLibraryFileRecordsByIds({
      uid,
      topicId: null,
      ids: expired.map((f) => f.id),
    });
  } catch {
    /* silent — cleanup is best-effort */
  }
}

const summaryLocks = new Set();
const sendLocks = new Set();

export async function sendChatMessage({
  message,
  attachments = [],
  currentUser,
  activeChatId,
  topicIdFromURL,
  projectChatSessions,
  setProjectChatSessions,
  setActiveProject,
  setActiveChatId,
  setIsLoadingMessages,
  setStreamingMessage,
  clearStreamingMessage,
  setPendingSend,
  beginGeneration,
  endGeneration,
  vesselProfile = null,
}) {
  if (!message?.trim()) return;
  if (!currentUser?.uid) return;

  // Opportunistic, throttled TTL cleanup of the shared library (fire & forget).
  sweepExpiredLibrary(currentUser.uid);

  const topicId =
    topicIdFromURL && topicIdFromURL !== "null" ? topicIdFromURL : null;
  const inTopic = Boolean(topicId);
  let chatId = activeChatId;
  const isNewChat = !chatId;
  let aiMessageId;
  let genAbortController = null;

  const sendKey = `${currentUser?.uid}:${topicIdFromURL || "global"}`;

if (sendLocks.has(sendKey)) {
  return;
}

sendLocks.add(sendKey);

  try {

  // ───────── CREATE CHAT IF NEEDED ─────────
  if (!chatId) {
    if (inTopic) {
      const created = await createChatForTopic({
        uid: currentUser.uid,
        topicId,
        messageText: message,
      });

      chatId = created.chatId;
      setActiveProject(topicId);
      setActiveChatId(chatId);
      // Flip into "loading messages" in the same batch so the UI jumps
      // straight to the chat area instead of flashing the chat list
      setIsLoadingMessages?.(true);

      const snap = await getDoc(
        doc(db, "users", currentUser.uid, "topics", topicId, "chats", chatId)
      );

      setProjectChatSessions((prev) => {
        const updated = { ...prev };
        updated[topicId] = [
          {
            chatId,
            createdAt: snap.data()?.createdAt?.toMillis?.() ?? Date.now(),
            messages: [],
            title: message.slice(0, 60),
          },
          ...(updated[topicId] || []),
        ];
        return updated;
      });
    } else {
      const created = await createChatGlobal({
        uid: currentUser.uid,
        messageText: message,
      });

      chatId = created.chatId;
      setActiveProject(null);
      setActiveChatId(chatId);
      setIsLoadingMessages?.(true);

      const snap = await getDoc(
        doc(db, "users", currentUser.uid, "chats", chatId)
      );

      setProjectChatSessions((prev) => {
        const updated = { ...prev };
        updated.global = [
          {
            chatId,
            createdAt: snap.data()?.createdAt?.toMillis?.() ?? Date.now(),
            messages: [],
            title: message.slice(0, 60),
          },
          ...(updated.global || []),
        ];
        return updated;
      });
    }
  }

  // ───────── OPTIMISTIC RENDER ─────────
  // Show the outgoing message instantly (with image previews and a "thinking"
  // bubble). Attachments arrive already uploaded (processed on attach), so we
  // can preview straight from their Storage URL.
  if (setPendingSend) {
    const previews = (attachments || []).map((f) => ({
      name: f.name,
      type: f.type,
      previewUrl: f.isImage ? (f.url || (f.file && URL.createObjectURL(f.file))) : undefined,
    }));
    setPendingSend({ chatId, message, attachments: previews });
  }

  // ───────── CONTEXT BUILD (before saving new messages) ─────────
  const previousMessages = await fetchLastMessages({
    uid: currentUser.uid,
    chatId,
    topicId: inTopic ? topicId : null,
  });

  const summary = await fetchChatSummaryFromStore({
    uid: currentUser.uid,
    chatId,
    topicId: inTopic ? topicId : null,
  });

  const chatHistory = previousMessages;

  // Fetch topic-level context when inside a topic
  let topicInstruction = "";
  let topicMemory = "";
  let topicStoreId = "";
  if (inTopic) {
    try {
      const topicData = await getTopicData(currentUser.uid, topicId);
      topicInstruction = topicData?.description || "";
      topicMemory = topicData?.topicMemory || "";
      topicStoreId = topicData?.vectorStoreId || "";
    } catch { /* silent */ }
  }

  // ───────── SAVE USER MESSAGE ─────────
  // Attachments are already uploaded AND processed (on attach). We only consume
  // the prepared metadata here — no Storage upload, no indexing. Any file that
  // reached Storage (has a url) is attached & openable.
  const usableAttachments = (attachments || []).filter((a) => a.url);

  // Vision input = only images whose VISUAL is actually needed (diagrams,
  // charts, photos). Text-only screenshots were OCR'd into the store on attach,
  // so we skip vision for them → faster answers.
  const uploadedImages = usableAttachments
    .filter((a) => a.isImage && a.visualRequired !== false)
    .map((a) => ({ name: a.name, type: a.type, url: a.url, path: a.path }));

  // Searchable = anything that got indexed (docs, scanned-PDF OCR, and
  // text-bearing images) — identified by an openaiFileId.
  const searchableDocs = usableAttachments
    .filter((a) => a.openaiFileId)
    .map((a) => ({
      name: a.name,
      type: a.type,
      url: a.url,
      path: a.path,
      openaiFileId: a.openaiFileId,
      vectorStoreId: a.vectorStoreId,
    }));

  // Document names are sent so the model knows which files it may cite.
  const documentPayloads = searchableDocs.map((d) => ({
    name: d.name,
    type: d.type,
    url: d.url,
  }));

  // Resolve the vector store to search. New docs already carry their store id;
  // otherwise fall back to the scope's persistent store so earlier uploads stay
  // searchable.
  let vectorStoreId =
    searchableDocs.find((d) => d.vectorStoreId)?.vectorStoreId || "";
  if (!vectorStoreId) {
    vectorStoreId = inTopic
      ? topicStoreId
      : await getUserLibraryStoreId(currentUser.uid).catch(() => "");
  }
  const vectorStoreIds = vectorStoreId ? [vectorStoreId] : [];

  // Everything attached is shown & openable in the message (regardless of how
  // it's consumed: vision, File Search, or both).
  const uploadedAttachments = usableAttachments.map((a) => ({
    name: a.name,
    type: a.type,
    url: a.url,
    path: a.path,
  }));

const userMessagePayload = {
  role: "user",
  content: message,
  attachments: uploadedAttachments,
};

if (inTopic) {
  await addMessageToTopicChat(topicId, chatId, userMessagePayload);
} else {
  await addMessageToGlobalChat(chatId, userMessagePayload);
}

  // ───────── AI PLACEHOLDER ─────────
  if (inTopic) {
    aiMessageId = (
      await addMessageToTopicChat(topicId, chatId, "NaviMind syncing…", "assistant")
    )?.messageId;
  } else {
    aiMessageId = (
      await addMessageToGlobalChat(chatId, "NaviMind syncing…", "assistant")
    )?.messageId;
  }

  // Real user message + placeholder are now persisted — drop the optimistic one.
  setPendingSend?.(null);

  // ───────── RECORD LIBRARY FILES ─────────
  // Indexing happened on attach; here we just persist a record of each indexed
  // doc (now that chatId exists) for citation-mapping and TTL cleanup.
  if (searchableDocs.length > 0) {
    addLibraryFileRecords({
      uid: currentUser.uid,
      topicId: inTopic ? topicId : null,
      chatId,
      files: searchableDocs.map((d) => ({ ...d, vectorStoreId })),
    }).catch(() => {});
  }

  // ───────── AI REQUEST ─────────
  // AbortController lets the user stop generation; signal is passed to fetch.
  genAbortController = new AbortController();
  beginGeneration?.(genAbortController, chatId);
  let aborted = false;

  const res = await fetch("/api/rag", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      question: message,
      chatHistory,
      summary,
      imageUrls: uploadedImages.map((a) => a.url),
      documentFiles: documentPayloads,
      vectorStoreIds,
      vesselProfile,
      topicInstruction,
      topicMemory,
    }),
    signal: genAbortController.signal,
  });

  const contentType = res.headers.get("content-type") || "";
  let finalText = "";
  let sources = [];
  let streamedSources = [];

if (res.body && contentType.includes("text/event-stream")) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffer = "";

  // Live streaming → push tokens into the context overlay, throttled to one
  // update per animation frame. The trailing [[CITED_FILES:...]] marker is
  // hidden on the fly so it never flashes in the UI.
  let liveScheduled = false;
  const pushLive = () => {
    liveScheduled = false;
    if (!setStreamingMessage || !aiMessageId) return;
    // Hide citation markers while streaming (they resolve to pills only once the
    // final message is saved): drop complete markers and any partial at the end.
    const live = finalText
      .replace(/\[\[\s*cite:[^\]]*\]\]/gi, "")
      .replace(/\[\[\s*cite:[^\]]*$/i, "");
    setStreamingMessage(aiMessageId, live);
  };
  const scheduleLive = () => {
    if (liveScheduled) return;
    liveScheduled = true;
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(pushLive);
    else pushLive();
  };
  // Enter "streaming" state immediately so the UI shows the thinking spinner.
  if (setStreamingMessage && aiMessageId) setStreamingMessage(aiMessageId, "");

  try {
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const chunk of parts) {
      const lines = chunk.split("\n");

      let event = "";
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        }

        if (line.startsWith("data:")) {
          let part = line.slice(5);
          if (part.startsWith(" ")) part = part.slice(1);
          data += (data ? "\n" : "") + part;
        }
      }

      if (event === "token") {
        finalText += data.replace(/\\n/g, "\n");
        scheduleLive();
      }

      if (event === "sources") {
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) streamedSources.push(...parsed);
  } catch (e) {
    console.error("Failed to parse sources:", data);
  }
}

      if (event === "error") {
        throw new Error(data || "SSE error");
      }
    }
  }
  } catch (streamErr) {
    // User pressed Stop → keep whatever was generated so far (graceful).
    if (genAbortController.signal.aborted) {
      aborted = true;
      try { await reader.cancel(); } catch { /* noop */ }
    } else {
      throw streamErr;
    }
  }

  // ── Inline source citations ──
  // The model places inline markers right after each claim it draws from a
  // document: "[[cite:filename.pdf]]". We DON'T strip them (they're rendered
  // inline as clickable pills); we only resolve the cited filenames to file
  // metadata so the pills know which file to open. The candidate pool is the
  // files attached in THIS message plus any previously-indexed files for this
  // scope (so citations to earlier uploads still open).
  let fileSources = [];
  if (finalText.includes("[[cite:")) {
    let candidates = [...searchableDocs];
    try {
      const prior = await getLibraryFiles({
        uid: currentUser.uid,
        topicId: inTopic ? topicId : null,
      });
      candidates = [...candidates, ...prior];
    } catch { /* silent */ }

    const findDoc = (n) => {
      const low = n.toLowerCase();
      return (
        candidates.find((d) => d.name?.toLowerCase() === low) ||
        candidates.find(
          (d) =>
            d.name?.toLowerCase().endsWith(low) ||
            low.endsWith(d.name?.toLowerCase() || "")
        )
      );
    };
    const seen = new Set();
    const re = /\[\[\s*cite:\s*([^\]]+?)\s*\]\]/gi;
    let m;
    while ((m = re.exec(finalText)) !== null) {
      const docMeta = findDoc(m[1].trim());
      if (docMeta?.url && !seen.has(docMeta.url)) {
        seen.add(docMeta.url);
        fileSources.push({ name: docMeta.name, type: docMeta.type, url: docMeta.url });
      }
    }
  }

  // финальный апдейт ОДИН РАЗ
  if (aiMessageId) {
   const payload = {
  content: finalText || (aborted ? "⏹️ Stopped." : " "),
  sources: streamedSources,
  fileSources,
};
    if (inTopic) {
      await updateTopicChatMessage(topicId, chatId, aiMessageId, payload);
    } else {
      await updateGlobalChatMessage(chatId, aiMessageId, payload);
    }
    // Persisted final text — drop the live overlay (Firestore now drives it).
    clearStreamingMessage?.(aiMessageId);
  }
}

  // ───────── AI TITLE (new chats only, fire & forget) ─────────
  if (isNewChat) {
    fetchChatTitle(message).then(async (aiTitle) => {
      if (!aiTitle) return;
      try {
        const chatDocRef = inTopic
          ? doc(db, "users", currentUser.uid, "topics", topicId, "chats", chatId)
          : doc(db, "users", currentUser.uid, "chats", chatId);
        await updateDoc(chatDocRef, { title: aiTitle });
      } catch { /* silent */ }
    }).catch(() => {});
  }

  // ───────── SUMMARY UPDATE ─────────
  const summaryKey = `${currentUser.uid}:${inTopic ? topicId : "global"}:${chatId}`;

if (!summaryLocks.has(summaryKey)) {
  summaryLocks.add(summaryKey);

  try {
    const newSummary = await fetchChatSummary({
      messages: [...chatHistory, { role: "assistant", content: finalText }],
      previousSummary: summary,
    });

    if (newSummary) {
      await updateChatSummary({
        uid: currentUser.uid,
        chatId,
        topicId: inTopic ? topicId : null,
        summaryText: newSummary,
      });
    }
  } catch (e) {
    // можно логировать позже
  } finally {
    summaryLocks.delete(summaryKey);
  }
}
  // ───────── TOPIC MEMORY UPDATE (fire & forget) ─────────
  if (inTopic) {
    const topicMemoryKey = `${currentUser.uid}:${topicId}:topicMemory`;
    if (!summaryLocks.has(topicMemoryKey)) {
      summaryLocks.add(topicMemoryKey);
      fetchChatSummary({
        messages: [
          ...chatHistory,
          { role: "user", content: message },
          { role: "assistant", content: finalText },
        ],
        previousSummary: topicMemory,
        mode: "topic",
      })
        .then(async (newTopicMemory) => {
          if (newTopicMemory) {
            await updateTopicMemory(currentUser.uid, topicId, newTopicMemory);
          }
        })
        .catch(() => {})
        .finally(() => summaryLocks.delete(topicMemoryKey));
    }
  }

  // ───────── TOPIC COLD MEMORY (fire & forget) ─────────
  // Index this exchange into the topic's vector store so File Search can recall
  // it later — the deep "cold memory" that complements the short topic summary.
  // Topic-scoped, so it's exempt from the global library TTL and is cleaned up
  // when the topic is deleted.
  if (inTopic && !aborted && finalText && finalText.trim()) {
    (async () => {
      try {
        const content = `User: ${message}\n\nAssistant: ${finalText}`;
        const data = await indexTextSnippet({
          vectorStoreId, // resolved earlier (may be "" → store created here)
          label: `Topic ${topicId}`,
          name: `memory-${chatId}-${Date.now()}`,
          content,
        });
        const memStoreId = data?.vectorStoreId || vectorStoreId;
        if (memStoreId && memStoreId !== vectorStoreId) {
          await setTopicVectorStoreId(currentUser.uid, topicId, memStoreId);
        }
        // Record so topic deletion cleans up memory files too. No url → these
        // never surface as citation pills.
        const indexed = (data?.texts || []).filter((t) => t.status === "indexed");
        if (indexed.length > 0) {
          await addLibraryFileRecords({
            uid: currentUser.uid,
            topicId,
            chatId,
            files: indexed.map((t) => ({
              name: t.name,
              type: "text/plain",
              url: "",
              openaiFileId: t.openaiFileId,
              vectorStoreId: memStoreId,
            })),
          });
        }
      } catch { /* silent — cold memory is best-effort */ }
    })();
  }

  } catch (err) {
    setPendingSend?.(null);
    // Stop pressed before any answer streamed → don't show an error, just tidy up.
    if (genAbortController?.signal.aborted) {
      if (aiMessageId) clearStreamingMessage?.(aiMessageId);
      if (aiMessageId && chatId) {
        try {
          const stopPayload = { content: "⏹️ Stopped." };
          if (inTopic && topicId) {
            await updateTopicChatMessage(topicId, chatId, aiMessageId, stopPayload);
          } else {
            await updateGlobalChatMessage(chatId, aiMessageId, stopPayload);
          }
        } catch { /* silent */ }
      }
    } else {
      console.error("❌ sendChatMessage error:", err);
      // Clear live overlay so the UI falls back to persisted state.
      if (aiMessageId) clearStreamingMessage?.(aiMessageId);
      // Replace the stuck placeholder so the user isn't left with an infinite spinner
      if (aiMessageId && chatId) {
        try {
          const errPayload = { content: `⚠️ Error: ${err?.message || "Something went wrong. Please try again."}` };
          if (inTopic && topicId) {
            await updateTopicChatMessage(topicId, chatId, aiMessageId, errPayload);
          } else {
            await updateGlobalChatMessage(chatId, aiMessageId, errPayload);
          }
        } catch { /* silent */ }
      }
    }
  } finally {
    endGeneration?.();
    sendLocks.delete(sendKey);
  }
}
