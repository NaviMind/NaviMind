"use client";

import { useContext, useEffect, useState, useMemo } from "react";
import { ChatContext } from "@/context/ChatContext";
import { UIContext } from "@/context/UIContext";

export default function DebugStateBar() {
  // локальный флаг
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setEnabled(localStorage.getItem("NM_DEBUG") === "1");
    }
  }, []);

  // хуки вызываем всегда!
  const chatCtx = useContext(ChatContext) || {};
  const uiCtx = useContext(UIContext) || {};

  const {
    activeProject,
    activeChatId,
    topics = [],
    chats = [],
    messages = [],
  } = chatCtx;

  const { isSidebarOpen } = uiCtx;

  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";

  const stats = useMemo(
    () => ({
      topicCount: Array.isArray(topics) ? topics.length : 0,
      chatCount: Array.isArray(chats) ? chats.length : 0,
      msgCount: Array.isArray(messages) ? messages.length : 0,
    }),
    [topics, chats, messages]
  );

  // проверка на включённость флага — только здесь
  if (!enabled) {
    return null;
  }

  return (
    <div
      className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[9999] 
                 rounded border px-3 py-1 text-xs 
                 bg-black/80 text-white border-white/20
                 shadow-lg backdrop-blur"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="opacity-80">DBG</span>
        <span>route: <b>{pathname}</b></span>
        <span>sidebar: <b>{isSidebarOpen ? "open" : "closed"}</b></span>
        <span>project: <b>{activeProject || "—"}</b></span>
        <span>chat: <b>{activeChatId || "—"}</b></span>
        <span>topics: <b>{stats.topicCount}</b></span>
        <span>chats: <b>{stats.chatCount}</b></span>
        <span>msgs: <b>{stats.msgCount}</b></span>
      </div>
    </div>
  );
}
