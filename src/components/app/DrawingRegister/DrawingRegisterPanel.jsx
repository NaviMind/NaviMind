"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FolderPlus, Folder, ChevronLeft, Trash2, FileText, Search } from "lucide-react";
import { UIContext } from "@/context/UIContext";

const rid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function DrawingRegisterPanel() {
  const { isDrawingRegisterOpen, setDrawingRegisterOpen } = useContext(UIContext);

  const [mounted, setMounted] = useState(false);

  // Folder / file state (local for now — Firestore in the technical phase)
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [search, setSearch] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const folderInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  // Escape closes
  useEffect(() => {
    if (!isDrawingRegisterOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setDrawingRegisterOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isDrawingRegisterOpen, setDrawingRegisterOpen]);

  // Focus folder name input when creator appears
  useEffect(() => {
    if (creatingFolder) {
      const t = setTimeout(() => folderInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [creatingFolder]);

  // Reset breadcrumb when panel closes
  useEffect(() => {
    if (!isDrawingRegisterOpen) {
      setCurrentFolderId(null);
      setSearch("");
      setCreatingFolder(false);
      setNewFolderName("");
    }
  }, [isDrawingRegisterOpen]);

  const currentFolder = folders.find((f) => f.id === currentFolderId) ?? null;

  const visibleFolders = useMemo(() => {
    if (currentFolderId) return [];
    const q = search.trim().toLowerCase();
    return folders.filter((f) => !q || f.name.toLowerCase().includes(q));
  }, [folders, currentFolderId, search]);

  const visibleFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return files.filter(
      (f) => f.folderId === currentFolderId && (!q || f.name.toLowerCase().includes(q))
    );
  }, [files, currentFolderId, search]);

  const commitFolder = () => {
    const name = newFolderName.trim();
    if (name) setFolders((prev) => [{ id: rid(), name }, ...prev]);
    setNewFolderName("");
    setCreatingFolder(false);
  };

  const handleUpload = (e) => {
    const items = Array.from(e.target.files || []);
    if (items.length) {
      setFiles((prev) => [
        ...items.map((f) => ({ id: rid(), name: f.name, type: f.type, folderId: currentFolderId })),
        ...prev,
      ]);
    }
    e.target.value = "";
  };

  const deleteFolder = (id) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setFiles((prev) => prev.filter((f) => f.folderId !== id));
    if (currentFolderId === id) setCurrentFolderId(null);
  };

  const deleteFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const isEmpty = visibleFolders.length === 0 && visibleFiles.length === 0 && !creatingFolder;

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop — mobile only */}
      <AnimatePresence>
        {isDrawingRegisterOpen && (
          <motion.div
            key="dr-backdrop"
            className="fixed inset-0 z-[110] md:hidden bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setDrawingRegisterOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isDrawingRegisterOpen && (
          <motion.aside
            key="dr-panel"
            className={`
              fixed inset-y-0 right-0 z-[111]
              w-full md:w-[480px]
              flex flex-col
              bg-[var(--bg-sidebar)] text-gray-900 dark:text-white
              border-l border-gray-200 dark:border-white/[0.08]
              shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.6)]
            `}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
          >

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h2 className="text-[18px] font-semibold tracking-tight">Drawings</h2>
              <button
                type="button"
                onClick={() => setDrawingRegisterOpen(false)}
                aria-label="Close"
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400
                  hover:bg-gray-100 dark:hover:bg-white/[0.08]
                  hover:text-gray-900 dark:hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Action bar — always visible ── */}
            <div className="flex items-center gap-2 px-5 pb-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                  bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white transition"
              >
                <Upload size={14} /> Upload
              </button>
              {!currentFolder && (
                <button
                  type="button"
                  onClick={() => setCreatingFolder(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                    bg-gray-100 dark:bg-white/[0.07]
                    hover:bg-gray-200 dark:hover:bg-white/[0.12]
                    text-gray-700 dark:text-gray-200 transition"
                >
                  <FolderPlus size={14} /> New folder
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.tiff,.tif"
                onChange={handleUpload}
              />
              {/* Search */}
              <div className="relative flex-1 ml-1">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full pl-7 pr-2.5 py-2 rounded-lg text-sm
                    bg-gray-100 dark:bg-white/[0.06]
                    placeholder-gray-400 dark:placeholder-gray-500
                    border border-transparent
                    focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/30
                    outline-none transition"
                />
              </div>
            </div>

            {/* ── Breadcrumb (inside a folder) ── */}
            {currentFolder && (
              <div className="flex items-center gap-1.5 px-5 pb-2 flex-shrink-0">
                <button
                  onClick={() => setCurrentFolderId(null)}
                  className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-400 transition"
                >
                  <ChevronLeft size={15} /> Back
                </button>
                <span className="text-sm text-gray-400 dark:text-gray-500 truncate">
                  · {currentFolder.name}
                </span>
              </div>
            )}

            <div className="h-px bg-gray-200 dark:bg-white/[0.07] mx-5 flex-shrink-0" />

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto custom-scroll px-5 py-4">
              {isEmpty ? (
                <div className="flex flex-col justify-center h-full min-h-[200px] gap-1.5">
                  {currentFolder ? (
                    <>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        This folder is empty
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        Upload drawings using the button above.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        No drawings yet
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
                        Upload vessel drawings — GA plans, P&IDs, mooring
                        arrangements — and organise them into folders. NaviMind will
                        reference them in every chat.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Folders */}
                  {(visibleFolders.length > 0 || creatingFolder) && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                        Folders
                      </p>
                      <div className="flex flex-col gap-1">
                        {/* Inline folder creator */}
                        {creatingFolder && (
                          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-blue-400/60 bg-blue-50/50 dark:bg-blue-500/10">
                            <Folder size={16} className="text-blue-500 flex-shrink-0" />
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
                              className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left w-full
                                hover:bg-gray-100 dark:hover:bg-white/[0.06] transition"
                            >
                              <Folder size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                              <span className="flex-1 min-w-0 text-sm truncate">{folder.name}</span>
                              <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                                {count}
                              </span>
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                                className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-500/10
                                  [@media(hover:hover)]:opacity-0 group-hover:opacity-100 transition"
                                aria-label="Delete folder"
                              >
                                <Trash2 size={13} />
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
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                        Drawings
                      </p>
                      <div className="flex flex-col gap-1">
                        {visibleFiles.map((file) => (
                          <div
                            key={file.id}
                            className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                              hover:bg-gray-100 dark:hover:bg-white/[0.06] transition"
                          >
                            <FileText size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                            <span className="flex-1 min-w-0 text-sm truncate">{file.name}</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 flex-shrink-0">
                              {(file.name.split(".").pop() || "").toUpperCase()}
                            </span>
                            <button
                              onClick={() => deleteFile(file.id)}
                              aria-label="Delete drawing"
                              className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-500/10
                                [@media(hover:hover)]:opacity-0 group-hover:opacity-100 transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
