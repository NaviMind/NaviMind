import { storage } from "@/firebase/config";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// SHA-256 of the file's bytes — used to skip re-uploading/re-indexing (and
// re-OCR'ing) a file that's already in the scope's library.
export async function hashFile(file) {
  try {
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

// Retry a flaky async op a few times with linear backoff (network blips).
export async function withRetry(fn, attempts = 3, baseDelay = 600) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelay * (i + 1)));
      }
    }
  }
  throw lastErr;
}

// Upload a file to Storage at attach time. The path is chat-independent (a new
// chat may not exist yet when the user attaches) — the message stores the URL,
// so folder layout doesn't matter functionally. `onProgress(percent)` reports
// real byte-level upload progress (0–100).
export function uploadFileToStorage({ uid, file, onProgress }) {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `users/${uid}/uploads/${uniqueSuffix}-${file.name}`;
  const task = uploadBytesResumable(ref(storage, path), file);

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        if (onProgress && snap.totalBytes) {
          onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },
      reject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ name: file.name, type: file.type, url, path });
        } catch (e) {
          reject(e);
        }
      }
    );
  });
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

// Index a raw text snippet (e.g. a topic conversation exchange) into a vector
// store — the "cold memory" layer. Returns { vectorStoreId, texts: [...] }.
export async function indexTextSnippet({ vectorStoreId, label, name, content }) {
  const res = await fetch("/api/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vectorStoreId: vectorStoreId || undefined,
      label,
      texts: [{ name, content }],
    }),
  });
  if (!res.ok) throw new Error("memory indexing failed");
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
