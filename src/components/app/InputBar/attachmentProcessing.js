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

// iPhones save photos as HEIC/HEIF by default — a format that NEITHER the OCR
// vision model nor Claude's answer-time vision can decode. When such a photo is
// uploaded raw, both models receive undecodable bytes and the assistant reports
// a "blank / white" page (it never actually saw the image). Browsers can't show
// HEIC either, so the attachment thumbnail is blank too.
//
// Fix it at the single upstream point: transcode non-web-safe images to JPEG in
// the browser BEFORE upload, so every downstream consumer — the preview, OCR,
// and Claude vision — gets a normal JPEG. On the device that took the photo the
// OS provides the HEIC codec, so canvas can render it. Web-safe images pass
// through untouched, and any failure returns the original file rather than
// blocking the upload.
const WEB_SAFE_IMAGE = /^image\/(jpeg|png|webp|gif)$/i;
const NON_WEB_SAFE_EXT = /\.(hei[cf]|tiff?|bmp|avif)$/i;

export async function normalizeImageFile(file) {
  try {
    const type = file?.type || "";
    const name = file?.name || "";
    const looksImage = type.startsWith("image/") || NON_WEB_SAFE_EXT.test(name);
    if (!looksImage) return file;

    // Already a format both vision models accept (and the MIME isn't a lying
    // ".jpg" wrapper around HEIC) → nothing to do.
    if (WEB_SAFE_IMAGE.test(type) && !NON_WEB_SAFE_EXT.test(name)) return file;

    if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
      return file;
    }

    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    // White matte so any transparency doesn't flatten to black in the JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();

    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.92));
    if (!blob) return file;

    const base = name.replace(/\.[^.]+$/, "") || name || "photo";
    return new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified || Date.now(),
    });
  } catch {
    // Decode/encode failed (e.g. desktop browser without a HEIC codec) — leave
    // the original file; the server also attempts a best-effort transcode.
    return file;
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
