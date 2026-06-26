"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, Trash2, FileText, Loader2, AlertCircle } from "lucide-react";
import { UIContext } from "@/context/UIContext";
import { ChatContext } from "@/context/ChatContext";
import Tooltip from "@/components/common/Tooltip";
import MaskIcon from "@/components/common/MaskIcon";
import Icon from "@/components/common/Icon";
import InventoryIcon from "./InventoryIcon";
import { auth, storage } from "@/firebase/config";
import { ref as storageRef, deleteObject } from "firebase/storage";
import {
  uploadFileToStorage,
  indexDocuments,
  hashFile,
  expireIndexedFile,
} from "@/components/app/InputBar/attachmentProcessing";
import {
  getUserDrawingsStoreId,
  setUserDrawingsStoreId,
  getDrawingFiles,
  addDrawingFileRecords,
  deleteDrawingFileRecordsByIds,
  getDrawingFolders,
  addDrawingFolder,
  deleteDrawingFolder,
} from "@/firebase/chatStore";

const rid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Storage quota for drawings. Flat value for now — in the subscription phase this
// will be derived from the user's plan (higher tier → larger quota).
const STORAGE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

const formatBytes = (bytes) => {
  if (!bytes || bytes < 0) return "0 MB";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb >= 10 ? Math.round(gb) : gb.toFixed(1)} GB`;
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export default function DrawingRegisterPanel() {
  const { isDrawingRegisterOpen, setDrawingRegisterOpen } = useContext(UIContext);
  const { splitMode } = useContext(ChatContext);

  const [portalTarget, setPortalTarget] = useState(null);
  const [open, setOpen] = useState(false);

  // Firestore-backed state
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [pending, setPending] = useState([]); // in-flight uploads: { tempId, name, size, folderId, status, progress, error }
  const [loading, setLoading] = useState(false);

  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [quotaError, setQuotaError] = useState("");

  const folderInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const storeIdRef = useRef(""); // the user's drawings vector store id

  // Sync local open state with the context flag in both directions.
  useEffect(() => {
    if (isDrawingRegisterOpen) setOpen(true);
    else setOpen(false);
  }, [isDrawingRegisterOpen]);

  const close = () => setOpen(false);

  // Load folders + files from Firestore each time the panel opens.
  useEffect(() => {
    if (!isDrawingRegisterOpen) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [sid, fl, fo] = await Promise.all([
        getUserDrawingsStoreId(uid).catch(() => ""),
        getDrawingFolders(uid).catch(() => []),
        getDrawingFiles(uid).catch(() => []),
      ]);
      if (cancelled) return;
      storeIdRef.current = sid || "";
      setFolders(fl);
      setFiles(fo);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isDrawingRegisterOpen]);

  // Desktop: overlay the work area (sidebar stays visible). Mobile: work area is
  // transformed off-screen with the sidebar, so portal to <body>.
  useEffect(() => {
    const desktop = window.matchMedia?.("(hover: hover)").matches;
    setPortalTarget(
      desktop ? (document.getElementById("nm-workarea") || document.body) : document.body
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (creatingFolder) {
      const t = setTimeout(() => folderInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [creatingFolder]);

  const currentFolder = folders.find((f) => f.id === currentFolderId) ?? null;
  const visibleFolders = currentFolderId ? [] : folders;
  const visibleFiles = files.filter((f) => f.folderId === (currentFolderId ?? null));
  const visiblePending = pending.filter((p) => p.folderId === (currentFolderId ?? null));

  // Storage usage — committed files plus in-flight uploads, against one global pool.
  const usedBytes = useMemo(() => {
    const committed = files.reduce((sum, f) => sum + (f.size || 0), 0);
    const inflight = pending.reduce((sum, p) => sum + (p.size || 0), 0);
    return committed + inflight;
  }, [files, pending]);
  const usedPct = Math.min(100, (usedBytes / STORAGE_LIMIT_BYTES) * 100);
  const barColor =
    usedPct >= 100 ? "bg-red-500" : usedPct >= 80 ? "bg-amber-500" : "bg-blue-500";

  // Auto-dismiss the "out of storage" notice after a moment.
  useEffect(() => {
    if (!quotaError) return;
    const t = setTimeout(() => setQuotaError(""), 5000);
    return () => clearTimeout(t);
  }, [quotaError]);

  // ── Folder create / delete ──
  const commitFolder = async () => {
    const name = newFolderName.trim();
    setNewFolderName("");
    setCreatingFolder(false);
    if (!name) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const folder = await addDrawingFolder({ uid, name }).catch(() => null);
    if (folder) setFolders((prev) => [folder, ...prev]);
  };

  const deleteFolder = async (folder) => {
    const uid = auth.currentUser?.uid;
    const inFolder = files.filter((f) => f.folderId === folder.id);

    // Optimistic UI
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    setFiles((prev) => prev.filter((f) => f.folderId !== folder.id));
    if (currentFolderId === folder.id) setCurrentFolderId(null);

    // Tear down each file's OpenAI + Storage footprint
    for (const f of inFolder) {
      if (f.openaiFileId) {
        expireIndexedFile({
          vectorStoreId: f.vectorStoreId || storeIdRef.current,
          openaiFileId: f.openaiFileId,
        });
      }
      if (f.path) deleteObject(storageRef(storage, f.path)).catch(() => {});
    }
    if (uid) {
      if (inFolder.length) {
        deleteDrawingFileRecordsByIds({ uid, ids: inFolder.map((f) => f.id) }).catch(() => {});
      }
      deleteDrawingFolder({ uid, folderId: folder.id }).catch(() => {});
    }
  };

  // ── File delete ──
  const deleteFile = async (file) => {
    const uid = auth.currentUser?.uid;
    setFiles((prev) => prev.filter((f) => f.id !== file.id));

    if (file.openaiFileId) {
      expireIndexedFile({
        vectorStoreId: file.vectorStoreId || storeIdRef.current,
        openaiFileId: file.openaiFileId,
      });
    }
    if (file.path) deleteObject(storageRef(storage, file.path)).catch(() => {});
    if (uid && file.id) {
      deleteDrawingFileRecordsByIds({ uid, ids: [file.id] }).catch(() => {});
    }
  };

  const dismissPending = (tempId) =>
    setPending((prev) => prev.filter((p) => p.tempId !== tempId));

  // ── Upload + index pipeline ──
  const addFiles = async (fileList) => {
    const items = Array.from(fileList || []);
    if (!items.length) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Quota gate (committed + in-flight + incoming).
    const incoming = items.reduce((sum, f) => sum + (f.size || 0), 0);
    if (usedBytes + incoming > STORAGE_LIMIT_BYTES) {
      const left = Math.max(0, STORAGE_LIMIT_BYTES - usedBytes);
      setQuotaError(
        `Not enough storage — ${formatBytes(left)} left of ${formatBytes(STORAGE_LIMIT_BYTES)}. Remove some drawings or upgrade your plan.`
      );
      return;
    }
    setQuotaError("");

    const folderId = currentFolderId ?? null;
    const queued = items.map((f) => ({
      tempId: rid(),
      name: f.name,
      type: f.type,
      size: f.size || 0,
      folderId,
      status: "uploading",
      progress: 0,
    }));
    setPending((prev) => [...queued, ...prev]);

    for (let i = 0; i < items.length; i++) {
      const file = items[i];
      const { tempId } = queued[i];
      let uploaded = null;
      try {
        // 1) Upload bytes to Firebase Storage (with progress).
        uploaded = await uploadFileToStorage({
          uid,
          file,
          onProgress: (p) =>
            setPending((prev) =>
              prev.map((x) => (x.tempId === tempId ? { ...x, progress: p } : x))
            ),
        });

        // 2) Hash for future dedupe; switch the row to "indexing".
        const hash = await hashFile(file).catch(() => "");
        setPending((prev) =>
          prev.map((x) =>
            x.tempId === tempId ? { ...x, status: "indexing", progress: 100 } : x
          )
        );

        // 3) Chunk + embed into the user's persistent drawings store.
        const result = await indexDocuments({
          vectorStoreId: storeIdRef.current || "",
          label: "NaviMind Drawings",
          docs: [{ url: uploaded.url, name: uploaded.name, type: uploaded.type }],
        });

        const newStoreId = result?.vectorStoreId || storeIdRef.current || "";
        if (newStoreId && newStoreId !== storeIdRef.current) {
          storeIdRef.current = newStoreId;
          setUserDrawingsStoreId(uid, newStoreId).catch(() => {});
        }

        const indexed = result?.files?.[0];
        const openaiFileId = indexed?.openaiFileId || "";

        if (openaiFileId) {
          // 4) Persist the record; reconcile optimistic state.
          const [rec] = await addDrawingFileRecords({
            uid,
            files: [
              {
                name: uploaded.name,
                type: uploaded.type,
                url: uploaded.url,
                path: uploaded.path,
                openaiFileId,
                vectorStoreId: newStoreId,
                hash,
                size: file.size || 0,
                folderId,
              },
            ],
          });
          setPending((prev) => prev.filter((x) => x.tempId !== tempId));
          if (rec) setFiles((prev) => [rec, ...prev]);
        } else {
          // Not indexable (e.g. visual-only image, unsupported type) — don't keep
          // the orphaned Storage object around eating quota.
          if (uploaded?.path) deleteObject(storageRef(storage, uploaded.path)).catch(() => {});
          setPending((prev) =>
            prev.map((x) =>
              x.tempId === tempId
                ? { ...x, status: "failed", error: prettyStatus(indexed?.status) }
                : x
            )
          );
        }
      } catch (e) {
        if (uploaded?.path) deleteObject(storageRef(storage, uploaded.path)).catch(() => {});
        setPending((prev) =>
          prev.map((x) =>
            x.tempId === tempId ? { ...x, status: "failed", error: "Upload failed" } : x
          )
        );
      }
    }
  };

  const isEmpty =
    !loading &&
    visibleFolders.length === 0 &&
    visibleFiles.length === 0 &&
    visiblePending.length === 0 &&
    !creatingFolder;

  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        setDrawingRegisterOpen(false);
        setCurrentFolderId(null);
        setCreatingFolder(false);
        setNewFolderName("");
        setQuotaError("");
      }}
    >
      {open && (
        <motion.div
          key="dr-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`fixed top-0 bottom-0 left-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-hidden ${
            splitMode ? "right-0 [@media(hover:hover)]:right-1/2" : "right-0"
          }`}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <motion.div
            variants={{
              initial: { y: "100%", opacity: 0 },
              animate: { y: 0, opacity: 1 },
              exit: { y: "100%", opacity: 0 },
            }}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-3xl h-[680px] max-h-[88vh] flex flex-col
              bg-white dark:bg-[#1a2235] rounded-2xl shadow-2xl
              ring-1 ring-black/5 dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
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
                      <ChevronLeft size={16} /> Drawings
                    </button>
                    <span className="text-gray-300 dark:text-white/20">/</span>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {currentFolder.name}
                    </h2>
                  </>
                ) : (
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                    Drawings
                  </h2>
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
              <Tooltip content="Upload drawings" position="top" align="right">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload drawings"
                  className="shrink-0 p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition"
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
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff,.tif,.doc,.docx,.txt,.md,.pptx,.ppt,.xlsx,.xls,.csv"
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
                  onClick={() => fileInputRef.current?.click()}
                  className="group w-full h-full min-h-[320px] rounded-2xl border-2 border-dashed
                    border-gray-200 dark:border-white/10
                    hover:border-blue-400/70 dark:hover:border-blue-400/50
                    hover:bg-blue-50/40 dark:hover:bg-blue-500/[0.04]
                    transition flex flex-col items-center justify-center text-center px-8 gap-4"
                >
                  <span className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/[0.06]
                    text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400
                    flex items-center justify-center transition-colors">
                    <InventoryIcon size={32} />
                  </span>
                  <div className="max-w-md">
                    <p className="text-base font-medium text-gray-700 dark:text-gray-200">
                      {currentFolder ? "Drop drawings into this folder" : "Drag & drop your drawings here"}
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">
                      Upload vessel drawings, manuals, general arrangement plans, final plans.
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
                        Drawings
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {/* In-flight uploads */}
                        {visiblePending.map((p) => (
                          <div
                            key={p.tempId}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03]"
                          >
                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              p.status === "failed"
                                ? "bg-red-50 dark:bg-red-500/10 text-red-500"
                                : "bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400"
                            }`}>
                              {p.status === "failed"
                                ? <AlertCircle size={18} />
                                : <Loader2 size={18} className="animate-spin" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-800 dark:text-white/90 truncate">{p.name}</p>
                              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                                {p.status === "uploading" && `Uploading… ${p.progress}%`}
                                {p.status === "indexing" && "Processing for AI…"}
                                {p.status === "failed" && (
                                  <span className="text-red-500 dark:text-red-400">{p.error}</span>
                                )}
                              </p>
                            </div>
                            {p.status === "failed" && (
                              <button
                                onClick={() => dismissPending(p.tempId)}
                                aria-label="Dismiss"
                                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
                              >
                                <X size={15} />
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Committed files */}
                        {visibleFiles.map((file) => (
                          <div
                            key={file.id}
                            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition"
                          >
                            <a
                              href={file.url || undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition"
                            >
                              <FileText size={18} />
                            </a>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-800 dark:text-white/90 truncate">{file.name}</p>
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400">
                                {(file.name.split(".").pop() || "file").toUpperCase()}
                                {file.size ? (
                                  <span className="text-gray-400 dark:text-gray-500 font-normal normal-case tracking-normal">
                                    {" · "}{formatBytes(file.size)}
                                  </span>
                                ) : null}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteFile(file)}
                              aria-label="Delete drawing"
                              className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10
                                [@media(hover:hover)]:opacity-0 group-hover:opacity-100 transition"
                            >
                              <Trash2 size={16} />
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
                  of {formatBytes(STORAGE_LIMIT_BYTES)} used
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
    </AnimatePresence>,
    portalTarget
  );
}

// Human-readable reason when a file couldn't be indexed for AI search.
function prettyStatus(status = "") {
  if (status.startsWith("skipped:visual")) return "No readable text found";
  if (status.startsWith("skipped:unsupported")) return "Unsupported file type";
  if (status.startsWith("skipped:empty")) return "File is empty";
  return "Couldn't process file";
}
