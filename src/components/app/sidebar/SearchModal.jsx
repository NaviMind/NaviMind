"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChatContext } from "@/context/ChatContext";
import { UIContext } from "@/context/UIContext";
import Icon from "@/components/common/Icon";

const toMs = (v) =>
  typeof v === "number" ? v : v?.toMillis?.() ?? (v?.seconds ?? 0) * 1000;

// Highlight the matched substring inside a title.
function Highlighted({ text, query }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent text-blue-600 dark:text-blue-400 font-semibold">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function SearchModal({ open, onClose, onSidebarItemClick }) {
  const { theme } = useContext(UIContext);
  const { projectChatSessions, customProjects, openChatSession } =
    useContext(ChatContext);
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [isPresent, setIsPresent] = useState(false);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const rowRefs = useRef([]);

  // Mount/unmount with exit animation
  useEffect(() => {
    if (open) setIsPresent(true);
  }, [open]);

  // Reset + focus each time the palette opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setSel(0);
      // focus after the entrance frame so autofocus is reliable
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Flatten every chat (global + all topics) into one searchable list
  const allChats = useMemo(() => {
    const out = [];
    const sessions = projectChatSessions || {};
    Object.entries(sessions).forEach(([projId, chats]) => {
      const topicName =
        projId === "global" ? null : customProjects?.[projId]?.name || "Topic";
      (chats || []).forEach((c) => {
        if (!c?.chatId || !c?.title) return;
        out.push({
          chatId: c.chatId,
          projId,
          title: c.title,
          summary: c.summary || "",
          topicName,
          createdAt: c.createdAt,
        });
      });
    });
    return out;
  }, [projectChatSessions, customProjects]);

  // Empty query → most recent chats as suggestions. Otherwise → filtered.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [...allChats]
        .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))
        .slice(0, 8);
    }
    return allChats
      .filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [query, allChats]);

  // Keep selection in range when results change
  useEffect(() => {
    setSel((s) => Math.min(s, Math.max(0, results.length - 1)));
  }, [results.length]);

  // Scroll the highlighted row into view
  useEffect(() => {
    rowRefs.current[sel]?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const handleSelect = (item) => {
    if (!item) return;
    openChatSession(item.chatId, item.projId);
    router.push("/app");
    onSidebarItemClick?.();
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(results[sel]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isPresent) return null;

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-start justify-center px-3 pt-[12vh] backdrop-blur-sm ${
        theme === "dark" ? "bg-black/60" : "bg-black/25"
      }`}
      style={{ transition: "opacity 300ms", opacity: open ? 1 : 0 }}
      onClick={handleBackdropClick}
    >
      <AnimatePresence
        onExitComplete={() => {
          if (!open) setIsPresent(false);
        }}
      >
        {open && (
          <motion.div
            key="search-modal"
            initial={{ y: -8, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl flex flex-col overflow-hidden rounded-2xl
              bg-white/95 dark:bg-[#151e30]/95 backdrop-blur-xl
              ring-1 ring-black/[0.07] dark:ring-white/10
              shadow-[0_12px_48px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_48px_rgba(0,0,0,0.6)]"
            onKeyDown={handleKeyDown}
          >
            {/* Search input row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08]">
              <Icon
                name="search"
                size={20}
                className="text-gray-400 dark:text-gray-500 flex-shrink-0"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSel(0);
                }}
                placeholder="Search chats…"
                className="flex-1 bg-transparent outline-none text-[16px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={onClose}
                className="flex-shrink-0 text-[11px] font-medium text-gray-400 dark:text-gray-500 border border-black/10 dark:border-white/15 rounded px-1.5 py-0.5 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close search"
                type="button"
              >
                Esc
              </button>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              className="max-h-[50vh] overflow-y-auto custom-scroll py-1"
            >
              {results.length === 0 ? (
                <div className="px-4 py-10 text-center text-[14px] text-gray-400 dark:text-gray-500">
                  {query.trim()
                    ? "No chats found"
                    : "Start typing to search your chats"}
                </div>
              ) : (
                <>
                  {!query.trim() && (
                    <div className="px-4 pt-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 select-none">
                      Recent
                    </div>
                  )}
                  {results.map((item, i) => (
                    <button
                      key={`${item.projId}:${item.chatId}`}
                      ref={(el) => (rowRefs.current[i] = el)}
                      onClick={() => handleSelect(item)}
                      onMouseMove={() => setSel(i)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        i === sel
                          ? "bg-blue-50 dark:bg-white/[0.07]"
                          : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                      }`}
                      type="button"
                    >
                      <Icon
                        name={item.topicName ? "folder-close" : "chat-bubble"}
                        size={18}
                        className="flex-shrink-0 text-gray-400 dark:text-gray-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] text-gray-900 dark:text-gray-100">
                          <Highlighted text={item.title} query={query} />
                        </div>
                        <div className="truncate text-[12px] text-gray-400 dark:text-gray-500">
                          {item.topicName || "Chats"}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
