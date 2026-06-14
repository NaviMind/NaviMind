"use client";

import { useContext } from "react";
import { useRouter } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";

export default function NewChatButton({ onSidebarItemClick, variant = "icon" }) {
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

  const NewChatIcon = () => (
    <svg
      className="h-5 w-5 text-gray-800 dark:text-white"
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
  );

  // Full-width labeled row — matches Vessel Profile / Create Topic buttons
  if (variant === "full") {
    return (
      <button
        onClick={handleNewChat}
        className="
          w-full flex items-center gap-2 px-5 py-1 rounded-md
          border border-transparent
          bg-transparent
          hover:border-blue-500
          focus:outline-none focus:ring-2 focus:ring-blue-500
          transition-colors duration-200 min-h-[38px]
        "
      >
        <NewChatIcon />
        <span className="ml-[5px] text-[15px] font-normal text-gray-900 dark:text-gray-100">
          New Chat
        </span>
      </button>
    );
  }

  return (
    <div className="relative inline-flex flex-col items-center">
      <button
        onClick={handleNewChat}
        className="peer p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <svg
          className="h-5 w-5 text-gray-800 dark:text-white"
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
      <div className="pointer-events-none absolute top-full mt-2 px-2 py-[2px] text-xs bg-blue-600 text-white rounded shadow opacity-0 peer-hover:opacity-100 transition-opacity z-[100] whitespace-nowrap hidden sm:block">
        New Chat
      </div>
    </div>
  );
}
