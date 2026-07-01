"use client";

import { useContext, useState, useCallback } from "react";
import { ChatContext } from "@/context/ChatContext";
import { deleteChatFromFirestore } from "@/firebase/chatStore";
import { auth } from "@/firebase/config";
import ChatItem from "./ChatItem";

export default function ChatListSection({ onSidebarItemClick }) {
  const {
    projectChatSessions,
    activeChatId,
    setActiveChatId,
    setActiveProject,
    setProjectChatSessions,
  } = useContext(ChatContext);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const globalRaw = (projectChatSessions && projectChatSessions["global"]) || [];

  const seen = new Set();
  const unique = globalRaw.filter((c) => {
    const id = c?.chatId;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const toMillis = (v) =>
    typeof v === "number" ? v : v?.toMillis?.() ?? v?.seconds * 1000 ?? 0;

  const globalChats = unique.sort((a, b) => {
    if (a.isPinned === b.isPinned) return toMillis(b.createdAt) - toMillis(a.createdAt);
    return a.isPinned ? -1 : 1;
  });

  const handleEnterSelectMode = useCallback((chatId) => {
    setIsSelectMode(true);
    setSelectedIds(chatId ? new Set([chatId]) : new Set());
  }, []);

  const handleToggleSelect = useCallback((chatId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(globalChats.map((c) => c.chatId)));
  }, [globalChats]);

  const handleCancelSelect = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0 || isDeleting) return;
    setIsDeleting(true);

    const user = auth.currentUser;
    if (user) {
      await Promise.all(
        [...selectedIds].map((chatId) =>
          deleteChatFromFirestore(user.uid, chatId, null).catch(() => {})
        )
      );
    }

    setProjectChatSessions((prev) => {
      const next = { ...prev };
      next.global = (next.global || []).filter((c) => !selectedIds.has(c.chatId));
      return next;
    });

    if (selectedIds.has(activeChatId)) setActiveChatId(null);

    setIsSelectMode(false);
    setSelectedIds(new Set());
    setIsDeleting(false);
  }, [selectedIds, isDeleting, activeChatId]);

  if (!globalChats.length) return null;

  const allSelected = selectedIds.size === globalChats.length;

  // Collapsed mode: show only pinned chats (all of them, no cap). Pinned-first
  // sort already applied above.
  const pinnedChats = globalChats.filter((c) => c.isPinned);
  const visibleChats = collapsed && !isSelectMode ? pinnedChats : globalChats;

  return (
    <div className="group/chats">
      {/* Section header */}
      {isSelectMode ? (
        <div className="px-2 py-2 mt-3 flex items-center gap-1.5">
          <button
            onClick={allSelected ? () => setSelectedIds(new Set()) : handleSelectAll}
            className="px-3 py-1 rounded-full text-[12px] font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>

          <button
            onClick={handleCancelSelect}
            className="px-3 py-1 rounded-full text-[12px] font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0 || isDeleting}
            className={`ml-auto px-3 py-1 rounded-full text-[12px] font-medium transition ${
              selectedIds.size > 0 && !isDeleting
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-red-900/30 text-red-400/50 cursor-not-allowed"
            }`}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      ) : (
        <div className="flex items-center px-1.5 py-2 mt-3 select-none">
          <span className="text-gray-500 dark:text-gray-400 text-[14px] font-medium tracking-wide cursor-default">
            Chats
          </span>
          {/* Collapse chevron — small, sits next to label, fades in on section hover */}
          <div className="relative hidden sm:flex items-center justify-center ml-1">
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="
                peer flex items-center justify-center p-0.5 rounded
                text-gray-400 dark:text-gray-500
                hover:text-gray-700 dark:hover:text-gray-200
                opacity-0 group-hover/chats:opacity-100
                transition-all duration-150
              "
              type="button"
            >
              <svg
                width="14" height="14" viewBox="0 0 16 16" fill="none"
                className={`transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                {/* Down (⌄) when open → rotates to right (›) when collapsed */}
                <polyline points="4 6 8 10 12 6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {visibleChats.map((c, idx) => (
        <ChatItem
          key={`global:${c.chatId || idx}`}
          chat={c}
          projId="global"
          isSelectMode={isSelectMode}
          isSelected={selectedIds.has(c.chatId)}
          onToggleSelect={handleToggleSelect}
          onEnterSelectMode={handleEnterSelectMode}
          onSidebarItemClick={onSidebarItemClick}
          onSelect={() => {
            setActiveProject(null);
            setActiveChatId(c.chatId);
            if (typeof onSidebarItemClick === "function") onSidebarItemClick();
          }}
        />
      ))}
    </div>
  );
}
