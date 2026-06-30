"use client";

import AppModals from "./AppModals";
import { useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { UIContext } from "@/context/UIContext";
import { ChatContext } from "@/context/ChatContext";
import NewChatButton from "@/components/app/sidebar/NewChatButton";
import TopicSettingsMenu from "@/components/app/TopicSettingsMenu";
import TopBarClock from "@/components/app/TopBarClock";
import Icon from "@/components/common/Icon";
import MaskIcon from "@/components/common/MaskIcon";
import HoverTip from "@/components/common/Tooltip";

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

  const { activeProject, customProjects, setActiveChatId, activeChatId, projectChatSessions, splitMode, enableSplit } = useContext(ChatContext);
  const router = useRouter();
  const pathname = usePathname();

  // "In a topic" needs a REAL topic id (not null and not the "global" sentinel
  // that a regular-chat click sets) AND a topic route. A chat click changes
  // activeProject without changing the URL, and route nav can leave a stale id —
  // this combination stays correct in every case.
  const onTopicRoute = !!pathname?.startsWith("/app/projects/");
  const topicId =
    onTopicRoute && activeProject && activeProject !== "global" ? activeProject : null;
  const inTopic = !!topicId;
  const activeProjectName = topicId ? (customProjects?.[topicId]?.name || null) : null;

  // Title of the chat currently open (for the desktop breadcrumb).
  const activeChatTitle = activeChatId
    ? (projectChatSessions?.[topicId || "global"] || []).find((c) => c.chatId === activeChatId)?.title || ""
    : "";

  const goToTopic = () => {
    setActiveChatId(null);
    if (topicId) router.push(`/app/projects/${topicId}`);
  };

  // На мобилке показываем таблетку только когда открыт чат топика (не просто страница топика)
  const showMobileTopicPill = !!(inTopic && activeChatId);

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
                  className="flex items-center gap-1.5 min-w-0 max-w-[200px] -ml-1.5 px-2 py-1 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors"
                  aria-label={`Go to topic ${activeProjectName}`}
                >
                  <Icon name="folder-open" size={20} className="opacity-80 flex-shrink-0" />
                  <span className="truncate text-[15px] font-semibold">{activeProjectName}</span>
                </button>
                <span className="w-px h-3.5 bg-gray-300 dark:bg-white/20 flex-shrink-0 mx-0.5" />
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
        showMobileTopicPill || inTopic ? "opacity-0" : "opacity-100"
      }`}>
        {/* Both rendered; the .dark class (set before paint) toggles visibility
            — avoids the theme-state hydration flash on refresh. */}
        <img
          src="/logo-navi black.png"
          alt="NaviMind AI"
          className="w-[170px] h-auto object-contain block dark:hidden"
        />
        <img
          src="/logo-navi.png"
          alt="NaviMind AI"
          className="w-[170px] h-auto object-contain hidden dark:block"
        />
      </div>

      {/* ── Центр: Таблетка топика — только мобилка, только внутри чата топика ── */}
      {showMobileTopicPill && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [@media(hover:hover)]:hidden">
          <button
            onClick={goToTopic}
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
        {/* Live UTC + local clock (desktop) */}
        <TopBarClock />

        {/* Vessel profile pill — desktop only, and hidden while split is active
            (the breadcrumb topic/chat is more useful there and space is tight). */}
        {vesselProfileData && !splitMode && (
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
        {!inTopic && (
          <div className="flex [@media(hover:hover)]:hidden">
            <NewChatButton />
          </div>
        )}

        {/* Split screen — desktop only; pin the current chat to a second pane.
            Only the ENTER control lives here; exiting is done from the right
            pane's header button, so we hide this while split is active. */}
        {activeChatId && !splitMode && (
          <HoverTip content="Split screen" position="bottom" align="right">
            <button
              onClick={() => enableSplit(activeChatId, activeProject)}
              aria-label="Split screen"
              className="hidden [@media(hover:hover)]:flex items-center justify-center w-9 h-9 rounded-full transition-colors text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white"
            >
              <MaskIcon src="/Split_scene.svg" size={20} />
            </button>
          </HoverTip>
        )}

        {/* Topic settings gear — only inside a topic (desktop + mobile) */}
        <TopicSettingsMenu />
      </div>

      <AppModals />
    </header>
  );
}
