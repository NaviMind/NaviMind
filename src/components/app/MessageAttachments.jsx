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

// ─── Document pill (unified blue theme) ──────────────────────────────────────

function DocPill({ file, onClick }) {
  const ext = getFileExt(file.name);
  const label = getDocLabel(ext);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-white dark:bg-gray-800/60 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-gray-700/60 shadow-sm transition-all duration-150 max-w-[280px] text-left group"
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

      {/* Open indicator (not share — opens the file on click) */}
      <svg className="w-4 h-4 text-gray-300 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="15 3 21 3 21 9" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
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
  const [activePdf, setActivePdf] = useState(null);
  const isMobile =
    typeof window !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const images = attachments.filter((f) => f.type?.startsWith("image/"));
  const docs   = attachments.filter((f) => !f.type?.startsWith("image/"));

  // Image grid size
  const imgSize =
    images.length === 1 ? "w-[220px] h-[220px]" :
    images.length === 2 ? "w-[160px] h-[160px]" :
                          "w-[110px] h-[110px]";

  const handleDocClick = (file) => {
    const previewUrl = file.previewUrl || file.url || file.downloadURL;
    if (!previewUrl) return;
    if (file.type === "application/pdf") {
      if (isMobile) window.open(previewUrl, "_blank");
      else setActivePdf(previewUrl);
    } else {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    }
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

      {/* ── PDF viewer ──────────────────────────────────────────── */}
      {activePdf && (
        <div
          onClick={() => setActivePdf(null)}
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
        >
          <button
            onClick={() => setActivePdf(null)}
            className="absolute top-6 right-6 w-11 h-11 flex items-center justify-center rounded-full bg-black text-white text-xl shadow-lg hover:bg-gray-800 transition"
          >
            ✕
          </button>
          <div
            className="w-[60vw] h-[90vh] bg-white rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe src={activePdf} className="w-full h-full" title="PDF preview" />
          </div>
        </div>
      )}
    </>
  );
}
