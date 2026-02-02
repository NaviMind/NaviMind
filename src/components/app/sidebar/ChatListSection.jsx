"use client";

import { useContext } from "react";
import { useRouter } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";
import ChatItem from "./ChatItem";

export default function ChatListSection({ onSidebarItemClick }) {
  const router = useRouter();
  const {
    projectChatSessions,
    activeChatId,
    setActiveChatId,
    setActiveProject,
  } = useContext(ChatContext);

  const globalRaw = (projectChatSessions && projectChatSessions["global"]) || [];

  // ✅ Дедуп по chatId
  const seen = new Set();
  const unique = globalRaw.filter((c) => {
    const id = c?.chatId;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  // ✅ Сортировка по createdAt
  const toMillis = (v) =>
    typeof v === "number"
      ? v
      : v?.toMillis?.() ?? v?.seconds * 1000 ?? 0;

  // ✅ Сортировка: сначала pinned, потом по дате создания
const globalChats = unique.sort((a, b) => {
  if (a.isPinned === b.isPinned) {
    return toMillis(b.createdAt) - toMillis(a.createdAt);
  }
  return a.isPinned ? -1 : 1; // pinned чаты вверх
});

  if (!globalChats.length) return null;

  return (
    <div>
      <div className="px-[12px] py-2 mt-3 text-gray-400 dark:text-gray-400 text-[14px] font-medium tracking-wide cursor-default select-none">
        Chats
      </div>

      {globalChats.map((c, idx) => (
        <ChatItem
          key={`global:${c.chatId || idx}`}
          chat={c}
          projId="global"
          isActive={c.chatId === activeChatId}
          onSidebarItemClick={onSidebarItemClick}
          onSelect={() => {
  // 💥 Сброс проекта, чтобы выйти из топика
  setActiveProject(null);
  setActiveChatId(c.chatId);

  // 💥 Не надо router.push("/app")
  if (typeof onSidebarItemClick === "function") onSidebarItemClick();
}}
        />
      ))}
    </div>
  );
}
