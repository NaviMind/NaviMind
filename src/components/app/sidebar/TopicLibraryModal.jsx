"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChatContext } from "@/context/ChatContext";
import { UIContext } from "@/context/UIContext";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, FileText, Download, ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import Tooltip from "@/components/common/Tooltip";
import Icon from "@/components/common/Icon";
import MaskIcon from "@/components/common/MaskIcon";
import { auth } from "@/firebase/config";
import {
  getLibraryFiles,
  getTopicData,
  setTopicVectorStoreId,
  addLibraryFileRecords,
  deleteLibraryFileRecordsByIds,
  getLibraryFolders,
  addLibraryFolder,
  deleteLibraryFolder,
  getAccountStorageUsage,
} from "@/firebase/chatStore";
import {
  uploadFileToStorage,
  indexDocuments,
  hashFile,
  withRetry,
  expireIndexedFile,
} from "@/components/app/InputBar/attachmentProcessing";
import { getViewerSrc, getFileUrl, DocViewerModal, FileTypeIcon } from "@/components/app/MessageAttachments";
import { useCurrentUserDoc } from "@/hooks/useCurrentUserDoc";
import { storageLimitFor, formatBytes } from "@/lib/planLimits";

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

// Topic Library panel — view / open / delete / add files for a single topic,
// organised into optional folders. Mirrors the Drawings / Manuals panel.
// Files added here are indexed straight into the topic's vector store (no chat).
export default function TopicLibraryModal({ topicId, topicName, onClose }) {
  const { splitMode } = useContext(ChatContext);
  const { closeModals } = useContext(UIContext);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]); // [{ id, name, folderId, status }]
  const [deleting, setDeleting] = useState(new Set());
  const [dragging, setDragging] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [portalTarget, setPortalTarget] = useState(null);
  const [open, setOpen] = useState(true); // drives the slide-up / slide-down

  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [quotaError, setQuotaError] = useState("");

  const { data: userDoc } = useCurrentUserDoc();
  const storageLimit = storageLimitFor(userDoc?.plan || "free");
  const [accountUsed, setAccountUsed] = useState(0); // account-wide bytes in use
  const refreshUsage = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const u = await getAccountStorageUsage(uid).catch(() => null);
    if (u) setAccountUsed(u.total);
  };

  const storeIdRef = useRef("");
  const inputRef = useRef(null);
  const folderInputRef = useRef(null);

  const close = () => setOpen(false);

  // Desktop: open over the main work area (not covering the sidebar), like file
  // viewers. Mobile: the work area is transformed off-screen when the sidebar is
  // open, so portal to <body> to overlay the whole screen instead.
  useEffect(() => {
    const desktop = window.matchMedia?.("(hover: hover)").matches;
    setPortalTarget(
      desktop ? (document.getElementById("nm-workarea") || document.body) : document.body
    );
    // Opening the Library closes any other modal (UIContext modals + Search) so
    // they never stack on top of each other.
    closeModals?.();
    window.dispatchEvent(new CustomEvent("nm-close-search"));
    // And if a UIContext modal opens later, slide this one out (animated).
    const onCloseSelf = () => setOpen(false);
    window.addEventListener("nm-close-topic-library", onCloseSelf);
    return () => window.removeEventListener("nm-close-topic-library", onCloseSelf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const [all, fl] = await Promise.all([
      getLibraryFiles({ uid, topicId }),
      getLibraryFolders({ uid, topicId }).catch(() => []),
    ]);
    // Only real, openable files — hide internal memory snippets (url-less).
    setFiles(
      all
        .filter((f) => f.url)
        .sort((a, b) => (b.addedAt?.toMillis?.() || 0) - (a.addedAt?.toMillis?.() || 0))
    );
    setFolders(fl);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    refresh();
    refreshUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  useEffect(() => {
    if (creatingFolder) {
      const t = setTimeout(() => folderInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [creatingFolder]);

  const currentFolder = folders.find((f) => f.id === currentFolderId) ?? null;
  const visibleFolders = currentFolderId ? [] : folders;
  const visibleFiles = files.filter((f) => (f.folderId ?? null) === (currentFolderId ?? null));
  const visiblePending = pending.filter((p) => (p.folderId ?? null) === (currentFolderId ?? null));

  // Account-wide usage = committed total (all areas) + this panel's in-flight uploads.
  const usedBytes = accountUsed + pending.reduce((sum, p) => sum + (p.size || 0), 0);
  const usedPct = Math.min(100, (usedBytes / storageLimit) * 100);
  const barColor =
    usedPct >= 100 ? "bg-red-500" : usedPct >= 80 ? "bg-amber-500" : "bg-blue-500";

  const setPendingStatus = (id, status) =>
    setPending((p) => p.map((e) => (e.id === id ? { ...e, status } : e)));

  const addFiles = async (fileList) => {
    const uid = auth.currentUser?.uid;
    const items = Array.from(fileList || []);
    if (!uid || items.length === 0) return;
    const folderId = currentFolderId ?? null;

    // Account-wide quota gate (current usage + incoming).
    const incoming = items.reduce((sum, f) => sum + (f.size || 0), 0);
    if (usedBytes + incoming > storageLimit) {
      const left = Math.max(0, storageLimit - usedBytes);
      setQuotaError(
        `Not enough storage — ${formatBytes(left)} left of ${formatBytes(storageLimit)}. Remove some files or upgrade your plan.`
      );
      return;
    }
    setQuotaError("");

    const entries = items.map((f) => ({ id: rid(), name: f.name, size: f.size || 0, folderId, status: "uploading" }));
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
            prepared.push({ e, hash, name: meta.name, type: meta.type, url: meta.url, path: meta.path, size: f.size || 0 });
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
              name: p.name, type: p.type, url: p.url, folderId, size: p.size || 0,
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
      refreshUsage();
      setPending([]);
    }
  };

  const commitFolder = async () => {
    const name = newFolderName.trim();
    setNewFolderName("");
    setCreatingFolder(false);
    if (!name) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const folder = await addLibraryFolder({ uid, topicId, name }).catch(() => null);
    if (folder) setFolders((prev) => [folder, ...prev]);
  };

  const deleteFolder = async (folder) => {
    const uid = auth.currentUser?.uid;
    const inFolder = files.filter((f) => f.folderId === folder.id);

    // Optimistic UI
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    setFiles((prev) => prev.filter((f) => f.folderId !== folder.id));
    if (currentFolderId === folder.id) setCurrentFolderId(null);

    // Tear down each file's OpenAI footprint
    for (const f of inFolder) {
      if (f.openaiFileId) {
        expireIndexedFile({ vectorStoreId: f.vectorStoreId || storeIdRef.current, openaiFileId: f.openaiFileId });
      }
    }
    setAccountUsed((b) => Math.max(0, b - inFolder.reduce((s, f) => s + (f.size || 0), 0)));
    if (uid) {
      if (inFolder.length) {
        deleteLibraryFileRecordsByIds({ uid, topicId, ids: inFolder.map((f) => f.id) }).catch(() => {});
      }
      deleteLibraryFolder({ uid, topicId, folderId: folder.id }).catch(() => {});
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
      setAccountUsed((b) => Math.max(0, b - (file.size || 0)));
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

  // Same-origin proxy → bypasses Firebase Storage's missing CORS and the
  // browser's cross-origin download/drag block (see /api/drawings/download).
  const proxyUrl = (file) =>
    `/api/drawings/download?url=${encodeURIComponent(file.url)}&name=${encodeURIComponent(file.name || "file")}`;

  const downloadFile = (file) => {
    if (!file?.url) return;
    const a = document.createElement("a");
    a.href = proxyUrl(file);
    a.download = file.name || "file";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const onFileDragStart = (e, file) => {
    if (!file?.url) return;
    const mime = file.type || "application/octet-stream";
    const abs = `${window.location.origin}${proxyUrl(file)}`;
    try {
      e.dataTransfer.setData("DownloadURL", `${mime}:${file.name}:${abs}`);
      e.dataTransfer.effectAllowed = "copy";
    } catch { /* not supported in this browser */ }
  };

  const isEmpty =
    !loading &&
    visibleFolders.length === 0 &&
    visibleFiles.length === 0 &&
    visiblePending.length === 0 &&
    !creatingFolder;

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
        className="w-full max-w-2xl h-[640px] max-h-[88vh] flex flex-col bg-white dark:bg-[#1a2235] rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => {
          // Only react to external file drags — not a row being dragged OUT.
          if (!Array.from(e.dataTransfer?.types || []).includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer?.files); }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-white/10">
          <div className="min-w-0 flex-1 flex items-center gap-2.5">
            {currentFolder ? (
              <>
                <button
                  onClick={() => setCurrentFolderId(null)}
                  className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-400 transition shrink-0"
                >
                  <ChevronLeft size={16} /> Library
                </button>
                <span className="text-gray-300 dark:text-white/20">/</span>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                  {currentFolder.name}
                </h2>
              </>
            ) : (
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight truncate">
                  Library — {topicName || "Topic"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Files in this topic, searchable by the assistant.
                </p>
              </div>
            )}
          </div>

          {/* New folder — only at the top level */}
          {!currentFolder && (
            <Tooltip content="New folder" position="top" align="right">
              <button
                onClick={() => setCreatingFolder(true)}
                aria-label="New folder"
                className="shrink-0 p-2 rounded-lg text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
              >
                <Icon name="folder-close" size={22} />
              </button>
            </Tooltip>
          )}

          {/* Upload */}
          <Tooltip content="Add files" position="top" align="right">
            <button
              onClick={() => inputRef.current?.click()}
              aria-label="Add files"
              className="shrink-0 p-2 rounded-lg text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
            >
              <MaskIcon src="/library_add.svg" size={20} />
            </button>
          </Tooltip>

          <button
            onClick={close}
            aria-label="Close"
            className="shrink-0 p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
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

        {/* ── Body ── */}
        <div className="relative flex-1 overflow-y-auto custom-scroll p-4">
          {dragging && (
            <div className="absolute inset-3 z-10 rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/70 dark:bg-blue-500/10 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-300 pointer-events-none">
              Drop files to add them
            </div>
          )}

          {loading ? (
            <div className="w-full h-full min-h-[320px] flex items-center justify-center text-gray-400 dark:text-gray-500">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : isEmpty ? (
            /* Empty state — drag & drop zone */
            <button
              onClick={() => inputRef.current?.click()}
              className="group w-full h-full min-h-[320px] rounded-2xl border-2 border-dashed
                border-gray-200 dark:border-white/10
                hover:border-blue-400/70 dark:hover:border-blue-400/50
                hover:bg-blue-50/40 dark:hover:bg-blue-500/[0.04]
                transition flex flex-col items-center justify-center text-center px-8 gap-4"
            >
              <span className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/[0.06]
                text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400
                flex items-center justify-center transition-colors">
                <FileText size={30} />
              </span>
              <div className="max-w-md">
                <p className="text-base font-medium text-gray-700 dark:text-gray-200">
                  {currentFolder ? "Drop files into this folder" : "Drag & drop files here"}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">
                  Add documents for this topic — they're shared across its chats and searchable by the assistant.
                </p>
              </div>
            </button>
          ) : (
            <div className="space-y-6">
              {/* Folders */}
              {(visibleFolders.length > 0 || creatingFolder) && (
                <div>
                  <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    Folders
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {creatingFolder && (
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-blue-400/60 bg-blue-50/50 dark:bg-blue-500/10">
                        <Icon name="folder-close" size={22} className="text-blue-500 shrink-0" />
                        <input
                          ref={folderInputRef}
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitFolder();
                            if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); }
                          }}
                          onBlur={commitFolder}
                          placeholder="Folder name"
                          className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder-gray-400 dark:placeholder-gray-500"
                        />
                      </div>
                    )}
                    {visibleFolders.map((folder) => {
                      const count = files.filter((f) => f.folderId === folder.id).length;
                      return (
                        <button
                          key={folder.id}
                          onClick={() => setCurrentFolderId(folder.id)}
                          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full
                            hover:bg-gray-100 dark:hover:bg-white/5 transition"
                        >
                          <Icon name="folder-close" size={22} className="text-gray-500 dark:text-gray-400 shrink-0" />
                          <span className="flex-1 min-w-0 text-sm text-gray-800 dark:text-white/90 truncate">
                            {folder.name}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                            {count} {count === 1 ? "file" : "files"}
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); deleteFolder(folder); }}
                            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10
                              [@media(hover:hover)]:opacity-0 group-hover:opacity-100 transition"
                            aria-label="Delete folder"
                          >
                            <Trash2 size={15} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Files */}
              {(visibleFiles.length > 0 || visiblePending.length > 0) && (
                <div>
                  <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    Files
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {/* In-flight uploads */}
                    {visiblePending.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03]"
                      >
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          p.status === "error"
                            ? "bg-red-50 dark:bg-red-500/10 text-red-500"
                            : "bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400"
                        }`}>
                          {p.status === "error"
                            ? <AlertCircle size={18} />
                            : p.status === "dup"
                            ? <FileText size={18} className="text-gray-400" />
                            : <Loader2 size={18} className="animate-spin" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800 dark:text-white/90 truncate">{p.name}</p>
                          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                            {p.status === "uploading" ? "Uploading…"
                              : p.status === "indexing" ? "Processing for AI…"
                              : p.status === "dup" ? "Already in library"
                              : "Couldn't add"}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Committed files */}
                    {visibleFiles.map((file) => (
                      <div
                        key={file.id}
                        draggable
                        onDragStart={(e) => onFileDragStart(e, file)}
                        onDragEnd={() => setDragging(false)}
                        className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <button
                          onClick={() => openFile(file)}
                          className="flex items-center gap-3 min-w-0 flex-1 text-left"
                        >
                          <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                            <FileTypeIcon name={file.name} type={file.type} size={18} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-800 dark:text-white/90 truncate">{file.name}</p>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400">
                              {fileLabel(file.name, file.type)}
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={() => downloadFile(file)}
                          aria-label="Download file"
                          className="group/dl relative shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors [@media(hover:hover)]:opacity-0 group-hover:opacity-100"
                        >
                          <Download size={16} />
                          <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 z-30 whitespace-nowrap rounded-md bg-blue-600 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover/dl:opacity-100">
                            Download
                          </span>
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
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer: storage quota ── */}
        <div className="px-6 py-3.5 border-t border-gray-100 dark:border-white/10">
          {quotaError && (
            <p className="mb-2.5 text-xs font-medium text-red-500 dark:text-red-400">
              {quotaError}
            </p>
          )}
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {formatBytes(usedBytes)}
              </span>{" "}
              of {formatBytes(storageLimit)} used
            </span>
            <span className="text-gray-400 dark:text-gray-500">{Math.round(usedPct)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor} transition-all duration-300`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
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
