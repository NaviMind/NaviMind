import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getViewerSrc, getFileUrl, DocViewerModal, FileTypeIcon } from "../MessageAttachments";

// ─── Helpers ────────────────────────────────────────────────────────────────
function getFileExt(name = "") {
  return name.split(".").pop()?.toLowerCase() || "";
}

function getDocLabel(ext) {
  if (ext === "pdf") return "PDF";
  if (["doc", "docx"].includes(ext)) return "Word";
  if (["xls", "xlsx"].includes(ext)) return "Excel";
  if (["ppt", "pptx"].includes(ext)) return "PPT";
  if (["txt", "csv", "log", "md"].includes(ext)) return "Text";
  return ext.toUpperCase() || "File";
}

function RemoveBtn({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Delete file"
      tabIndex={0}
      className={`z-10 bg-black/50 text-white rounded-full hover:bg-black/80 flex items-center justify-center transition ${className}`}
    >
      ✕
    </button>
  );
}

// Tiny spinner shown while a file is being indexed (no measurable progress).
function Spinner({ className = "" }) {
  return (
    <span
      className={`inline-block rounded-full border-2 border-white/30 border-t-white animate-spin ${className}`}
    />
  );
}

// Circular progress ring with a percentage label — real byte-level upload %.
function CircularProgress({ percent = 0, size = 30, tone = "dark" }) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(percent, 0), 100);
  const offset = circ - (pct / 100) * circ;
  const trackClass = tone === "light" ? "text-white/30" : "text-gray-300 dark:text-white/20";
  const textClass = tone === "light" ? "text-white" : "text-gray-700 dark:text-white";
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none" className={trackClass} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-blue-500 transition-[stroke-dashoffset] duration-200"
        />
      </svg>
      <span className={`absolute text-[8px] font-semibold ${textClass}`}>{pct}%</span>
    </div>
  );
}

// Overlay content: real % while uploading, indeterminate spinner while indexing.
function ProcessingIndicator({ status, progress, tone = "dark" }) {
  if (status === "uploading") {
    return <CircularProgress percent={progress || 0} tone={tone} />;
  }
  return (
    <Spinner
      className={tone === "light" ? "w-5 h-5" : "w-5 h-5 !border-blue-500/30 !border-t-blue-500"}
    />
  );
}

// Status line under a document pill: indexing / ready / failed / not searchable.
function DocStatus({ status, onRetry }) {
  if (status === "uploading" || status === "indexing") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-gray-400">
        <Spinner className="w-2.5 h-2.5 !border-gray-400/40 !border-t-gray-500" />
        {status === "uploading" ? "Uploading…" : "Indexing…"}
      </span>
    );
  }
  if (status === "unsupported") {
    return <span className="text-[10px] text-amber-500">Not searchable</span>;
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-[10px] text-red-500">
        Failed
        {onRetry && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRetry(); }}
            className="font-semibold text-blue-500 hover:text-blue-600 underline"
          >
            Retry
          </button>
        )}
      </span>
    );
  }
  return null;
}

export default function FilePreview({ files, onRemove, onRetry }) {
  const scrollRef = useRef(null);
  const [activeImage, setActiveImage] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null); // { src, url, name }
  const [portalTarget, setPortalTarget] = useState(null);
  // Portal the viewer into the main work area (not the input bar — its
  // backdrop-blur would clip a fixed overlay; not <body> — that would cover the
  // sidebar). The work-area div has a transform, so a fixed overlay inside it is
  // constrained exactly to the chat area, matching attachments opened in chat.
  useEffect(() => {
    setPortalTarget(document.getElementById("nm-workarea") || document.body);
  }, []);

  // Open an already-uploaded attachment in the same viewer used in messages.
  const openDoc = (entry) => {
    if (!entry.url) return;
    const meta = { name: entry.name, type: entry.type, url: entry.url };
    const src = getViewerSrc(meta);
    if (src) setActiveDoc({ src, url: getFileUrl(meta), name: entry.name });
  };
  const openImage = (entry) => {
    const url = entry.url || (entry.file ? URL.createObjectURL(entry.file) : "");
    if (url) setActiveImage(url);
  };

  // Прокручиваем горизонтально при вращении колесика
  const handleWheel = (e) => {
    if (scrollRef.current) {
      if (scrollRef.current.scrollWidth > scrollRef.current.clientWidth) {
        e.preventDefault();
        scrollRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  if (!files?.length) return null;
  return (
    <div
      ref={scrollRef}
      onWheel={handleWheel}
      className="filepreview-hidden-scrollbar flex flex-nowrap items-center gap-2 mt-2 px-5 overflow-x-auto"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {files.map((entry) => {
        const isImage = entry.isImage ?? entry.type?.startsWith("image/");
        const busy = entry.status === "uploading" || entry.status === "indexing";

        // ── Image thumbnail ──────────────────────────────────────────
        if (isImage) {
          const previewUrl =
            entry.url || (entry.file ? URL.createObjectURL(entry.file) : "");
          return (
            <div
              key={entry.id}
              onClick={() => openImage(entry)}
              className="relative flex items-center justify-center w-[72px] h-[72px] min-w-[72px] bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
            >
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt={entry.name}
                  className="object-cover w-full h-full"
                  draggable={false}
                />
              )}
              {/* Processing overlay — % while uploading, spinner while indexing */}
              {busy && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                  <ProcessingIndicator status={entry.status} progress={entry.progress} tone="light" />
                </div>
              )}
              {/* Error overlay — tap to retry */}
              {entry.status === "error" && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRetry?.(entry.id); }}
                  className="absolute inset-0 bg-red-900/55 flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-0.5"
                >
                  <span>Failed</span>
                  <span className="underline">Retry</span>
                </button>
              )}
              <RemoveBtn
                onClick={(e) => { e.stopPropagation(); onRemove(entry.id); }}
                className="absolute top-1 right-1 text-xs px-1 min-w-[20px] min-h-[20px]"
              />
            </div>
          );
        }

        // ── Document pill (matches the in-chat DocPill) ───────────────
        const ext = getFileExt(entry.name);
        const label = getDocLabel(ext);
        return (
          <div
            key={entry.id}
            onClick={() => openDoc(entry)}
            className="relative flex items-center gap-2.5 pl-3 pr-6 py-2 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-white dark:bg-gray-800/60 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-gray-700/60 shadow-sm max-w-[230px] min-w-[160px] flex-shrink-0 overflow-hidden cursor-pointer transition-colors"
          >
            {/* Processing overlay — % while uploading, spinner while indexing */}
            {busy && (
              <div className="absolute inset-0 z-[5] bg-white/70 dark:bg-gray-900/70 backdrop-blur-[1px] flex items-center justify-center">
                <ProcessingIndicator status={entry.status} progress={entry.progress} tone="dark" />
              </div>
            )}
            {/* Type badge */}
            <div className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 bg-blue-50 dark:bg-blue-500/10">
              <FileTypeIcon name={entry.name} type={entry.type} size={20} />
            </div>

            {/* Name + type + status */}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-gray-800 dark:text-white/90 truncate leading-snug">
                {entry.name}
              </p>
              <div className="flex items-center gap-2 mt-[1px]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400">
                  {label}
                </span>
                <DocStatus status={entry.status} onRetry={() => onRetry?.(entry.id)} />
              </div>
            </div>

            <RemoveBtn
              onClick={(e) => { e.stopPropagation(); onRemove(entry.id); }}
              className="absolute top-1 right-1 text-[10px] w-[18px] h-[18px]"
            />
          </div>
        );
      })}

      {/* Viewers are portalled to <body> so `position: fixed` escapes the input
          bar's backdrop-blur containing block and covers the full viewport —
          exactly like attachments opened from the chat area. */}
      {portalTarget &&
        createPortal(
          <>
            {activeImage && (
              <div
                onClick={() => setActiveImage(null)}
                className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
              >
                <button
                  onClick={() => setActiveImage(null)}
                  className="absolute top-6 right-6 w-11 h-11 flex items-center justify-center rounded-full bg-black text-white text-xl shadow-lg hover:bg-gray-800 transition"
                  aria-label="Close"
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

            {/* Document viewer (PDF / Word / Excel / PPT / text) */}
            <DocViewerModal doc={activeDoc} onClose={() => setActiveDoc(null)} />
          </>,
          portalTarget
        )}
    </div>
  );
}
