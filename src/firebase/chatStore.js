
import { db, auth } from "@/firebase/config";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  writeBatch,
  getCountFromServer,
} from "firebase/firestore";

// ─────────── CHAT (GLOBAL) ───────────

export async function createUserChat() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const chatData = {
  title: "",
  summary: "",
  createdAt: serverTimestamp(),
  ownerId: user.uid,
};

  const ref = collection(db, "users", user.uid, "chats");
  const docRef = await addDoc(ref, chatData);

  return {
    chatId: docRef.id,
    ...chatData,
  };
}

export async function addMessageToChat(chatId, messageData, role = "user") {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const uid = user.uid;
  const chatRef = doc(db, "users", uid, "chats", chatId);
  const messagesRef = collection(db, "users", uid, "chats", chatId, "messages");

  // ✅ гарантируем существование документа чата (если его ещё нет, создастся)
  await setDoc(
  chatRef,
  { ownerId: uid, createdAt: serverTimestamp() },
  { merge: true }
);

  const message =
  typeof messageData === "object"
    ? {
        ...messageData,
        timestamp: serverTimestamp(),
      }
    : {
        role,
        content: messageData,
        timestamp: serverTimestamp(),
      };

  const messageRef = await addDoc(messagesRef, message);

  // если это первое сообщение — формируем заголовок
  const chatSnap = await getDoc(chatRef);

if (!chatSnap.data()?.title) {
  const textForTitle =
    typeof messageData === "object"
      ? messageData.content
      : messageData;

  const titleWords = textForTitle.trim().split(/\s+/).slice(0, 8).join(" ");
  const title =
    titleWords.charAt(0).toUpperCase() + titleWords.slice(1);

  await updateDoc(chatRef, { title });
}
  return { messageId: messageRef.id };
}

export async function loadUserChats(uid) {
  const chatRef = collection(db, "users", uid, "chats");
  const snap = await getDocs(chatRef);
  return snap.docs.map(doc => ({ chatId: doc.id, ...doc.data() }));
}

export function subscribeToUserChats(uid, callback) {
  const ref = collection(db, "users", uid, "chats");
  const q = query(ref, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({ chatId: doc.id, ...doc.data() }));
    callback(chats);
  });
}

export function subscribeToMessages(uid, chatId, callback) {
  const ref = collection(db, "users", uid, "chats", chatId, "messages");
  const q = query(ref, orderBy("timestamp", "asc"));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(messages);
  });
}

export async function deleteChatFromFirestore(uid, chatId, topicId = null) {
  try {
    // Regular (non-topic) chats own their library files in the shared user
    // store — remove them from OpenAI on chat deletion. Topic chats keep their
    // files (the topic owns them until the topic itself is deleted).
    if (!topicId) {
      try {
        const [storeId, libFiles] = await Promise.all([
          getUserLibraryStoreId(uid),
          getLibraryFiles({ uid, topicId: null }),
        ]);
        const mine = libFiles.filter((f) => f.chatId === chatId);
        const fileIds = mine.map((f) => f.openaiFileId).filter(Boolean);
        if (fileIds.length > 0) {
          await fetch("/api/library/expire", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vectorStoreId: storeId, fileIds }),
          }).catch(() => {});
        }
        if (mine.length > 0) {
          await deleteLibraryFileRecordsByIds({
            uid,
            topicId: null,
            ids: mine.map((f) => f.id),
          });
        }
      } catch (cleanupErr) {
        console.warn("Chat library cleanup failed:", cleanupErr);
      }
    }

    const chatRef = topicId
      ? doc(db, "users", uid, "topics", topicId, "chats", chatId)
      : doc(db, "users", uid, "chats", chatId);
    const messagesRef = collection(chatRef, "messages");
    const snapshot = await getDocs(messagesRef);
    const deletions = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletions);
    await deleteDoc(chatRef);
  } catch (error) {
    console.error("❌ Error deleting chat from Firestore:", error);
  }
}

export async function renameChatInFirestore(uid, chatId, newTitle, topicId = null) {
  try {
    const chatRef = topicId
      ? doc(db, "users", uid, "topics", topicId, "chats", chatId)
      : doc(db, "users", uid, "chats", chatId);
    await updateDoc(chatRef, { title: newTitle });
  } catch (error) {
    console.error("❌ Failed to rename chat:", error);
  }
}

export async function togglePinChat(uid, chatId, topicId = null) {
  try {
    const chatRef = topicId
      ? doc(db, "users", uid, "topics", topicId, "chats", chatId)
      : doc(db, "users", uid, "chats", chatId);
    const snapshot = await getDoc(chatRef);

    if (!snapshot.exists()) {
      console.warn("⚠️ Chat not found:", chatId);
      return false;
    }

    const current = snapshot.data().isPinned || false;
    await updateDoc(chatRef, { isPinned: !current });
    return !current;
  } catch (error) {
    console.error("❌ Failed to toggle pin state:", error);
    throw error;
  }
}

export async function getChatMessages(uid, chatId, topicId = null) {
  const ref = topicId
    ? collection(db, "users", uid, "topics", topicId, "chats", chatId, "messages")
    : collection(db, "users", uid, "chats", chatId, "messages");
  const q = query(ref, orderBy("timestamp", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => doc.data());
}


// ─────────── TOPICS ───────────

export async function createUserTopic(topicName) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const topicData = {
    name: topicName,               
    title: topicName,             
    createdAt: serverTimestamp(),
    ownerId: user.uid,
  };

  const ref = collection(db, "users", user.uid, "topics");
  const docRef = await addDoc(ref, topicData);

  return {
    topicId: docRef.id,
    ...topicData,
  };
}

export async function loadUserTopics(uid) {
  const ref = collection(db, "users", uid, "topics");
  const snap = await getDocs(ref);
  return snap.docs.map(doc => ({ topicId: doc.id, ...doc.data() }));
}

export function subscribeToUserTopics(uid, callback) {
  const ref = collection(db, "users", uid, "topics");
  const q = query(ref, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const topics = snapshot.docs.map(doc => ({ topicId: doc.id, ...doc.data() }));
    callback(topics);
  });
}

export async function togglePinTopic(uid, topicId) {
  try {
    const topicRef = doc(db, "users", uid, "topics", topicId);
    const snapshot = await getDoc(topicRef);
    if (!snapshot.exists()) return false;
    const current = snapshot.data().isPinned || false;
    await updateDoc(topicRef, { isPinned: !current });
    return !current;
  } catch (error) {
    console.error("❌ Failed to toggle topic pin:", error);
    throw error;
  }
}

export async function deleteTopicFromFirestore(uid, topicId) {
  try {
    const topicRef = doc(db, "users", uid, "topics", topicId);
    await deleteDoc(topicRef);
    console.log("🗑️ Topic deleted from Firestore");
  } catch (error) {
    console.error("❌ Failed to delete topic:", error);
  }
}
export function subscribeToTopicChats(uid, topicId, callback) {
  const ref = collection(db, "users", uid, "topics", topicId, "chats");
  const q = query(ref, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({ chatId: doc.id, ...doc.data() }));
    callback(chats);
  });
}

export function subscribeToTopicMessages(uid, topicId, chatId, callback) {
  const ref = collection(db, "users", uid, "topics", topicId, "chats", chatId, "messages");
  const q = query(ref, orderBy("timestamp", "asc"));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(messages);
  });
}

// ─────────── TOPIC CHATS (вложенные чаты внутри topic) ───────────

export async function createChatForTopic({ uid, topicId, messageText }) {
  const user = auth.currentUser;
  const _uid = uid || user?.uid;
  if (!_uid) throw new Error("User not authenticated");
  if (!topicId) throw new Error("Topic ID is required");

  const rawTitle = messageText?.trim().split(/\s+/).slice(0, 8).join(" ") || "New Chat";
  const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

  const chatData = {
    title,
    summary: "",
    createdAt: serverTimestamp(),
    ownerId: _uid,
    topicId,
  };

  const ref = collection(db, "users", _uid, "topics", topicId, "chats");
  const docRef = await addDoc(ref, chatData);

  return {
    chatId: docRef.id,
    ...chatData,
  };
}

export async function addMessageToTopicChat(
  topicId,
  chatId,
  messageData,
  role = "user"
) {
  const user = auth.currentUser;
  const uid = user?.uid;
  if (!uid) throw new Error("User not authenticated");
  if (!topicId || !chatId) throw new Error("TopicId and chatId are required");

  const chatRef = doc(db, "users", uid, "topics", topicId, "chats", chatId);
  const messagesRef = collection(
    db,
    "users",
    uid,
    "topics",
    topicId,
    "chats",
    chatId,
    "messages"
  );

  await setDoc(
    chatRef,
    { ownerId: uid, topicId, createdAt: serverTimestamp() },
    { merge: true }
  );

  const message =
    typeof messageData === "object"
      ? {
          ...messageData,
          timestamp: serverTimestamp(),
        }
      : {
          role,
          content: messageData,
          timestamp: serverTimestamp(),
        };

  const messageRef = await addDoc(messagesRef, message);

  return { messageId: messageRef.id };
}

// ─────────── UPDATE MESSAGE (GLOBAL) ───────────
export async function updateGlobalChatMessage(chatId, messageId, patch = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const uid = user.uid;

  const msgRef = doc(db, "users", uid, "chats", chatId, "messages", messageId);

  await updateDoc(msgRef, {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

// ─────────── UPDATE MESSAGE (TOPIC) ───────────
export async function updateTopicChatMessage(topicId, chatId, messageId, patch = {}) {
  const user = auth.currentUser;
  const uid = user?.uid;
  if (!uid) throw new Error("User not authenticated");

  const msgRef = doc(
    db,
    "users",
    uid,
    "topics",
    topicId,
    "chats",
    chatId,
    "messages",
    messageId
  );

  await updateDoc(msgRef, {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

// ✅ Алиасы, чтобы импорт в InputBar был единым стилем
export const createChatGlobal = createUserChat;
export const addMessageToGlobalChat = addMessageToChat;

// ─────────── CHAT SUMMARY ───────────

export async function updateTopicDescription(uid, topicId, description) {
  const ref = doc(db, "users", uid, "topics", topicId);
  await updateDoc(ref, { description: description ?? "" });
}

export async function renameTopicInFirestore(uid, topicId, newName) {
  const name = (newName ?? "").trim();
  if (!name) return;
  const ref = doc(db, "users", uid, "topics", topicId);
  await updateDoc(ref, { name });
}

export async function updateTopicMemory(uid, topicId, memoryText) {
  const ref = doc(db, "users", uid, "topics", topicId);
  await updateDoc(ref, {
    topicMemory: memoryText,
    topicMemoryUpdatedAt: serverTimestamp(),
  });
}

export async function getTopicData(uid, topicId) {
  const ref = doc(db, "users", uid, "topics", topicId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : {};
}

// ─────────── DOCUMENT LIBRARY (File Search vector stores) ───────────
//
// Topics keep their own persistent vector store (lives until the topic is
// deleted). Regular (global) chats share one per-user library store with a
// TTL-based cleanup. We only store *ids* here; the actual files live in the
// OpenAI vector store. The per-file openaiFileId is what lets us delete files
// later (topic deletion / TTL), so we keep a lightweight record of each.

// Persist the vector store id on a topic doc (set once, on first upload).
export async function setTopicVectorStoreId(uid, topicId, vectorStoreId) {
  if (!uid || !topicId || !vectorStoreId) return;
  const ref = doc(db, "users", uid, "topics", topicId);
  await setDoc(ref, { vectorStoreId }, { merge: true });
}

// The per-user shared library store id (used by all regular, non-topic chats).
export async function getUserLibraryStoreId(uid) {
  if (!uid) return "";
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data()?.libraryVectorStoreId || "" : "";
}

export async function setUserLibraryStoreId(uid, vectorStoreId) {
  if (!uid || !vectorStoreId) return;
  const ref = doc(db, "users", uid);
  await setDoc(ref, { libraryVectorStoreId: vectorStoreId }, { merge: true });
}

// Read previously-indexed file records for a scope, so citations that point at
// files uploaded in earlier messages still resolve to an openable file.
export async function getLibraryFiles({ uid, topicId = null }) {
  if (!uid) return [];
  const colRef = topicId
    ? collection(db, "users", uid, "topics", topicId, "libraryFiles")
    : collection(db, "users", uid, "libraryFiles");
  try {
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

// Delete all library file records for a scope (used on topic deletion, after
// the underlying OpenAI files/store have been torn down).
export async function deleteLibraryFileRecords({ uid, topicId = null }) {
  if (!uid) return;
  const colRef = topicId
    ? collection(db, "users", uid, "topics", topicId, "libraryFiles")
    : collection(db, "users", uid, "libraryFiles");
  try {
    const snap = await getDocs(colRef);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  } catch (e) {
    console.error("❌ Failed to delete library file records:", e);
  }
}

// Delete specific library file records by their Firestore doc ids (used by TTL
// cleanup, which only removes the expired ones — not the whole library).
export async function deleteLibraryFileRecordsByIds({ uid, topicId = null, ids = [] }) {
  if (!uid || !Array.isArray(ids) || ids.length === 0) return;
  const base = topicId
    ? ["users", uid, "topics", topicId, "libraryFiles"]
    : ["users", uid, "libraryFiles"];
  try {
    await Promise.all(ids.map((id) => deleteDoc(doc(db, ...base, id))));
  } catch (e) {
    console.error("❌ Failed to delete library file records by id:", e);
  }
}

// Record each indexed file so we can map citations back to an openable file and
// clean it up later. Topic files live under the topic; global chat files live
// under the user (with a chatId tag) and are subject to TTL cleanup.
export async function addLibraryFileRecords({ uid, topicId = null, chatId, files = [] }) {
  if (!uid || !Array.isArray(files) || files.length === 0) return;

  const colRef = topicId
    ? collection(db, "users", uid, "topics", topicId, "libraryFiles")
    : collection(db, "users", uid, "libraryFiles");

  await Promise.all(
    files
      .filter((f) => f?.openaiFileId)
      .map((f) =>
        addDoc(colRef, {
          name: f.name || "",
          type: f.type || "",
          url: f.url || "",
          openaiFileId: f.openaiFileId,
          vectorStoreId: f.vectorStoreId || "",
          hash: f.hash || "",
          chatId: chatId || null,
          addedAt: serverTimestamp(),
        })
      )
  );
}

export async function updateChatSummary({
  uid,
  chatId,
  topicId = null,
  summaryText,
}) {
  if (!uid || !chatId) return;

  try {
    let chatRef;

    if (topicId) {
      // чат внутри topic
      chatRef = doc(
        db,
        "users",
        uid,
        "topics",
        topicId,
        "chats",
        chatId
      );
    } else {
      // глобальный чат
      chatRef = doc(db, "users", uid, "chats", chatId);
    }

    await updateDoc(chatRef, {
      summary: summaryText,
      summaryUpdatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("❌ Failed to update chat summary:", err);
  }
}

// ─────────── TOPIC SUGGESTION (graduate a long chat into a Topic) ───────────

// Count messages in a (global) chat — used to gate the suggestion check.
export async function countChatMessages(uid, chatId) {
  try {
    const snap = await getCountFromServer(
      collection(db, "users", uid, "chats", chatId, "messages")
    );
    return snap.data().count || 0;
  } catch {
    return 0;
  }
}

// Persist the suggestion decision on the (global) chat doc.
//   state: "suggested" | "checked" | "dismissed" | "accepted"
export async function setChatTopicSuggestion(uid, chatId, { state, suggestion = null, atCount = 0 }) {
  if (!uid || !chatId) return;
  try {
    await updateDoc(doc(db, "users", uid, "chats", chatId), {
      topicSuggestionState: state,
      topicSuggestion: suggestion,
      topicSuggestionAtCount: atCount,
    });
  } catch (e) {
    console.error("❌ Failed to set topic suggestion:", e);
  }
}

// Graduate a regular chat into a new Topic: create the topic, move the chat and
// its messages under it, re-attach its library files to the topic's store (no
// re-upload), seed topic memory from the chat summary, then delete the original.
export async function migrateChatToTopic({ uid, chatId, name, description }) {
  if (!uid || !chatId) throw new Error("uid and chatId required");

  // 1) Read the source chat.
  const srcChatRef = doc(db, "users", uid, "chats", chatId);
  const srcSnap = await getDoc(srcChatRef);
  if (!srcSnap.exists()) throw new Error("chat not found");
  const srcData = srcSnap.data() || {};
  const summary = srcData.summary || "";

  // 2) Create the topic (description = user instructions, memory seeded from summary).
  const topicRef = await addDoc(collection(db, "users", uid, "topics"), {
    name: name || srcData.title || "New Topic",
    title: name || srcData.title || "New Topic",
    description: description || "",
    topicMemory: summary || "",
    topicMemoryUpdatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    ownerId: uid,
  });
  const topicId = topicRef.id;

  // 3) Create the chat under the topic, preserving its identity.
  const dstChatRef = doc(db, "users", uid, "topics", topicId, "chats", chatId);
  await setDoc(dstChatRef, {
    title: srcData.title || name || "Chat",
    summary,
    createdAt: srcData.createdAt || serverTimestamp(),
    ownerId: uid,
    topicId,
  });

  // 4) Copy all messages (batched, 400/batch to stay under the 500 limit).
  const msgsSnap = await getDocs(
    query(collection(srcChatRef, "messages"), orderBy("timestamp", "asc"))
  );
  const dstMsgsCol = collection(dstChatRef, "messages");
  let batch = writeBatch(db);
  let n = 0;
  for (const d of msgsSnap.docs) {
    batch.set(doc(dstMsgsCol, d.id), d.data());
    if (++n >= 400) { await batch.commit(); batch = writeBatch(db); n = 0; }
  }
  if (n > 0) await batch.commit();

  // 5) Move library files from the user store to the topic store (no re-upload).
  try {
    const [userStoreId, libFiles] = await Promise.all([
      getUserLibraryStoreId(uid),
      getLibraryFiles({ uid, topicId: null }),
    ]);
    const mine = libFiles.filter((f) => f.chatId === chatId && f.openaiFileId);
    if (mine.length > 0) {
      const res = await fetch("/api/library/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromStoreId: userStoreId,
          label: `Topic ${topicId}`,
          fileIds: mine.map((f) => f.openaiFileId),
        }),
      });
      const data = res.ok ? await res.json() : null;
      const topicStoreId = data?.vectorStoreId || "";
      if (topicStoreId) {
        await setTopicVectorStoreId(uid, topicId, topicStoreId);
        // Re-record under the topic, then drop the global records.
        await addLibraryFileRecords({
          uid,
          topicId,
          chatId,
          files: mine.map((f) => ({
            name: f.name, type: f.type, url: f.url,
            openaiFileId: f.openaiFileId, vectorStoreId: topicStoreId, hash: f.hash,
          })),
        });
        await deleteLibraryFileRecordsByIds({
          uid, topicId: null, ids: mine.map((f) => f.id),
        });
      }
    }
  } catch (e) {
    console.warn("migrate: library move failed:", e);
  }

  // 6) Delete the original chat (messages + doc). Library records are already
  //    moved, so the raw delete leaves nothing dangling in the user store.
  let delBatch = writeBatch(db);
  let m = 0;
  for (const d of msgsSnap.docs) {
    delBatch.delete(doc(collection(srcChatRef, "messages"), d.id));
    if (++m >= 400) { await delBatch.commit(); delBatch = writeBatch(db); m = 0; }
  }
  if (m > 0) await delBatch.commit();
  await deleteDoc(srcChatRef);

  return { topicId, chatId };
}