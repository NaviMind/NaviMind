"use client";

import { useContext, useRef, useState, useEffect, createRef } from "react";
import { useParams } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";
import ChatMessage from "@/components/app/ChatMessage";
import ChatOptionsDropdown from "@/components/app/ChatOptionsDropdown";
import ChatArea from "@/components/app/ChatArea";

export default function DynamicProjectPage() {
  const { project } = useParams();
  const {
    activeProject,
    activeChatId,
    setActiveProject,
    setActiveChatId,
    renameChat,
    deleteChat,
    projectChatSessions,
    getActiveChatSession,
    customProjects,
  } = useContext(ChatContext);

  const chat = getActiveChatSession();
  const hasChat = chat && Array.isArray(chat.messages) && chat.messages.length > 0;
  const chats = projectChatSessions?.[project] || [];

  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const anchorRefs = useRef({});

  useEffect(() => {
    const cancel = (e) => {
      if (renamingId) {
        const input = document.getElementById("rename-input-" + renamingId);
        if (input && !input.contains(e.target)) setRenamingId(null);
      }
    };
    document.addEventListener("mousedown", cancel);
    return () => document.removeEventListener("mousedown", cancel);
  }, [renamingId]);

  // Функция удаления чата
  const handleDeleteChat = (chatId) => {
    deleteChat(chatId);
    if (activeChatId === chatId) setActiveChatId(null);
    setOpenMenu(null);
  };

  const fullTitle = (t = "") => {
    const words = t.trim().split(/\s+/).slice(0, 10).join(" ");
    return words.length > 80 ? words.slice(0, 80) + "…" : words || "Untitled Chat";
  };

  useEffect(() => {
  if (!activeProject && project) {
    setActiveProject(project);
  }
}, []);

  // Получение названия проекта (My Topics)
  const currentProjectName =
    customProjects?.[project]?.name ||
    project.charAt(0).toUpperCase() + project.slice(1);

  if (hasChat) {
    return (
      <ChatArea messages={chat.messages}/>
    );
  }

  return (
    <main className="w-full flex flex-col items-center py-6 px-4 overflow-y-auto custom-scroll">
      <div className="w-full max-w-4xl mb-6 flex flex-col items-start pl-[19px]">
        <div className="flex items-center w-full group relative">
          <img
            src="/folder-open.svg"
            alt="Folder"
            className="w-6 h-6 mr-2 flex-shrink-0"
            draggable="false"
          />
           {/* Название проекта — адаптивный размер */}
          <span
            className="block w-full text-[15px] whitespace-normal break-words leading-20t"
            style={{
              fontSize: "clamp(1rem, 4vw, 1.5rem)", // чуть компактнее для мобилы
              maxWidth: "70vw",
              lineHeight: 1.2,
            }}
          >
            {currentProjectName}
            </span>
        </div>
      </div>

      {/* Список чатов — только если expanded */}
      <div className="w-full max-w-4xl mb-6">
        {!expanded ? null : chats.length === 0 ? (
          <p className="italic mt-2 text-gray-500 dark:text-gray-400 text-sm sm:text-base pl-5">
            No chats yet. Start a new chat to begin your discussion about this topic.
          </p>
        ) : (
          <ul className="space-y-2">
            {chats.map((c) => {
              if (!anchorRefs.current[c.chatId]) {
                anchorRefs.current[c.chatId] = createRef();
              }
              const anchorRef = anchorRefs.current[c.chatId];
              const isDropdownOpen = openMenu?.chatId === c.chatId;
              const isBeingRenamed = renamingId === c.chatId;

              return (
               <li
  key={c.chatId}
  className={`group relative flex items-center justify-between px-3 py-1 rounded-lg transition-all
    ${
      isDropdownOpen || isBeingRenamed
        ? "bg-gray-700/60"
        : "hover:bg-gray-700/40"
    }`}
  style={{ minHeight: 36 }}
>
  {isBeingRenamed ? (
    <input
      id={"rename-input-" + c.chatId}
      type="text"
      value={renameText}
      onChange={(e) => setRenameText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && renameText.trim()) {
          renameChat(c.chatId, renameText.trim());
          setRenamingId(null);
        } else if (e.key === "Escape") {
          setRenamingId(null);
        }
      }}
      autoFocus
      className="flex-1 w-full bg-white dark:bg-gray-800 px-2 py-1 rounded text-sm text-gray-900 dark:text-gray-100 outline-none"
    />
  ) : (
    <button
      onClick={() => setActiveChatId(c.chatId)}
      className="flex-1 text-left truncate px-2 py-1 pr-8 text-[15px] sm:text-base"
      style={{ maxWidth: "82vw", lineHeight: 1.25 }}
    >
      {fullTitle(c.title)}
    </button>
  )}

  {/* --- ТРИ ТОЧКИ --- */}
  {renamingId !== c.chatId && (
    <button
      ref={anchorRef}
      onClick={(e) => {
        e.stopPropagation();
        setOpenMenu({
          chatId: c.chatId,
          anchorRef,
          currentTitle: c.title,
        });
      }}
      className={`
        peer absolute right-2 p-2 rounded-full
        flex items-center justify-center
        bg-transparent hover:bg-gray-300 dark:hover:bg-gray-600
        transition
        opacity-100
        md:opacity-0 md:group-hover:opacity-100
      `}
      aria-label="Chat options"
    >
      <img
        src="/More_Vert.svg"
        alt="More"
        className="h-4 w-4"
        draggable="false"
      />
    </button>
  )}

  {/* гасим фон у li, если ховер на peer (три точки) */}
  <style jsx>{`
    li:hover:has(.peer:hover) {
      background-color: transparent !important;
    }
  `}</style>

  <ChatOptionsDropdown
    chatId={c.chatId}
    currentTitle={c.title}
    targetRef={anchorRef}
    isOpen={isDropdownOpen}
    onShare={() => setOpenMenu(null)}
    onRename={() => {
      setRenameText(c.title);
      setRenamingId(c.chatId);
      setOpenMenu(null);
    }}
    onDelete={() => handleDeleteChat(c.chatId)}
    onClose={() => setOpenMenu(null)}
  />
</li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}