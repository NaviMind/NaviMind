"use client";

import { useContext } from "react";
import { useRouter } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";

export default function NewChatButton({ onSidebarItemClick }) {
  const {
    setActiveProject,
    setActiveChatId,
    setMessages,
  } = useContext(ChatContext);

  const router = useRouter();

  const handleNewChat = () => {
    setActiveProject("global");
    setActiveChatId(null);
    setMessages([]);
    window.nextPrompt?.();
    onSidebarItemClick?.();
    router.push("/app");
  };

  return (
    <div className="relative group flex flex-col items-center">
      <button
        onClick={handleNewChat}
        className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <svg
          className="h-5 w-5 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M12 20h9" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="absolute top-full mt-2 px-2 py-[2px] text-xs bg-blue-600 text-white rounded shadow opacity-0 group-hover:opacity-100 transition-opacity z-[100] whitespace-nowrap translate-x-4 hidden sm:block">
        New Chat
      </div>
    </div>
  );
}
