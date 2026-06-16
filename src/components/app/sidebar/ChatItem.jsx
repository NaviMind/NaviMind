"use client";

import React, { useContext, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";
import ChatOptionsDropdown from "@/components/app/ChatOptionsDropdown";
import { renameChatInFirestore, togglePinChat } from "@/firebase/chatStore";
import { auth } from "@/firebase/config";
import Icon from "@/components/common/Icon";

function ChatItem({
  chat,
  projId,
  route,
  onSidebarItemClick,
  nested = false,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  onEnterSelectMode,
}) {
  const router = useRouter();
  const {
    activeChatId,
    setActiveChatId,
    openChatSession,
    renameChat,
    setProjectChatSessions,
  } = useContext(ChatContext);

  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState("");
  const [openMenu, setOpenMenu] = useState(null);

  const anchorRef = useRef(null);

  const isActive = chat.chatId === activeChatId;
  const isBeingRenamed = renamingId === chat.chatId;
  const chatTitle = chat.title?.trim()
  ? chat.title
  : "";

  useEffect(() => {
    const cancel = (e) => {
      if (renamingId) {
        const input = document.getElementById("rename-input-" + renamingId);
        if (input && !input.contains(e.target)) {
          setRenamingId(null);
        }
      }
    };
    document.addEventListener("mousedown", cancel);
    return () => document.removeEventListener("mousedown", cancel);
  }, [renamingId]);

  const handleDeleteChat = (chatId) => {
    setProjectChatSessions((prev) => {
      const next = {};
      Object.entries(prev).forEach(([projKey, chats]) => {
        const filtered = chats.filter((c) => c.chatId !== chatId);
        next[projKey] = filtered;
      });
      if (activeChatId === chatId) setActiveChatId(null);
      return next;
    });
  };

  const effectiveTopicId = projId && projId !== "global" ? projId : null;

  const handleTogglePin = async () => {
    const user = auth.currentUser;
    if (!user) return;
    await togglePinChat(user.uid, chat.chatId, effectiveTopicId);
  };

  const handleRename = async () => {
  const newTitle = renameText.trim();
  if (!newTitle) return;

  const user = auth.currentUser;
  if (user) {
    await renameChatInFirestore(user.uid, chat.chatId, newTitle, effectiveTopicId);
  }

  renameChat(chat.chatId, newTitle);
  setRenamingId(null);
};

if (!chat.title) return null;

  return (
    <div
      key={chat.chatId}
      className={`
        group relative flex items-center px-1.5 py-0.5 my-px rounded-lg transition-all duration-200
        ${isSelectMode && isSelected ? "bg-blue-50 dark:bg-white/10" : ""}
        ${!isSelectMode && isActive ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white" : ""}
        ${!isSelectMode && !isActive ? "hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200" : ""}
        ${isSelectMode ? "cursor-pointer" : ""}
      `}
      style={{ minHeight: 34 }}
      onClick={isSelectMode ? () => onToggleSelect?.(chat.chatId) : undefined}
    >
      {/* Checkbox in select mode */}
      {isSelectMode && (
        <div className="flex-shrink-0 mr-2 flex items-center justify-center">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected
              ? "bg-blue-500 border-blue-500"
              : "border-gray-500"
          }`}>
            {isSelected && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>
      )}

      {isBeingRenamed ? (
        <input
          id={"rename-input-" + chat.chatId}
          type="text"
          value={renameText ?? ""}
          onChange={(e) => setRenameText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            else if (e.key === "Escape") setRenamingId(null);
          }}
          onBlur={handleRename}
          className="flex-1 bg-transparent border-b-2 border-blue-500 px-1 py-0.5 text-[15px] text-gray-900 dark:text-gray-100 outline-none"
          autoFocus
        />
      ) : (
        <button
          onClick={isSelectMode ? undefined : () => {
            openChatSession(chat.chatId, projId, router, route);
            onSidebarItemClick?.();
          }}
          className={`flex flex-1 min-w-0 items-center text-left ${nested ? "pl-[12px]" : ""}`}
          tabIndex={isSelectMode ? -1 : 0}
        >
          <span className="truncate text-[15px]">{chatTitle || ""}</span>
        </button>
      )}

      {chat.isPinned && !isBeingRenamed && !isSelectMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleTogglePin();
          }}
          className="group/pin flex-shrink-0 mx-1 flex items-center justify-center transition-all duration-150 md:opacity-0 md:group-hover:opacity-100"
          aria-label="Unpin chat"
          type="button"
        >
          {/* Pinned (default) */}
          <Icon
            name="pin"
            size={16}
            className="opacity-70 drop-shadow-[0_0_2px_rgba(255,255,255,0.3)] group-hover/pin:hidden"
          />
          {/* Unpin (on hover) — soft glow, no hover box */}
          <Icon
            name="unpin"
            size={16}
            className="hidden group-hover/pin:block text-blue-400 dark:text-blue-300 drop-shadow-[0_0_5px_rgba(59,130,246,0.55)]"
          />
        </button>
      )}

      {!isBeingRenamed && !isSelectMode && (
        <button
          ref={anchorRef}
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenu({ chatId: chat.chatId, anchorRef });
          }}
          className={`
            peer flex-shrink-0 ml-2 p-1.5
            text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
            transition-all
            opacity-100 md:opacity-0 md:group-hover:opacity-100
            flex items-center justify-center
          `}
          aria-label="Show menu"
          type="button"
        >
          <Icon name="more-vert" size={16} />
        </button>
      )}

      {/* Hack: disable hover bg when hovering the three-dot menu */}
      <style jsx>{`
        .group:hover:has(.peer:hover) {
          background-color: transparent !important;
        }
      `}</style>

      {!isSelectMode && (
        <ChatOptionsDropdown
          chatId={chat.chatId}
          topicId={effectiveTopicId}
          targetRef={anchorRef}
          isOpen={openMenu?.chatId === chat.chatId}
          currentTitle={chatTitle}
          initialIsPinned={!!chat.isPinned}
          onEnterSelectMode={() => {
            onEnterSelectMode?.(chat.chatId);
            setOpenMenu(null);
          }}
          onRename={(id) => {
            setRenameText(chat.title);
            setRenamingId(id);
            setOpenMenu(null);
          }}
          onDelete={handleDeleteChat}
          onShare={(id) => console.log("Share", id)}
          onClose={() => setOpenMenu(null)}
        />
      )}
    </div>
  );
}

export default React.memo(ChatItem, (prev, next) =>
  prev.chat.chatId === next.chat.chatId &&
  prev.chat.title === next.chat.title &&
  prev.chat.isPinned === next.chat.isPinned &&
  prev.isSelectMode === next.isSelectMode &&
  prev.isSelected === next.isSelected
);
