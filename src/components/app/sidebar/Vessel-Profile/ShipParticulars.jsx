"use client";

import { useRef, useState } from "react";
import { Paperclip, FileText, X, Loader2 } from "lucide-react";
import { auth, storage } from "@/firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const MAX_SIZE = 15 * 1024 * 1024; // 15MB

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Optional single-file upload of the vessel's Ship Particulars (PDF). The text
// is extracted once and stored in the profile so the assistant can use the real
// vessel specifics in every answer. The original file is kept in Storage.
export default function ShipParticulars({ form, setForm }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const hasFile = Boolean(form.shipParticularsFileName);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Please attach a PDF file.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("File exceeds the 15MB limit.");
      return;
    }

    setBusy(true);
    try {
      // 1) Extract text (used in answers)
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/ship-particulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64: base64, fileName: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not read this PDF.");

      // 2) Keep the original file in Storage (best-effort, non-blocking failure)
      let url = "";
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          const path = `users/${uid}/vessel/ship-particulars/${Date.now()}-${file.name}`;
          const sref = ref(storage, path);
          await uploadBytes(sref, file);
          url = await getDownloadURL(sref);
        } catch {
          /* storage optional — text extraction is what matters */
        }
      }

      setForm((prev) => ({
        ...prev,
        shipParticularsFileName: file.name,
        shipParticularsText: data.text || "",
        shipParticularsFileUrl: url,
      }));
    } catch (err) {
      setError(err?.message || "Failed to process the file.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = () => {
    setError("");
    setForm((prev) => ({
      ...prev,
      shipParticularsFileName: "",
      shipParticularsText: "",
      shipParticularsFileUrl: "",
    }));
  };

  return (
    <div className="pt-1">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFile}
        className="sr-only"
      />

      {!hasFile ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-gray-900 dark:hover:text-white transition disabled:opacity-60"
        >
          {busy ? (
            <Loader2 size={18} className="animate-spin shrink-0" />
          ) : (
            <Paperclip size={18} className="shrink-0" />
          )}
          <span className="text-sm text-left">
            {busy ? "Reading ship particulars…" : "Attach ship particulars (PDF, optional)"}
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]">
          <FileText size={18} className="shrink-0 text-blue-500 dark:text-blue-400" />
          <span className="flex-1 min-w-0 text-sm truncate text-gray-800 dark:text-white/90">
            {form.shipParticularsFileName}
          </span>
          <button
            type="button"
            onClick={handleRemove}
            className="shrink-0 text-gray-400 hover:text-red-500 transition"
            aria-label="Remove ship particulars"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && <div className="text-xs text-red-500 mt-1.5">{error}</div>}
      {!error && hasFile && (
        <div className="text-[11px] text-gray-400 mt-1.5">
          NaviMind will use these particulars in its answers.
        </div>
      )}
    </div>
  );
}
