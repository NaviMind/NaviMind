import React, { useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileExt(name = "") {
  return name.split(".").pop()?.toLowerCase() || "";
}

function getDocLabel(ext) {
  if (ext === "pdf") return "PDF";
  if (["doc", "docx"].includes(ext)) return "Word";
  if (["xls", "xlsx"].includes(ext)) return "Excel";
  if (["ppt", "pptx"].includes(ext)) return "PPT";
  return ext.toUpperCase() || "File";
}

const OFFICE_EXTS = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"];
// Formats we render to HTML ourselves (mammoth / SheetJS) — reliable, no
// dependency on third-party online viewers.
const SELF_PREVIEW_EXTS = ["docx", "xls", "xlsx", "csv"];

export function getFileUrl(file) {
  return file.previewUrl || file.url || file.downloadURL || "";
}

// Build a viewer URL that can be embedded in an <iframe> for in-app viewing.
export function getViewerSrc(file) {
  const url = getFileUrl(file);
  if (!url) return null;
  const ext = getFileExt(file.name);

  // PDF — browsers render it natively inside an iframe
  if (ext === "pdf" || file.type === "application/pdf") return url;

  // Word / Excel / CSV — render to HTML on our own server (stable, offline-safe).
  if (SELF_PREVIEW_EXTS.includes(ext)) {
    return `/api/preview?url=${encodeURIComponent(url)}&name=${encodeURIComponent(file.name)}`;
  }

  // Plain text / markdown — browsers render these natively
  if (["txt", "log", "md"].includes(ext) || file.type?.startsWith("text/")) {
    return url;
  }

  // Remaining Office types (PowerPoint, legacy .doc) — Microsoft Office embed
  if (OFFICE_EXTS.includes(ext)) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  }

  // Anything else — Google Docs viewer fallback
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}

// ─── Document pill (unified blue theme) ──────────────────────────────────────

function DocPill({ file, onClick }) {
  const ext = getFileExt(file.name);
  const label = getDocLabel(ext);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-white dark:bg-gray-800/60 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-gray-700/60 shadow-sm transition-all duration-150 max-w-[280px] text-left group cursor-pointer"
    >
      {/* Type badge — neutral icon on subtle blue tint */}
      <div className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 bg-blue-50 dark:bg-blue-500/10">
        <svg className="w-5 h-5 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M9 12h6m-6 4h6M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Name + type */}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-gray-800 dark:text-white/90 truncate leading-snug">
          {file.name}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-wider mt-[1px] text-blue-500 dark:text-blue-400">
          {label}
        </p>
      </div>
    </button>
  );
}

// ─── Document viewer modal (PDF / Word / Excel / PPT) ───────────────────────────
// Shared so both user attachments and assistant source pills can open files.
export function DocViewerModal({ doc, onClose }) {
  if (!doc) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-11 h-11 flex items-center justify-center rounded-full bg-black text-white text-xl shadow-lg hover:bg-gray-800 transition z-10"
        aria-label="Close"
      >
        ✕
      </button>

      <div
        className="flex flex-col w-[92vw] md:w-[70vw] h-[90vh] bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with file name + open-in-new-tab fallback */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
          <span className="text-sm font-medium text-gray-800 dark:text-white/90 truncate flex-1">
            {doc.name}
          </span>
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 flex items-center gap-1 flex-shrink-0"
          >
            Open in new tab
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="15 3 21 3 21 9" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        {/* Embedded viewer */}
        <iframe
          src={doc.src}
          className="w-full flex-1 bg-white"
          title={doc.name}
        />
      </div>
    </div>
  );
}

// ─── Image tile ───────────────────────────────────────────────────────────────

function ImageTile({ file, sizeClass, onClick }) {
  const previewUrl = file.previewUrl || file.url || file.downloadURL;
  return (
    <div
      onClick={onClick}
      className={`relative flex items-center justify-center ${sizeClass} rounded-xl overflow-hidden cursor-pointer hover:scale-[1.03] transition-transform shadow-sm`}
    >
      <img src={previewUrl} alt={file.name} className="object-cover w-full h-full" draggable={false} />
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-[3px] truncate">
        {file.name}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MessageAttachments({ attachments = [] }) {
  if (!attachments.length) return null;

  const [activeImage, setActiveImage] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null); // { src, url, name }

  const images = attachments.filter((f) => f.type?.startsWith("image/"));
  const docs   = attachments.filter((f) => !f.type?.startsWith("image/"));

  // Image grid size
  const imgSize =
    images.length === 1 ? "w-[220px] h-[220px]" :
    images.length === 2 ? "w-[160px] h-[160px]" :
                          "w-[110px] h-[110px]";

  const handleDocClick = (file) => {
    const src = getViewerSrc(file);
    if (!src) return;
    setActiveDoc({ src, url: getFileUrl(file), name: file.name });
  };

  return (
    <>
      {/* ── Images grid ─────────────────────────────────────────── */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-end mt-2">
          {images.map((file, idx) => (
            <ImageTile
              key={file.name + idx}
              file={file}
              sizeClass={imgSize}
              onClick={() => setActiveImage(file.previewUrl || file.url || file.downloadURL)}
            />
          ))}
        </div>
      )}

      {/* ── Document pills (stacked column) ─────────────────────── */}
      {docs.length > 0 && (
        <div className="flex flex-col gap-1.5 items-end mt-2">
          {docs.map((file, idx) => (
            <DocPill
              key={file.name + idx}
              file={file}
              onClick={() => handleDocClick(file)}
            />
          ))}
        </div>
      )}

      {/* ── Image lightbox ──────────────────────────────────────── */}
      {activeImage && (
        <div
          onClick={() => setActiveImage(null)}
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
        >
          <button
            onClick={() => setActiveImage(null)}
            className="absolute top-6 right-6 w-11 h-11 flex items-center justify-center rounded-full bg-black text-white text-xl shadow-lg hover:bg-gray-800 transition"
          >
            ✕
          </button>
          <img
            src={activeImage}
            alt="preview"
            className="max-w-[95vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── Document viewer (PDF / Word / Excel / PPT) ──────────── */}
      <DocViewerModal doc={activeDoc} onClose={() => setActiveDoc(null)} />
    </>
  );
}
