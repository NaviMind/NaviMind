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

// Send document references (URLs) — the API fetches & parses them server-side.
// This avoids re-uploading the files as a huge base64 request body.
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

  // ───────── AI REQUEST ─────────
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
      vesselProfile,
      topicInstruction,
      topicMemory,
    }),
  });

  const contentType = res.headers.get("content-type") || "";
  let finalText = "";
  let sources = [];

if (res.body && contentType.includes("text/event-stream")) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffer = "";
  let streamedSources = [];

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

  // ── Inline source citations ──
  // The model places inline markers right after each claim it draws from an
  // attached document: "[[cite:filename.pdf]]". We DON'T strip them (they're
  // rendered inline as clickable pills); we only resolve the cited filenames to
  // the uploaded document metadata so the pills know which file to open.
  let fileSources = [];
  if (uploadedDocs.length > 0) {
    const findDoc = (n) => {
      const low = n.toLowerCase();
      return (
        uploadedDocs.find((d) => d.name.toLowerCase() === low) ||
        uploadedDocs.find(
          (d) =>
            d.name.toLowerCase().endsWith(low) ||
            low.endsWith(d.name.toLowerCase())
        )
      );
    };
    const seen = new Set();
    const re = /\[\[\s*cite:\s*([^\]]+?)\s*\]\]/gi;
    let m;
    while ((m = re.exec(finalText)) !== null) {
      const docMeta = findDoc(m[1].trim());
      if (docMeta && !seen.has(docMeta.url)) {
        seen.add(docMeta.url);
        fileSources.push(docMeta);
      }
    }
  }

  // финальный апдейт ОДИН РАЗ
  if (aiMessageId) {
   const payload = {
  content: finalText || " ",
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
    console.error("❌ sendChatMessage error:", err);
    // Clear optimistic + live overlays so the UI falls back to persisted state.
    setPendingSend?.(null);
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
  } finally {
    sendLocks.delete(sendKey);
  }
}
