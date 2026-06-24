// Privacy & Data operations: clear conversations, export everything, and the
// full account purge. These walk the same Firestore/Storage/vector-store layout
// described in chatStore.js — Firestore does NOT cascade deletes, so every
// subcollection (messages, library files, topic chats) is removed explicitly,
// and the OpenAI vector stores / files are torn down via /api/library DELETE.

import { db, storage } from "@/firebase/config";
import {
  collection,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ref as storageRef, listAll, deleteObject } from "firebase/storage";

// ─── low-level helpers ──────────────────────────────────────────────────────

// Delete every doc in a collection.
async function deleteAllDocs(colRef) {
  const snap = await getDocs(colRef);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

// Delete a chat doc together with its messages subcollection.
async function deleteChatDeep(chatRef) {
  await deleteAllDocs(collection(chatRef, "messages"));
  await deleteDoc(chatRef);
}

// Tear down an OpenAI vector store + its files. Best-effort: a failed teardown
// must never block the Firestore cleanup (we'd rather have an orphaned store
// than leave the user's account half-deleted).
async function teardownVectorStore({ vectorStoreId, fileIds }) {
  const hasStore = !!vectorStoreId;
  const hasFiles = Array.isArray(fileIds) && fileIds.length > 0;
  if (!hasStore && !hasFiles) return;
  try {
    await fetch("/api/library", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vectorStoreId: vectorStoreId || "",
        fileIds: hasFiles ? fileIds : [],
      }),
    });
  } catch (e) {
    console.warn("privacyData: vector store teardown failed:", e);
  }
}

// Remove a topic entirely: nested chats (+messages), its library files +
// vector store, then the topic doc itself.
async function deleteTopicDeep(uid, topicDoc) {
  const topicId = topicDoc.id;
  const data = topicDoc.data() || {};

  const tChatsSnap = await getDocs(
    collection(db, "users", uid, "topics", topicId, "chats")
  );
  await Promise.all(tChatsSnap.docs.map((d) => deleteChatDeep(d.ref)));

  const tLibSnap = await getDocs(
    collection(db, "users", uid, "topics", topicId, "libraryFiles")
  );
  const tFileIds = tLibSnap.docs
    .map((d) => d.data()?.openaiFileId)
    .filter(Boolean);
  await teardownVectorStore({ vectorStoreId: data.vectorStoreId, fileIds: tFileIds });
  await Promise.all(tLibSnap.docs.map((d) => deleteDoc(d.ref)));

  await deleteDoc(doc(db, "users", uid, "topics", topicId));
}

// Recursively delete a Storage folder (avatars + uploads live under
// users/{uid}/...). Each delete is best-effort so one missing object doesn't
// abort the sweep.
async function deleteStorageFolder(folderRef) {
  let res;
  try {
    res = await listAll(folderRef);
  } catch (e) {
    console.warn("privacyData: storage list failed:", e);
    return;
  }
  await Promise.all(res.items.map((item) => deleteObject(item).catch(() => {})));
  await Promise.all(res.prefixes.map((p) => deleteStorageFolder(p)));
}

// ─── public operations ──────────────────────────────────────────────────────

// Wipe ALL conversations: every global chat, every topic (with its nested
// chats, memory and vector store), and the shared user library store. Keeps the
// user doc/profile intact. Used by both "Clear all chats" and (as a first step)
// the full account purge.
export async function clearAllConversations(uid) {
  if (!uid) return;

  // Global (non-topic) chats.
  const chatsSnap = await getDocs(collection(db, "users", uid, "chats"));
  await Promise.all(chatsSnap.docs.map((d) => deleteChatDeep(d.ref)));

  // Shared user library: tear down OpenAI files + store, then the records.
  const userSnap = await getDoc(doc(db, "users", uid));
  const userData = userSnap.exists() ? userSnap.data() : {};
  const libSnap = await getDocs(collection(db, "users", uid, "libraryFiles"));
  const globalFileIds = libSnap.docs
    .map((d) => d.data()?.openaiFileId)
    .filter(Boolean);
  await teardownVectorStore({
    vectorStoreId: userData.libraryVectorStoreId,
    fileIds: globalFileIds,
  });
  await Promise.all(libSnap.docs.map((d) => deleteDoc(d.ref)));

  // Topics (each fully torn down).
  const topicsSnap = await getDocs(collection(db, "users", uid, "topics"));
  for (const t of topicsSnap.docs) {
    await deleteTopicDeep(uid, t);
  }

  // Drop the now-dangling shared store id off the user doc.
  if (userData.libraryVectorStoreId) {
    await updateDoc(doc(db, "users", uid), {
      libraryVectorStoreId: "",
      updatedAt: serverTimestamp(),
    });
  }
}

// Full account purge (data side): conversations, Storage files, then the user
// doc. The Firebase Auth user is deleted by the caller AFTER this resolves,
// while the session is still authenticated (security rules require it).
export async function purgeAllUserData(uid) {
  if (!uid) return;
  await clearAllConversations(uid);
  await deleteStorageFolder(storageRef(storage, `users/${uid}`));
  await deleteDoc(doc(db, "users", uid));
}

// Convert Firestore Timestamps to ISO strings so the export reads cleanly.
function jsonReplacer(_key, value) {
  if (value && typeof value === "object" && typeof value.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch {
      return value;
    }
  }
  return value;
}

// Collect the user's full dataset (profile + all chats/topics with messages +
// library metadata) into a plain object, ready to serialize for download.
export async function buildUserDataExport(uid) {
  if (!uid) return null;

  const userSnap = await getDoc(doc(db, "users", uid));
  const profile = userSnap.exists() ? userSnap.data() : {};

  const loadMessages = async (chatRef) => {
    const snap = await getDocs(query(collection(chatRef, "messages"), orderBy("timestamp", "asc")));
    return snap.docs.map((m) => ({ id: m.id, ...m.data() }));
  };

  // Global chats.
  const chatsSnap = await getDocs(
    query(collection(db, "users", uid, "chats"), orderBy("createdAt", "asc"))
  );
  const chats = [];
  for (const c of chatsSnap.docs) {
    chats.push({ id: c.id, ...c.data(), messages: await loadMessages(c.ref) });
  }

  // Topics with nested chats.
  const topicsSnap = await getDocs(
    query(collection(db, "users", uid, "topics"), orderBy("createdAt", "asc"))
  );
  const topics = [];
  for (const t of topicsSnap.docs) {
    const tChatsSnap = await getDocs(
      query(collection(db, "users", uid, "topics", t.id, "chats"), orderBy("createdAt", "asc"))
    );
    const tChats = [];
    for (const c of tChatsSnap.docs) {
      tChats.push({ id: c.id, ...c.data(), messages: await loadMessages(c.ref) });
    }
    const libSnap = await getDocs(
      collection(db, "users", uid, "topics", t.id, "libraryFiles")
    );
    topics.push({
      id: t.id,
      ...t.data(),
      chats: tChats,
      libraryFiles: libSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  }

  return {
    exportedAt: new Date().toISOString(),
    profile,
    chats,
    topics,
  };
}

// Build the export and trigger a browser download as a JSON file.
export async function downloadUserDataExport(uid) {
  const data = await buildUserDataExport(uid);
  if (!data) return;
  const json = JSON.stringify(data, jsonReplacer, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `navimind-data-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
