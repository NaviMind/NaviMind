import { storage } from "@/firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Upload a file to Storage at attach time. The path is chat-independent (a new
// chat may not exist yet when the user attaches) — the message stores the URL,
// so folder layout doesn't matter functionally.
export async function uploadFileToStorage({ uid, file }) {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `users/${uid}/uploads/${uniqueSuffix}-${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { name: file.name, type: file.type, url, path };
}

// Index already-uploaded documents into a scope's vector store via /api/library.
// Returns { vectorStoreId, files: [{ name, openaiFileId, status }] }.
export async function indexDocuments({ vectorStoreId, label, docs }) {
  const res = await fetch("/api/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vectorStoreId: vectorStoreId || undefined,
      label,
      files: docs.map((d) => ({ url: d.url, name: d.name, type: d.type })),
    }),
  });
  if (!res.ok) throw new Error("indexing failed");
  return res.json();
}

// Detach + delete a single already-indexed file from OpenAI (used when the user
// removes an attachment before sending). Best-effort, fire-and-forget.
export function expireIndexedFile({ vectorStoreId, openaiFileId }) {
  if (!openaiFileId) return;
  fetch("/api/library/expire", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vectorStoreId: vectorStoreId || "", fileIds: [openaiFileId] }),
  }).catch(() => {});
}
