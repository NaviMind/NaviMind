"use client";

import { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Upload, FolderPlus, ChevronDown } from "lucide-react";
import { UIContext } from "@/context/UIContext";
import InventoryIcon from "./InventoryIcon";

function EmptyState({ onUpload }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[220px] gap-3 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center text-gray-400 dark:text-gray-500">
        <svg width="28" height="28" viewBox="0 -960 960 960" fill="currentColor">
          <path d="M200-80q-33 0-56.5-23.5T120-160v-451q-18-11-29-28.5T80-680v-120q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v120q0 23-11 40.5T840-611v451q0 33-23.5 56.5T760-80H200Zm0-520v440h560v-440H200Zm-40-80h640v-120H160v120Zm200 280h240v-80H360v80Zm120 20Z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No drawings yet</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 leading-relaxed max-w-[220px]">
          Upload vessel drawings and NaviMind will reference them across all your chats.
        </p>
      </div>
      <label className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.13] text-sm text-gray-700 dark:text-gray-300 transition cursor-pointer select-none">
        <Upload size={14} />
        Upload first drawing
        <input
          type="file"
          className="sr-only"
          multiple
          accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.tiff,.tif"
          onChange={onUpload}
        />
      </label>
    </div>
  );
}

export default function DrawingRegisterPanel() {
  const { isDrawingRegisterOpen, setDrawingRegisterOpen } = useContext(UIContext);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isDrawingRegisterOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setDrawingRegisterOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isDrawingRegisterOpen, setDrawingRegisterOpen]);

  // Close add-menu when panel closes
  useEffect(() => {
    if (!isDrawingRegisterOpen) setShowAddMenu(false);
  }, [isDrawingRegisterOpen]);

  if (!mounted) return null;

  const panel = (
    <AnimatePresence>
      {isDrawingRegisterOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            key="dr-backdrop"
            className="fixed inset-0 z-[99] md:hidden bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDrawingRegisterOpen(false)}
          />

          {/* Panel */}
          <motion.aside
            key="dr-panel"
            className={`
              fixed inset-y-0 right-0 z-[100]
              w-full md:w-[360px]
              flex flex-col
              bg-white dark:bg-[#0f1623]
              border-l border-gray-200 dark:border-white/[0.09]
              shadow-2xl
            `}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200 dark:border-white/[0.08] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-blue-500 dark:text-blue-400 flex items-center">
                  <InventoryIcon size={18} />
                </span>
                <h2 className="font-semibold text-sm text-gray-900 dark:text-white tracking-tight">
                  Drawing Register
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDrawingRegisterOpen(false)}
                aria-label="Close Drawing Register"
                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Search ── */}
            <div className="px-3 pt-3 pb-2 flex-shrink-0">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search drawings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-sm
                    bg-gray-100 dark:bg-white/[0.06]
                    text-gray-900 dark:text-white
                    placeholder-gray-400 dark:placeholder-gray-500
                    border border-transparent
                    focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/30
                    outline-none transition"
                />
              </div>
            </div>

            {/* ── Add button + dropdown ── */}
            <div className="px-3 pb-2 flex-shrink-0 relative">
              <button
                type="button"
                onClick={() => setShowAddMenu((v) => !v)}
                className="flex items-center gap-1.5 w-full px-3 py-2 rounded-lg
                  bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                  text-white text-sm font-medium transition select-none"
              >
                <span className="flex-1 text-left">Add</span>
                <motion.span
                  animate={{ rotate: showAddMenu ? 180 : 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center"
                >
                  <ChevronDown size={15} />
                </motion.span>
              </button>

              <AnimatePresence>
                {showAddMenu && (
                  <motion.div
                    key="add-menu"
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.14 }}
                    className="absolute left-3 right-3 mt-1 z-10 rounded-xl overflow-hidden
                      shadow-xl border border-gray-200 dark:border-white/[0.09]
                      bg-white dark:bg-[#1a2235]"
                  >
                    <label
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm
                        text-gray-700 dark:text-gray-200
                        hover:bg-gray-50 dark:hover:bg-white/[0.06]
                        transition cursor-pointer"
                      onClick={() => setShowAddMenu(false)}
                    >
                      <Upload size={14} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      Upload files
                      <input
                        type="file"
                        className="sr-only"
                        multiple
                        accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.tiff,.tif"
                      />
                    </label>
                    <div className="h-px bg-gray-100 dark:bg-white/[0.06]" />
                    <button
                      type="button"
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm
                        text-gray-700 dark:text-gray-200
                        hover:bg-gray-50 dark:hover:bg-white/[0.06]
                        transition"
                      onClick={() => setShowAddMenu(false)}
                    >
                      <FolderPlus size={14} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      New folder
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── File list / Empty state ── */}
            <div className="flex-1 overflow-y-auto custom-scroll">
              <EmptyState onUpload={() => {}} />
            </div>

            {/* ── Footer ── */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-white/[0.06] flex-shrink-0">
              <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center leading-relaxed">
                Drawings are available to the AI across all chats.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(panel, document.body);
}
