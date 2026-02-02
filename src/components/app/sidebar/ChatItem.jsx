"use client";

import React, { useContext, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";
import ChatOptionsDropdown from "@/components/app/ChatOptionsDropdown";
import { renameChatInFirestore } from "@/firebase/chatStore";
import { auth } from "@/firebase/config";

function ChatItem({ chat, projId, route, onSidebarItemClick, nested = false }) {
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

  const handleRename = async () => {
  const newTitle = renameText.trim();
  if (!newTitle) return;

  const user = auth.currentUser;
  if (user) {
    await renameChatInFirestore(user.uid, chat.chatId, newTitle); // 🧠 Firestore
  }

  renameChat(chat.chatId, newTitle); // 🧠 Context
  setRenamingId(null);
};

if (!chat.title) return null;

  return (
    <div
  key={chat.chatId}
  className={`
    group relative flex items-center px-3 py-1 rounded-md transition-all duration-200
    ${isActive
      ? "bg-white/10 text-white"
      : "hover:bg-white/5 hover:text-gray-200"}
  `}
  style={{ minHeight: 42 }}
>
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
      className="flex-1 bg-white dark:bg-gray-800 px-2 py-1 rounded text-sm text-gray-900 dark:text-gray-100 outline-none"
      autoFocus
    />
  ) : (
    <button
      onClick={() => {
        openChatSession(chat.chatId, projId, router, route);
        onSidebarItemClick?.();
      }}
      className={`flex flex-1 min-w-0 items-center text-left ${nested ? "pl-[12px]" : ""}`}
    >
      <div className="flex items-center gap-2 w-full">
  <span className="truncate text-[15px]">{chatTitle || ""}</span>

  {chat.isPinned && (
    <img
      src="/Pin.svg"
      alt="Pinned"
      className="w-[18px] h-[18px] opacity-90 drop-shadow-[0_0_2px_rgba(255,255,255,0.3)] shrink-0"
      draggable="false"
    />
  )}
</div>
    </button>
  )}

  {!isBeingRenamed && (
    <button
      ref={anchorRef}
      onClick={(e) => {
        e.stopPropagation();
        setOpenMenu({ chatId: chat.chatId, anchorRef });
      }}
      className={`
        peer flex-shrink-0 ml-2 p-2 rounded-full
        bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700
        transition-opacity
        opacity-100 md:opacity-0 md:group-hover:opacity-100
        flex items-center justify-center
      `}
      aria-label="Show menu"
      type="button"
    >
      <img src="/More_Vert.svg" alt="More" className="w-4 h-4" draggable="false" />
    </button>
  )}

  {/* ⬇️ Hack: отключаем фон li/div, если ховер именно на peer */}
  <style jsx>{`
    .group:hover:has(.peer:hover) {
      background-color: transparent !important;
    }
  `}</style>

  <ChatOptionsDropdown
    chatId={chat.chatId}
    targetRef={anchorRef}
    isOpen={openMenu?.chatId === chat.chatId}
    currentTitle={chatTitle}
    onRename={(id) => {
      setRenameText(chat.title);
      setRenamingId(id);
      setOpenMenu(null);
    }}
    onDelete={handleDeleteChat}
    onShare={(id) => console.log("Share", id)}
    onClose={() => setOpenMenu(null)}
  />
</div>
  );
}

export default React.memo(ChatItem, (prevProps, nextProps) => {
  // 🔍 проверяем, нужно ли реально перерисовывать
  return (
    prevProps.chat.chatId === nextProps.chat.chatId &&
    prevProps.chat.title === nextProps.chat.title &&
    prevProps.activeChatId === nextProps.activeChatId
  );
});
