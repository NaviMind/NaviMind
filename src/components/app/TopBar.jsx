"use client";

import AppModals from "./AppModals";
import { useContext } from "react";
import { useRouter } from "next/navigation";
import { UIContext } from "@/context/UIContext";
import NewChatButton from "@/components/app/sidebar/NewChatButton"; 

// Tooltip — показываем только на десктопе
const Tooltip = ({ children, content, position = "bottom" }) => (
  <div className="relative group flex flex-col items-center">
    {children}
    <div className={`
      absolute z-50
      ${position === "top" ? "bottom-full mb-2" : "top-full mt-2"}
      left-1/2 -translate-x-[18px]
      bg-blue-600 text-white text-xs px-3 py-1 rounded-md shadow-xl
      opacity-0 group-hover:opacity-100 transition-opacity duration-300
      pointer-events-none whitespace-nowrap
      hidden md:block
    `}>
      {content}
    </div>
  </div>
);

export default function TopBar() {
  const {
    isSidebarOpen,
    toggleSidebar,
  } = useContext(UIContext);

  const router = useRouter();

  const handleNewChat = () => router.push("/");

  return (
    <header className="relative h-[60px] flex items-center justify-between bg-[#0b1220] shadow px-4 z-30">
      {/* Левый блок: New Chat (desktop) + Open Sidebar (гамбургер) */}
      {!isSidebarOpen && (
        <div className="flex items-center space-x-2">
          {/* New Chat — только на десктопе */}
<div className="hidden md:block">
  <NewChatButton />
</div>
          {/* Open Sidebar (гамбургер) — всегда */}
          <div>
            <Tooltip content="Open Sidebar" position="bottom">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Open Sidebar"
              >
                <svg
                  className="h-6 w-6 text-gray-800 dark:text-gray-200"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Центр: Логотип */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <img src="/logo-navi.png" alt="NaviMind AI" className="w-[170px] md:w-[220px] h-auto object-contain" />
      </div>

      {/* Правый блок: UserAvatar (desktop) + NewChat (mobile) */}
      <div className="flex items-center space-x-4 ml-auto">
        {/* NewChatButton только на мобилке */}
        <div className="flex sm:hidden">
          <NewChatButton />
        </div>
      </div>
      <AppModals />
    </header>
  );
}
