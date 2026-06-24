"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChatContext } from "@/context/ChatContext";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, FileText } from "lucide-react";
import Tooltip from "@/components/common/Tooltip";
import MaskIcon from "@/components/common/MaskIcon";
import { auth } from "@/firebase/config";
import {
  getLibraryFiles,
  getTopicData,
  setTopicVectorStoreId,
  addLibraryFileRecords,
  deleteLibraryFileRecordsByIds,
} from "@/firebase/chatStore";
import {
  uploadFileToStorage,
  indexDocuments,
  hashFile,
  withRetry,
  expireIndexedFile,
} from "@/components/app/InputBar/attachmentProcessing";
import { getViewerSrc, getFileUrl, DocViewerModal } from "@/components/app/MessageAttachments";

function fileExt(name = "") {
  return name.split(".").pop()?.toLowerCase() || "";
}
function fileLabel(name = "", type = "") {
  if (type.startsWith("image/")) return "Image";
  const ext = fileExt(name);
  if (ext === "pdf") return "PDF";
  if (["doc", "docx"].includes(ext)) return "Word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "Excel";
  if (["ppt", "pptx"].includes(ext)) return "PPT";
  return ext.toUpperCase() || "File";
}
const rid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Topic Library panel — view / open / delete / add files for a single topic.
// Files added here are indexed straight into the topic's vector store (no chat).
export default function TopicLibraryModal({ topicId, topicName, onClose }) {
  const { splitMode } = useContext(ChatContext);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]); // [{ id, name, status }]
  const [deleting, setDeleting] = useState(new Set());
  const [dragging, setDragging] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [portalTarget, setPortalTarget] = useState(null);
  const [open, setOpen] = useState(true); // drives the slide-up / slide-down
  const storeIdRef = useRef("");
  const inputRef = useRef(null);

  const close = () => setOpen(false);

  // Open over the main work area (not covering the sidebar), like file viewers.
  useEffect(() => {
    setPortalTarget(document.getElementById("nm-workarea") || document.body);
  }, []);

  const refresh = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const all = await getLibraryFiles({ uid, topicId });
    // Only real, openable files — hide internal memory snippets (url-less).
    setFiles(
      all
        .filter((f) => f.url)
        .sort((a, b) => (b.addedAt?.toMillis?.() || 0) - (a.addedAt?.toMillis?.() || 0))
    );
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  const setPendingStatus = (id, status) =>
    setPending((p) => p.map((e) => (e.id === id ? { ...e, status } : e)));

  const addFiles = async (fileList) => {
    const uid = auth.currentUser?.uid;
    const items = Array.from(fileList || []);
    if (!uid || items.length === 0) return;

    const entries = items.map((f) => ({ id: rid(), name: f.name, status: "uploading" }));
    setPending((p) => [...entries, ...p]);

    try {
      let storeId =
        storeIdRef.current || (await getTopicData(uid, topicId))?.vectorStoreId || "";
      storeIdRef.current = storeId;

      const existingHashes = new Set(files.map((f) => f.hash).filter(Boolean));
      const prepared = [];

      await Promise.all(
        items.map(async (f, i) => {
          const e = entries[i];
          try {
            const hash = await hashFile(f);
            if (hash && existingHashes.has(hash)) {
              setPendingStatus(e.id, "dup");
              return;
            }
            const meta = await withRetry(() => uploadFileToStorage({ uid, file: f }));
            setPendingStatus(e.id, "indexing");
            prepared.push({ e, hash, name: meta.name, type: meta.type, url: meta.url, path: meta.path });
          } catch {
            setPendingStatus(e.id, "error");
          }
        })
      );

      if (prepared.length > 0) {
        const data = await withRetry(() =>
          indexDocuments({
            vectorStoreId: storeId,
            label: `Topic ${topicId}`,
            docs: prepared.map((p) => ({ url: p.url, name: p.name, type: p.type })),
          })
        );
        const newStoreId = data?.vectorStoreId || storeId;
        if (newStoreId && newStoreId !== storeId) {
          await setTopicVectorStoreId(uid, topicId, newStoreId);
        }
        storeIdRef.current = newStoreId;

        const out = Array.isArray(data?.files) ? data.files : [];
        const toRecord = [];
        prepared.forEach((p, i) => {
          const r = out[i];
          if (r?.status === "indexed") {
            toRecord.push({
              name: p.name, type: p.type, url: p.url,
              openaiFileId: r.openaiFileId, vectorStoreId: newStoreId, hash: p.hash,
            });
          } else {
            setPendingStatus(p.e.id, "error");
          }
        });
        if (toRecord.length > 0) {
          await addLibraryFileRecords({ uid, topicId, chatId: null, files: toRecord });
        }
      }
    } catch (err) {
      console.error("Add to library failed:", err);
    } finally {
      await refresh();
      setPending([]);
    }
  };

  const removeFile = async (file) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setDeleting((s) => new Set(s).add(file.id));
    try {
      if (file.openaiFileId) {
        expireIndexedFile({ vectorStoreId: file.vectorStoreId, openaiFileId: file.openaiFileId });
      }
      await deleteLibraryFileRecordsByIds({ uid, topicId, ids: [file.id] });
      setFiles((fs) => fs.filter((f) => f.id !== file.id));
    } finally {
      setDeleting((s) => {
        const n = new Set(s);
        n.delete(file.id);
        return n;
      });
    }
  };

  const openFile = (file) => {
    if (file.type?.startsWith("image/")) {
      setActiveImage(file.url);
      return;
    }
    const src = getViewerSrc(file);
    if (src) setActiveDoc({ src, url: getFileUrl(file), name: file.name });
  };

  const empty = !loading && files.length === 0 && pending.length === 0;

  if (!portalTarget) return null;

  return createPortal(
    <>
    <AnimatePresence onExitComplete={onClose}>
      {open && (
      <motion.div
        key="lib-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`fixed top-0 bottom-0 left-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-hidden ${splitMode ? "right-0 [@media(hover:hover)]:right-1/2" : "right-0"}`}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      >
      <motion.div
        variants={{ initial: { y: "100%", opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: "100%", opacity: 0 } }}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg h-[600px] max-h-[85vh] flex flex-col bg-white dark:bg-[#1a2235] rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer?.files); }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-white/10">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              Library — {topicName || "Topic"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Files in this topic, searchable by the assistant.
            </p>
          </div>
          <Tooltip content="Add files" position="top" align="right">
            <button
              onClick={() => inputRef.current?.click()}
              aria-label="Add files"
              className="shrink-0 p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
            >
              <MaskIcon src="/library_add.svg" size={20} />
            </button>
          </Tooltip>
          <button
            onClick={close}
            aria-label="Close"
            className="shrink-0 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          />
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-y-auto custom-scroll p-3">
          {dragging && (
            <div className="absolute inset-2 z-10 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/70 dark:bg-blue-500/10 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-300 pointer-events-none">
              Drop files to add to this topic
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <span className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-blue-500 animate-spin" />
            </div>
          )}

          {empty && (
            <div className="flex flex-col items-center justify-center text-center py-12 px-6 text-gray-500 dark:text-gray-400">
              <FileText size={28} className="opacity-40 mb-3" />
              <p className="text-sm">No files yet.</p>
              <p className="text-xs mt-1">Add files here or attach them in a chat — they're shared across this topic.</p>
            </div>
          )}

          {/* In-flight uploads */}
          {pending.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
              <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                {p.status === "uploading" || p.status === "indexing" ? (
                  <span className="w-4 h-4 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
                ) : (
                  <FileText size={18} className="text-gray-400" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-800 dark:text-white/90 truncate">{p.name}</p>
                <p className="text-[11px] text-gray-400">
                  {p.status === "uploading" ? "Uploading…"
                    : p.status === "indexing" ? "Indexing…"
                    : p.status === "dup" ? "Already in library"
                    : "Couldn't add"}
                </p>
              </div>
            </div>
          ))}

          {/* Files */}
          {files.map((file) => (
            <div
              key={file.id}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <button
                onClick={() => openFile(file)}
                className="flex items-center gap-3 min-w-0 flex-1 text-left"
              >
                <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-gray-500 dark:text-gray-300" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 dark:text-white/90 truncate">{file.name}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400">
                    {fileLabel(file.name, file.type)}
                  </p>
                </div>
              </button>
              <button
                onClick={() => removeFile(file)}
                disabled={deleting.has(file.id)}
                aria-label="Delete file"
                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 disabled:opacity-50 transition-colors [@media(hover:hover)]:opacity-0 group-hover:opacity-100"
              >
                {deleting.has(file.id) ? (
                  <span className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-red-500 animate-spin block" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </div>
          ))}
        </div>
      </motion.div>
      </motion.div>
      )}
    </AnimatePresence>

      {/* Viewers */}
      {activeImage && (
        <div
          onClick={() => setActiveImage(null)}
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[310] p-4"
        >
          <button
            onClick={() => setActiveImage(null)}
            aria-label="Close"
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
      <DocViewerModal doc={activeDoc} onClose={() => setActiveDoc(null)} />
    </>,
    portalTarget
  );
}
