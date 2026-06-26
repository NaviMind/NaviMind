"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, Trash2, FileText } from "lucide-react";
import { UIContext } from "@/context/UIContext";
import { ChatContext } from "@/context/ChatContext";
import Tooltip from "@/components/common/Tooltip";
import MaskIcon from "@/components/common/MaskIcon";
import Icon from "@/components/common/Icon";
import InventoryIcon from "./InventoryIcon";

const rid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function DrawingRegisterPanel() {
  const { isDrawingRegisterOpen, setDrawingRegisterOpen } = useContext(UIContext);
  const { splitMode } = useContext(ChatContext);

  const [portalTarget, setPortalTarget] = useState(null);
  const [open, setOpen] = useState(false);

  // Folder / file state (local for now — Firestore in the technical phase)
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [dragging, setDragging] = useState(false);

  const folderInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Drive the slide-up / slide-down with the context flag
  useEffect(() => {
    if (isDrawingRegisterOpen) setOpen(true);
  }, [isDrawingRegisterOpen]);

  const close = () => setOpen(false);

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
  const visibleFiles = files.filter((f) => f.folderId === currentFolderId);

  const commitFolder = () => {
    const name = newFolderName.trim();
    if (name) setFolders((prev) => [{ id: rid(), name }, ...prev]);
    setNewFolderName("");
    setCreatingFolder(false);
  };

  const addFiles = (fileList) => {
    const items = Array.from(fileList || []);
    if (!items.length) return;
    setFiles((prev) => [
      ...items.map((f) => ({ id: rid(), name: f.name, type: f.type, folderId: currentFolderId })),
      ...prev,
    ]);
  };

  const deleteFolder = (id) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setFiles((prev) => prev.filter((f) => f.folderId !== id));
    if (currentFolderId === id) setCurrentFolderId(null);
  };
  const deleteFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const isEmpty = visibleFolders.length === 0 && visibleFiles.length === 0 && !creatingFolder;

  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        setDrawingRegisterOpen(false);
        setCurrentFolderId(null);
        setCreatingFolder(false);
        setNewFolderName("");
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
                    <Icon name="create-new" size={20} />
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
                accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.tiff,.tif"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
            </div>

            {/* ── Body ── */}
            <div className="relative flex-1 overflow-y-auto custom-scroll p-4">
              {/* Drag overlay while dragging files over the window */}
              {dragging && (
                <div className="absolute inset-3 z-10 rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/70 dark:bg-blue-500/10 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-300 pointer-events-none">
                  Drop files to add them
                </div>
              )}

              {isEmpty ? (
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
                      Upload vessel drawings, manuals, general arrangement plans, pipe plans.
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
                            <Icon name="folder-close" size={20} className="text-blue-500 shrink-0" />
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
                              <Icon name="folder-close" size={20} className="text-gray-500 dark:text-gray-400 shrink-0" />
                              <span className="flex-1 min-w-0 text-sm text-gray-800 dark:text-white/90 truncate">
                                {folder.name}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                                {count} {count === 1 ? "file" : "files"}
                              </span>
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
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
                  {visibleFiles.length > 0 && (
                    <div>
                      <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                        Drawings
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {visibleFiles.map((file) => (
                          <div
                            key={file.id}
                            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition"
                          >
                            <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-500 dark:text-blue-400">
                              <FileText size={18} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-800 dark:text-white/90 truncate">{file.name}</p>
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400">
                                {(file.name.split(".").pop() || "file").toUpperCase()}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteFile(file.id)}
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    portalTarget
  );
}
