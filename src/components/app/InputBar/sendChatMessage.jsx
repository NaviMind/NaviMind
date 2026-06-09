import {
  createChatGlobal,
  addMessageToGlobalChat,
  createChatForTopic,
  addMessageToTopicChat,
  updateGlobalChatMessage,
  updateTopicChatMessage,
  updateChatSummary,
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
  const uploaded = [];

  for (const file of files) {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const uniqueFileName = `${uniqueSuffix}-${file.name}`;
    const path = topicId
      ? `users/${uid}/topics/${topicId}/chats/${chatId}/${uniqueFileName}`
      : `users/${uid}/chats/${chatId}/${uniqueFileName}`;

    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    uploaded.push({
      name: file.name,
      type: file.type,
      url: downloadURL,
      path,
    });
  }

  return uploaded;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
            title: message.slice(0, 30),
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
            title: message.slice(0, 30),
          },
          ...(updated.global || []),
        ];
        return updated;
      });
    }
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

const documentPayloads = await Promise.all(
  documentFiles.map(async (file) => ({
    name: file.name,
    type: file.type,
    data: await fileToBase64(file),
  }))
);

const uploadedAttachments = [
  ...uploadedImages,
  ...documentFiles.map((f) => ({ name: f.name, type: f.type })),
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
      }

      if (event === "source") {
  try {
    const parsed = JSON.parse(data);
    streamedSources.push(parsed);
  } catch (e) {
    console.error("Failed to parse source:", data);
  }
}

      if (event === "error") {
        throw new Error(data || "SSE error");
      }
    }
  }

  // финальный апдейт ОДИН РАЗ
  if (aiMessageId) {
   const payload = {
  content: finalText || " ",
  sources: streamedSources,
};
    if (inTopic) {
      await updateTopicChatMessage(topicId, chatId, aiMessageId, payload);
    } else {
      await updateGlobalChatMessage(chatId, aiMessageId, payload);
    }
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
  } catch (err) {
    console.error("❌ sendChatMessage error:", err);
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
