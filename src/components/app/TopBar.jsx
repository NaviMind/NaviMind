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
    vesselProfileData,
    setVesselProfileOpen,
  } = useContext(UIContext);

  const router = useRouter();

  const handleNewChat = () => router.push("/");

  return (
    <header className="relative h-[60px] flex items-center justify-between bg-[var(--bg-topbar)] shadow px-4 z-30" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
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

      {/* Правый блок: vessel pill (desktop) + NewChat (mobile) */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Vessel profile pill — desktop only */}
        {vesselProfileData && (
          <button
            onClick={() => setVesselProfileOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
              border border-blue-500/35 bg-blue-500/[0.07]
              hover:border-blue-400/60 hover:bg-blue-500/[0.13]
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
              transition-all duration-200 group"
            style={{ boxShadow: "0 0 14px rgba(59,130,246,0.10)" }}
            aria-label="Open Vessel Profile"
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 group-hover:bg-blue-300 transition-colors shrink-0" />
            <span className="text-white/80 font-normal">{vesselProfileData.rank}</span>
            <span className="text-white/25 mx-0.5">·</span>
            <span className="text-gray-400 group-hover:text-gray-300 transition-colors">{vesselProfileData.vesselType}</span>
          </button>
        )}

        {/* NewChatButton только на мобилке */}
        <div className="flex sm:hidden">
          <NewChatButton />
        </div>
      </div>
      <AppModals />
    </header>
  );
}
