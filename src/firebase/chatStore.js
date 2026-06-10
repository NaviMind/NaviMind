
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