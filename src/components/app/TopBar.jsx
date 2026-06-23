"use client";

import AppModals from "./AppModals";
import { useContext } from "react";
import { useRouter } from "next/navigation";
import { UIContext } from "@/context/UIContext";
import { ChatContext } from "@/context/ChatContext";
import NewChatButton from "@/components/app/sidebar/NewChatButton";
import TopicSettingsMenu from "@/components/app/TopicSettingsMenu";
import Icon from "@/components/common/Icon";

// Tooltip — только на десктопе
const Tooltip = ({ children, content, position = "bottom" }) => (
  <div className="relative inline-flex flex-col items-center">
    {children}
    <div className={`
      absolute z-50
      ${position === "top" ? "bottom-full mb-2" : "top-full mt-2"}
      left-1/2 -translate-x-1/2
      bg-blue-600 text-white text-xs px-3 py-1 rounded-md shadow-xl
      opacity-0 peer-hover:opacity-100 transition-opacity duration-300
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
    theme,
  } = useContext(UIContext);

  const { activeProject, customProjects, setActiveChatId, activeChatId, projectChatSessions } = useContext(ChatContext);
  const router = useRouter();
  const activeProjectName = activeProject ? (customProjects?.[activeProject]?.name || null) : null;

  // Title of the chat currently open (for the desktop breadcrumb).
  const activeChatTitle = activeChatId
    ? (projectChatSessions?.[activeProject || "global"] || []).find((c) => c.chatId === activeChatId)?.title || ""
    : "";

  const goToTopic = () => {
    setActiveChatId(null);
    router.push(`/app/projects/${activeProject}`);
  };

  // На мобилке показываем таблетку только когда открыт чат топика (не просто страница топика)
  const showMobileTopicPill = !!(activeProjectName && activeChatId);

  return (
    <header className="relative h-[60px] flex items-center justify-between bg-[var(--bg-topbar)] pl-0 pr-4 md:px-4 z-30">

      {/* ── Левый блок ── */}
      <div className="flex items-center gap-2">
        {/* Мобилка: гамбургер — открывает/закрывает sidebar */}
        <button
          onClick={toggleSidebar}
          className="p-2.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 [@media(hover:hover)]:hidden"
          aria-label={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
        >
          <svg
            className="h-7 w-7 text-gray-800 dark:text-gray-200"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Desktop breadcrumb — where am I: Topic › Chat (works with the sidebar
            open or collapsed). */}
        {activeChatId && (
          <div className="hidden [@media(hover:hover)]:flex items-center gap-1.5 min-w-0 max-w-[460px] text-sm">
            {activeProjectName && (
              <>
                <button
                  onClick={goToTopic}
                  className="flex items-center gap-1 min-w-0 max-w-[200px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  aria-label={`Go to topic ${activeProjectName}`}
                >
                  <Icon name="folder-open" size={15} className="text-emerald-400/70 flex-shrink-0" />
                  <span className="truncate">{activeProjectName}</span>
                </button>
                <span className="text-gray-300 dark:text-white/25 flex-shrink-0">/</span>
              </>
            )}
            <span className="flex items-center gap-1 min-w-0 text-gray-800 dark:text-white/85">
              <Icon name="chat" size={15} className="opacity-50 flex-shrink-0" />
              <span className="truncate font-medium">{activeChatTitle || "New chat"}</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Центр: Логотип — только мобилка (на десктопе он в сайдбаре) ── */}
      <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-200 [@media(hover:hover)]:hidden ${
        showMobileTopicPill || activeProject ? "opacity-0" : "opacity-100"
      }`}>
        <img
          src={theme === "dark" ? "/logo-navi.png" : "/logo-navi black.png"}
          alt="NaviMind AI"
          className="w-[170px] h-auto object-contain"
        />
      </div>

      {/* ── Центр: Таблетка топика — только мобилка, только внутри чата топика ── */}
      {showMobileTopicPill && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [@media(hover:hover)]:hidden">
          <button
            onClick={() => {
              setActiveChatId(null);
              router.push(`/app/projects/${activeProject}`);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
              border border-emerald-500/40 bg-emerald-500/[0.07]
              hover:border-emerald-400/65 hover:bg-emerald-500/[0.13]
              active:bg-emerald-500/20
              focus:outline-none
              transition-all duration-200 max-w-[180px]"
            style={{ boxShadow: "0 0 10px rgba(16,185,129,0.12)" }}
            aria-label={`Go to topic ${activeProjectName}`}
          >
            <Icon name="folder-open" size={14} className="text-emerald-400/70 flex-shrink-0" />
            <span className="text-gray-700 dark:text-white/70 truncate">{activeProjectName}</span>
          </button>
        </div>
      )}

      {/* ── Правый блок ── */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Vessel profile pill — только десктоп */}
        {vesselProfileData && (
          <button
            onClick={() => setVesselProfileOpen(true)}
            className="hidden [@media(hover:hover)]:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
              border border-blue-500/35 bg-blue-500/[0.07]
              hover:border-blue-400/60 hover:bg-blue-500/[0.13]
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
              transition-all duration-200 group"
            style={{ boxShadow: "0 0 14px rgba(59,130,246,0.10)" }}
            aria-label="Open Vessel Profile"
          >
            <span className="text-gray-700 dark:text-white/80 font-normal">{vesselProfileData.rank}</span>
            <span className="text-gray-300 dark:text-white/25 mx-0.5">·</span>
            <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
              {vesselProfileData.vesselType === "Offshore" && vesselProfileData.offshoreType
                ? vesselProfileData.offshoreType
                : vesselProfileData.vesselType}
            </span>
          </button>
        )}

        {/* NewChatButton — только мобилка и НЕ внутри топика */}
        {!activeProject && (
          <div className="flex [@media(hover:hover)]:hidden">
            <NewChatButton />
          </div>
        )}

        {/* Topic settings gear — only inside a topic (desktop + mobile) */}
        <TopicSettingsMenu />
      </div>

      <AppModals />
    </header>
  );
}
