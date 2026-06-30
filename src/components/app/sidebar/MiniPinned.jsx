"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";
import Icon from "@/components/common/Icon";

const toMs = (v) =>
  typeof v === "number" ? v : v?.toMillis?.() ?? (v?.seconds ?? 0) * 1000;

// Quick-access dropdown in the MiniSidebar — shows pinned topics + pinned chats.
export default function MiniPinned() {
  const {
    customProjects,
    projectChatSessions,
    setActiveProject,
    setActiveChatId,
    openChatSession,
  } = useContext(ChatContext);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [tip, setTip] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  // Pinned topics (sorted newest first)
  const pinnedTopics = Object.entries(customProjects || {})
    .filter(([, t]) => t?.isPinned)
    .sort(([, a], [, b]) => toMs(b.createdAt) - toMs(a.createdAt));

  // Pinned global chats
  const pinnedChats = ((projectChatSessions && projectChatSessions.global) || [])
    .filter((c) => c?.isPinned && c?.title)
    .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));

  const isEmpty = pinnedTopics.length === 0 && pinnedChats.length === 0;

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.top, left: r.right + 10 });
  };

  const toggle = () => {
    if (open) { setOpen(false); return; }
    place();
    setTip(null);
    setOpen(true);
  };

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (
        panelRef.current?.contains(e.target) ||
        btnRef.current?.contains(e.target)
      ) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const showTip = () => {
    if (open) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setTip({ top: r.top + r.height / 2, left: r.right + 10 });
  };

  const openTopic = (projId) => {
    setActiveProject(projId);
    setActiveChatId(null);
    router.push(`/app/projects/${projId}`);
    setOpen(false);
  };

  const openChat = (chatId) => {
    openChatSession(chatId, "global");
    router.push("/app");
    setOpen(false);
  };

  // Nothing pinned → no button at all (it appears only once something is pinned).
  if (isEmpty) return null;

  return (
    <div className="flex justify-center w-full">
      <button
        ref={btnRef}
        onClick={toggle}
        onMouseEnter={showTip}
        onMouseLeave={() => setTip(null)}
        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
          open
            ? "bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-white"
            : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
        }`}
        aria-label="Pinned"
      >
        <Icon name="chat" size={20} />
      </button>

      {/* Hover tooltip */}
      {tip && !open && createPortal(
        <div
          className="fixed z-[9999] px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded-md shadow-lg pointer-events-none whitespace-nowrap"
          style={{ top: tip.top, left: tip.left, transform: "translateY(-50%)" }}
        >
          Pinned
        </div>,
        document.body
      )}

      {/* Dropdown */}
      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9999] w-60 max-h-[70vh] overflow-y-auto custom-scroll p-2
            rounded-2xl bg-white/95 dark:bg-[#1a2438]/95 backdrop-blur-md
            shadow-[0_8px_32px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)]
            ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
          style={{ top: pos.top, left: pos.left }}
        >
          <>
              {pinnedTopics.length > 0 && (
                <>
                  <div className="px-2 pt-1 pb-1 text-[12px] font-medium text-gray-400 dark:text-gray-500 select-none">
                    My Topics
                  </div>
                  {pinnedTopics.map(([projId, t]) => (
                    <button
                      key={projId}
                      onClick={() => openTopic(projId)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      type="button"
                    >
                      <Icon name="folder-close" size={18} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
                      <span className="truncate text-[14px]">{t.name}</span>
                    </button>
                  ))}
                </>
              )}

              {pinnedChats.length > 0 && (
                <>
                  <div className={`px-2 pb-1 text-[12px] font-medium text-gray-400 dark:text-gray-500 select-none ${pinnedTopics.length > 0 ? "pt-2" : "pt-1"}`}>
                    Chats
                  </div>
                  {pinnedChats.map((c) => (
                    <button
                      key={c.chatId}
                      onClick={() => openChat(c.chatId)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      type="button"
                    >
                      <Icon name="chat-bubble" size={18} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
                      <span className="truncate text-[14px]">{c.title}</span>
                    </button>
                  ))}
                </>
              )}
          </>
        </div>,
        document.body
      )}
    </div>
  );
}
