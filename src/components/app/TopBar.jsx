"use client";

import AppModals from "./AppModals";
import { useContext } from "react";
import { useRouter } from "next/navigation";
import { UIContext } from "@/context/UIContext";
import { ChatContext } from "@/context/ChatContext";
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

  const { activeProject, customProjects } = useContext(ChatContext);
  const activeProjectName = activeProject ? (customProjects?.[activeProject]?.name || null) : null;

  const router = useRouter();

  const handleNewChat = () => router.push("/");

  return (
    <header className="relative h-[60px] flex items-center justify-between bg-[var(--bg-topbar)] px-4 z-30">
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

      {/* Правый блок: topic pill + vessel pill (desktop) + NewChat (mobile) */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Topic pill — desktop only, when inside a topic */}
        {activeProjectName && (
          <button
            onClick={() => router.push(`/app/projects/${activeProject}`)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
              border border-white/15 bg-white/[0.04]
              hover:border-white/30 hover:bg-white/[0.09]
              focus:outline-none focus:ring-2 focus:ring-white/20
              transition-all duration-200 max-w-[200px]"
            aria-label={`Go to topic ${activeProjectName}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50 flex-shrink-0">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="text-white/65 truncate">{activeProjectName}</span>
          </button>
        )}

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
            <span className="text-white/80 font-normal">{vesselProfileData.rank}</span>
            <span className="text-white/25 mx-0.5">·</span>
            <span className="text-gray-400 group-hover:text-gray-300 transition-colors">
              {vesselProfileData.vesselType === "Offshore" && vesselProfileData.offshoreType
                ? vesselProfileData.offshoreType
                : vesselProfileData.vesselType}
            </span>
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
