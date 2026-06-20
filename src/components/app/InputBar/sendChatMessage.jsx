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
  setTopicVectorStoreId,
  getUserLibraryStoreId,
  setUserLibraryStoreId,
  addLibraryFileRecords,
  getLibraryFiles,
} from "@/firebase/chatStore";
import { fetchChatSummary } from "@/ai/chatSummary";
import { fetchChatTitle } from "@/ai/chatTitle";
import { updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { storage } from "@/firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

async function uploadAttachments({ uid, chatId, topicId, files }) {
  // Upload all files in parallel — much faster than one-by-one for several
  // files. Promise.all preserves order, so the returned array matches `files`.
  return Promise.all(
    files.map(async (file) => {
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const uniqueFileName = `${uniqueSuffix}-${file.name}`;
      const path = topicId
        ? `users/${uid}/topics/${topicId}/chats/${chatId}/${uniqueFileName}`
        : `users/${uid}/chats/${chatId}/${uniqueFileName}`;

      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      return { name: file.name, type: file.type, url: downloadURL, path };
    })
  );
}

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

// Index freshly uploaded documents into the right File Search vector store and
// return the store id to search at query time.
//
//   • Topic chats  → the topic's own persistent store (isolated per topic).
//   • Global chats → the user's shared library store (TTL-cleaned later).
//
// Returns "" if there is no store to search (no docs ever uploaded here). When
// new docs are attached we create the store lazily, persist its id, and record
// each indexed file for later citation-mapping / cleanup.
async function ensureDocumentsIndexed({ uid, chatId, topicId, newDocs }) {
  const inTopic = Boolean(topicId);

  // Existing store for this scope (may be empty on the very first upload).
  let storeId = "";
  if (inTopic) {
    try {
      const topicData = await getTopicData(uid, topicId);
      storeId = topicData?.vectorStoreId || "";
    } catch { /* silent */ }
  } else {
    try {
      storeId = await getUserLibraryStoreId(uid);
    } catch { /* silent */ }
  }

  // Nothing new to index → just search whatever already exists (if anything).
  if (!newDocs || newDocs.length === 0) return storeId;

  try {
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vectorStoreId: storeId || undefined,
        label: inTopic ? `Topic ${topicId}` : `Library ${uid}`,
        files: newDocs.map((d) => ({ url: d.url, name: d.name, type: d.type })),
      }),
    });

    if (!res.ok) return storeId;
    const data = await res.json();
    const newStoreId = data?.vectorStoreId || storeId;

    // Persist a freshly created store id on its scope.
    if (newStoreId && newStoreId !== storeId) {
      if (inTopic) await setTopicVectorStoreId(uid, topicId, newStoreId);
      else await setUserLibraryStoreId(uid, newStoreId);
    }

    // Record indexed files (openaiFileId) for citation-mapping & cleanup.
    const indexed = (data?.files || [])
      .filter((f) => f.status === "indexed")
      .map((f) => ({ ...f, vectorStoreId: newStoreId }));
    if (indexed.length > 0) {
      await addLibraryFileRecords({
        uid,
        topicId: inTopic ? topicId : null,
        chatId,
        files: indexed,
      });
    }

    return newStoreId;
  } catch {
    return storeId;
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
  // Show the outgoing message instantly (with local image previews and a
  // "thinking" bubble) so the chat never looks frozen while files upload.
  if (setPendingSend) {
    const previews = (attachments || []).map((f) => ({
      name: f.name,
      type: f.type,
      previewUrl: f.type?.startsWith("image/") ? URL.createObjectURL(f) : undefined,
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
  if (inTopic) {
    try {
      const topicData = await getTopicData(currentUser.uid, topicId);
      topicInstruction = topicData?.description || "";
      topicMemory = topicData?.topicMemory || "";
    } catch { /* silent */ }
  }

  // ───────── SAVE USER MESSAGE ─────────

const imageFiles = attachments.filter((f) => f.type.startsWith("image/"));
const documentFiles = attachments.filter((f) => !f.type.startsWith("image/"));

let uploadedImages = [];
if (imageFiles.length > 0) {
  uploadedImages = await uploadAttachments({
    uid: currentUser.uid,
    chatId,
    topicId: inTopic ? topicId : null,
    files: imageFiles,
  });
}

// Upload documents to Storage too, so they get a URL and can be opened in the
// in-chat viewer (same as images). The base64 payload below is still used for
// text extraction on this request.
let uploadedDocs = [];
if (documentFiles.length > 0) {
  uploadedDocs = await uploadAttachments({
    uid: currentUser.uid,
    chatId,
    topicId: inTopic ? topicId : null,
    files: documentFiles,
  });
}

// Document names are still sent so the model knows which files it may cite
// (the citation instruction lists them). The document *content* now reaches the
// model via File Search, not inline text extraction.
const documentPayloads = uploadedDocs.map((d) => ({
  name: d.name,
  type: d.type,
  url: d.url,
}));

const uploadedAttachments = [
  ...uploadedImages,
  ...uploadedDocs,
];

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

  // ───────── INDEX DOCUMENTS (File Search) ─────────
  // Index any new documents into the scope's vector store and resolve the store
  // to search. Persistent: the topic store accumulates across chats; the global
  // library store accumulates across regular chats. Runs after the placeholder
  // is shown so the user already sees a "thinking" state during indexing.
  const vectorStoreId = await ensureDocumentsIndexed({
    uid: currentUser.uid,
    chatId,
    topicId: inTopic ? topicId : null,
    newDocs: uploadedDocs,
  });
  const vectorStoreIds = vectorStoreId ? [vectorStoreId] : [];

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
    let candidates = [...uploadedDocs];
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
