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
    <div>
      {/* Section header */}
      {isSelectMode ? (
        <div className="px-3 py-2 mt-3 flex items-center gap-2 text-[13px]">
          <span className="text-gray-600 dark:text-gray-300 font-medium min-w-[70px]">
            {selectedIds.size} selected
          </span>

          <button
            onClick={allSelected ? () => setSelectedIds(new Set()) : handleSelectAll}
            className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition ml-auto"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>

          <button
            onClick={handleCancelSelect}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition px-1"
          >
            Cancel
          </button>

          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0 || isDeleting}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              selectedIds.size > 0 && !isDeleting
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-red-900/30 text-red-400/50 cursor-not-allowed"
            }`}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      ) : (
        <div className="group/chats flex items-center px-1.5 py-2 mt-3 select-none">
          <span className="text-gray-500 dark:text-gray-400 text-[14px] font-medium tracking-wide cursor-default">
            Chats
          </span>
          {/* Collapse chevron — desktop hover only */}
          <div className="ml-auto relative hidden sm:flex items-center justify-center">
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="
                peer flex items-center justify-center w-7 h-7 rounded
                opacity-0 group-hover/chats:opacity-100
                hover:bg-gray-200 dark:hover:bg-gray-700
                transition-all duration-150
              "
              type="button"
            >
              <svg
                width="16" height="16" viewBox="0 0 16 16" fill="none"
                className={`text-gray-500 dark:text-gray-400 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <polyline points="4 10 8 6 12 10" />
              </svg>
            </button>
            <div className="pointer-events-none absolute top-full mt-1 right-0 px-2 py-[2px] text-xs bg-blue-600 text-white rounded shadow opacity-0 peer-hover:opacity-100 transition-opacity z-[200] whitespace-nowrap">
              {collapsed ? "Show all chats" : "Hide chats"}
            </div>
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
