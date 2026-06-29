"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { ChatContext } from "@/context/ChatContext";
import { UIContext } from "@/context/UIContext";
import Icon from "@/components/common/Icon";

const toMs = (v) =>
  typeof v === "number" ? v : v?.toMillis?.() ?? (v?.seconds ?? 0) * 1000;

const fmtDate = (v) => {
  const ms = toMs(v);
  return ms ? dayjs(ms).format("D MMM YYYY") : "";
};

const slideUp = {
  initial: { y: "100%", opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit:    { y: "100%", opacity: 0 },
};
const slideTransition = { duration: 0.8, ease: [0.16, 1, 0.3, 1] };

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
  const { theme, closeModals } = useContext(UIContext);
  const { projectChatSessions, customProjects, openChatSession, splitMode } =
    useContext(ChatContext);
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [portalTarget, setPortalTarget] = useState(null);

  const inputRef = useRef(null);
  const backdropRef = useRef(null);
  const rowRefs = useRef([]);

  useEffect(() => { setMounted(true); }, []);

  // Open inside the work area (not over the sidebar), like the other modals.
  useEffect(() => {
    const desktop = window.matchMedia?.("(hover: hover)").matches;
    setPortalTarget(
      desktop ? (document.getElementById("nm-workarea") || document.body) : document.body
    );
  }, []);

  // One modal at a time: opening Search closes the others; opening another
  // closes Search.
  useEffect(() => {
    if (!open) return;
    closeModals?.();
    window.dispatchEvent(new CustomEvent("nm-close-topic-library"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const onCloseSelf = () => onClose?.();
    window.addEventListener("nm-close-search", onCloseSelf);
    return () => window.removeEventListener("nm-close-search", onCloseSelf);
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSel(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const allChats = useMemo(() => {
    const out = [];
    Object.entries(projectChatSessions || {}).forEach(([projId, chats]) => {
      // Skip chats whose topic no longer exists (stale entries left in the
      // cached sessions after a topic was deleted) — they shouldn't surface.
      if (projId !== "global" && !customProjects?.[projId]) return;
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

  useEffect(() => {
    setSel((s) => Math.min(s, Math.max(0, results.length - 1)));
  }, [results.length]);

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
    }
  };

  const handleBackdrop = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  if (!mounted || !portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          ref={backdropRef}
          className={`fixed top-0 bottom-0 left-0 z-[2000] flex items-center justify-center backdrop-blur-sm p-4 overflow-hidden ${
            theme === "dark" ? "bg-black/60" : "bg-black/25"
          } ${splitMode ? "right-0 [@media(hover:hover)]:right-1/2" : "right-0"}`}
          onClick={handleBackdrop}
        >
          <motion.div
            key="search-modal"
            variants={slideUp}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={slideTransition}
            className="w-full max-w-[360px] sm:max-w-lg"
            onKeyDown={handleKeyDown}
          >
            {/* Outer card — matches SettingsModal shell */}
            <div className="relative bg-white/95 dark:bg-[#0f1623]/90 backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/[0.08] rounded-[22px] shadow-2xl overflow-hidden">

              {/* Header row — gives the ✕ its own space, doesn't overlap pills */}
              <div className="flex items-center justify-end px-3 pt-3 pb-0">
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                  aria-label="Close"
                  type="button"
                >
                  ✕
                </button>
              </div>

              <div className="px-4 pt-2 pb-4 flex flex-col gap-3">

                {/* Pill 1 — Search input */}
                <div className="flex items-center gap-3 px-4 py-[13px] rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06]">
                  <Icon
                    name="search"
                    size={20}
                    className="text-gray-400 dark:text-gray-500 flex-shrink-0"
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSel(0); }}
                    placeholder="Search topics and chats…"
                    className="flex-1 bg-transparent outline-none text-[15px] text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                {/* Pill 2 — Results block */}
                <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06] overflow-hidden">
                  <div className="overflow-y-auto custom-scroll max-h-[50vh] sm:max-h-[65vh]">
                    {results.length === 0 ? (
                      <div className="px-4 py-8 text-center text-[14px] text-gray-400 dark:text-gray-500">
                        {query.trim() ? "No chats found" : "Start typing to search your chats"}
                      </div>
                    ) : (
                      <>
                        {!query.trim() && (
                          <div className="px-4 pt-3 pb-1 text-[12px] font-medium text-gray-400 dark:text-gray-500 select-none">
                            Recent
                          </div>
                        )}
                        <div className="px-2 pb-2">
                          {results.map((item, i) => (
                            <button
                              key={`${item.projId}:${item.chatId}`}
                              ref={(el) => (rowRefs.current[i] = el)}
                              onClick={() => handleSelect(item)}
                              onMouseMove={() => setSel(i)}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors duration-150 ${
                                i === sel
                                  ? "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white"
                                  : "hover:bg-gray-200 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200"
                              }`}
                              type="button"
                            >
                              <Icon
                                name={item.topicName ? "folder-close" : "chat-bubble"}
                                size={18}
                                className="flex-shrink-0 text-gray-400 dark:text-gray-500"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[14px]">
                                  <Highlighted text={item.title} query={query} />
                                </div>
                                <div className="truncate text-[12px] text-gray-400 dark:text-gray-500">
                                  {item.topicName || "Chats"}
                                </div>
                              </div>
                              {fmtDate(item.createdAt) && (
                                <span className="flex-shrink-0 text-[11px] text-gray-400 dark:text-gray-500 ml-2 whitespace-nowrap">
                                  {fmtDate(item.createdAt)}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    portalTarget
  );
}
