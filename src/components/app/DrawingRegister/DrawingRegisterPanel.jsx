"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Upload, FolderPlus, Folder, ChevronRight, Trash2, FileText } from "lucide-react";
import { UIContext } from "@/context/UIContext";

const rid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const BOX_PATH =
  "M200-80q-33 0-56.5-23.5T120-160v-451q-18-11-29-28.5T80-680v-120q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v120q0 23-11 40.5T840-611v451q0 33-23.5 56.5T760-80H200Zm0-520v440h560v-440H200Zm-40-80h640v-120H160v120Zm200 280h240v-80H360v80Zm120 20Z";

export default function DrawingRegisterPanel() {
  const { isDrawingRegisterOpen, setDrawingRegisterOpen } = useContext(UIContext);

  const [portalTarget, setPortalTarget] = useState(null);
  const [open, setOpen] = useState(false);

  // Local UI state (will be backed by Firestore in the technical phase).
  const [folders, setFolders] = useState([]); // [{ id, name }]
  const [files, setFiles] = useState([]);      // [{ id, name, type, folderId|null }]
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [search, setSearch] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const folderInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync internal open state with context (drives the slide-up / fade-out).
  useEffect(() => {
    if (isDrawingRegisterOpen) setOpen(true);
  }, [isDrawingRegisterOpen]);

  const close = () => setOpen(false);

  // Desktop: overlay the work area (keeps the sidebar visible). Mobile: the work
  // area is transformed off-screen with the sidebar, so portal to <body>.
  useEffect(() => {
    const desktop = window.matchMedia?.("(hover: hover)").matches;
    setPortalTarget(
      desktop ? (document.getElementById("nm-workarea") || document.body) : document.body
    );
  }, []);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus the folder-name input when the inline creator appears
  useEffect(() => {
    if (creatingFolder) {
      const t = setTimeout(() => folderInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [creatingFolder]);

  const currentFolder = folders.find((f) => f.id === currentFolderId) || null;

  const visibleFolders = useMemo(() => {
    if (currentFolderId) return []; // nested folders not supported yet
    const q = search.trim().toLowerCase();
    return folders.filter((f) => !q || f.name.toLowerCase().includes(q));
  }, [folders, currentFolderId, search]);

  const visibleFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return files.filter(
      (f) => f.folderId === currentFolderId && (!q || f.name.toLowerCase().includes(q))
    );
  }, [files, currentFolderId, search]);

  const createFolder = () => {
    const name = newFolderName.trim();
    if (!name) { setCreatingFolder(false); setNewFolderName(""); return; }
    setFolders((prev) => [{ id: rid(), name }, ...prev]);
    setNewFolderName("");
    setCreatingFolder(false);
  };

  const handleUpload = (e) => {
    const items = Array.from(e.target.files || []);
    if (items.length) {
      setFiles((prev) => [
        ...items.map((f) => ({
          id: rid(),
          name: f.name,
          type: f.type,
          folderId: currentFolderId,
        })),
        ...prev,
      ]);
    }
    e.target.value = "";
  };

  const deleteFolder = (id) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setFiles((prev) => prev.filter((f) => f.folderId !== id));
  };
  const deleteFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const isEmpty = visibleFolders.length === 0 && visibleFiles.length === 0 && !creatingFolder;

  if (!portalTarget) return null;

  // Desktop overlays only the work area (absolute, contained by #nm-workarea's
  // transform). Mobile portals to <body>, so cover the viewport with fixed.
  const positionCls = portalTarget === document.body ? "fixed" : "absolute";

  return createPortal(
    <AnimatePresence onExitComplete={() => setDrawingRegisterOpen(false)}>
      {open && (
        <motion.div
          key="dr-overlay"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className={`${positionCls} inset-0 z-[120] flex flex-col bg-[var(--bg-app)] text-gray-900 dark:text-white`}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 md:px-7 py-4 border-b border-gray-200 dark:border-white/[0.08] flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor">
                  <path d={BOX_PATH} />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight leading-tight truncate">
                  Drawing Register
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Vessel drawings the AI can reference across all chats.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close Drawing Register"
              className="flex-shrink-0 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Toolbar ── */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 md:px-7 py-3 border-b border-gray-100 dark:border-white/[0.05] flex-shrink-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm flex-shrink-0">
              <button
                onClick={() => setCurrentFolderId(null)}
                className={`transition-colors ${
                  currentFolder
                    ? "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    : "text-gray-900 dark:text-white font-medium"
                }`}
              >
                All drawings
              </button>
              {currentFolder && (
                <>
                  <ChevronRight size={14} className="text-gray-400" />
                  <span className="text-gray-900 dark:text-white font-medium truncate max-w-[180px]">
                    {currentFolder.name}
                  </span>
                </>
              )}
            </div>

            <div className="flex-1" />

            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm
                  bg-gray-100 dark:bg-white/[0.06]
                  placeholder-gray-400 dark:placeholder-gray-500
                  border border-transparent
                  focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/30
                  outline-none transition"
              />
            </div>

            {/* Actions */}
            {!currentFolder && (
              <button
                type="button"
                onClick={() => setCreatingFolder(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                  bg-gray-100 dark:bg-white/[0.07] hover:bg-gray-200 dark:hover:bg-white/[0.12]
                  text-gray-700 dark:text-gray-200 transition flex-shrink-0"
              >
                <FolderPlus size={15} />
                <span className="hidden sm:inline">New folder</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white transition flex-shrink-0"
            >
              <Upload size={15} />
              <span className="hidden sm:inline">Upload</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="sr-only"
              accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.tiff,.tif"
              onChange={handleUpload}
            />
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto custom-scroll px-5 md:px-7 py-5">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center text-center h-full min-h-[280px] gap-4">
                <span className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-400 dark:text-gray-500 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 -960 960 960" fill="currentColor">
                    <path d={BOX_PATH} />
                  </svg>
                </span>
                <div>
                  <p className="text-base font-medium text-gray-700 dark:text-gray-200">
                    {currentFolder ? "This folder is empty" : "No drawings yet"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm leading-relaxed">
                    Upload vessel drawings — GA plans, P&IDs, mooring arrangements — and
                    organise them into folders. NaviMind will reference them in every chat.
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {!currentFolder && (
                    <button
                      onClick={() => setCreatingFolder(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                        bg-gray-100 dark:bg-white/[0.07] hover:bg-gray-200 dark:hover:bg-white/[0.12]
                        text-gray-700 dark:text-gray-200 transition"
                    >
                      <FolderPlus size={15} /> New folder
                    </button>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                      bg-blue-600 hover:bg-blue-500 text-white transition"
                  >
                    <Upload size={15} /> Upload drawing
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto space-y-6">
                {/* Folders */}
                {(visibleFolders.length > 0 || creatingFolder) && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                      Folders
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {/* Inline new-folder creator */}
                      {creatingFolder && (
                        <div className="flex items-center gap-2 px-3 py-3 rounded-xl border border-blue-400/60 bg-blue-50/60 dark:bg-blue-500/10">
                          <Folder size={18} className="text-blue-500 flex-shrink-0" />
                          <input
                            ref={folderInputRef}
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") createFolder();
                              if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); }
                            }}
                            onBlur={createFolder}
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
                            className="group relative flex items-center gap-2.5 px-3 py-3 rounded-xl text-left
                              border border-gray-200 dark:border-white/[0.07]
                              bg-white dark:bg-white/[0.03]
                              hover:border-blue-400/60 hover:bg-blue-50/40 dark:hover:bg-white/[0.06]
                              transition"
                          >
                            <Folder size={18} className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{folder.name}</p>
                              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                                {count} {count === 1 ? "file" : "files"}
                              </p>
                            </div>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                              className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-500/10
                                [@media(hover:hover)]:opacity-0 group-hover:opacity-100 transition"
                              aria-label="Delete folder"
                            >
                              <Trash2 size={14} />
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
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                      Drawings
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {visibleFiles.map((file) => (
                        <div
                          key={file.id}
                          className="group flex items-center gap-3 px-3 py-3 rounded-xl
                            border border-gray-200 dark:border-white/[0.07]
                            bg-white dark:bg-white/[0.03]
                            hover:border-gray-300 dark:hover:border-white/[0.14] transition"
                        >
                          <span className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0 text-gray-500 dark:text-gray-400">
                            <FileText size={18} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-[11px] uppercase tracking-wider text-blue-500 dark:text-blue-400 font-semibold">
                              {(file.name.split(".").pop() || "file").toUpperCase()}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteFile(file.id)}
                            aria-label="Delete drawing"
                            className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-500/10
                              [@media(hover:hover)]:opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 size={15} />
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
      )}
    </AnimatePresence>,
    portalTarget
  );
}
