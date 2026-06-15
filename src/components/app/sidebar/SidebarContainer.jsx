"use client";

import { useContext, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import TopicModal from "./TopicModal";
import { useRouter } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";
import { UIContext } from "@/context/UIContext";
import { createUserTopic, updateTopicDescription } from "@/firebase/chatStore";
import { auth } from "@/firebase/config";
import SidebarSectionTitle from "./SidebarSectionTitle";
import MyTopicsSection from "./MyTopicsSection";
import NewChatButton from "./NewChatButton";
import ChatListSection from "./ChatListSection";
import UserProfileButton from "./UserProfileButton";
import VesselProfileModal from "./Vessel-Profile";
import Icon from "@/components/common/Icon";


// Tooltip rendered to the RIGHT of its trigger via a portal, so it escapes
// the sidebar card's overflow-hidden (same language as MiniSidebar tooltips).
function HoverTipRight({ label, children, className = "" }) {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ top: r.top + r.height / 2, left: r.right + 10 });
  };
  const hide = () => setPos(null);

  return (
    <div
      ref={ref}
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {pos &&
        createPortal(
          <div
            className="fixed z-[9999] px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded-md shadow-lg pointer-events-none whitespace-nowrap hidden sm:block"
            style={{ top: pos.top, left: pos.left, transform: "translateY(-50%)" }}
          >
            {label}
          </div>,
          document.body
        )}
    </div>
  );
}

export default function SidebarContainer({
  mobileMode = false,
  isSidebarOpen,
  toggleSidebar,
}) {
  const router = useRouter();
  const ui = useContext(UIContext);
  const { isVesselProfileOpen, setVesselProfileOpen, vesselProfileData, isTopicModalOpen, setIsTopicModalOpen, theme } = ui;
  const { customProjects, projectChatSessions } = useContext(ChatContext);
  const [topicName, setTopicName] = useState("");
  const [topicInstruction, setTopicInstruction] = useState("");
  const [topicsCollapsed, setTopicsCollapsed] = useState(false);

// === Swipe gesture detection (mobile) ===
const startXRef = useRef(0);
const lastXRef = useRef(0);
const SWIPE_THRESHOLD = 80;

// универсальные помощники открытия/закрытия (с учётом mobileMode)
const isOpenNow = () => (mobileMode ? !!isSidebarOpen : !!ui.isSidebarOpen);
const toggleNow = () => (toggleSidebar ? toggleSidebar() : ui.toggleSidebar());

const openSidebar = () => {
  if (!isOpenNow()) toggleNow();
};

const closeSidebar = () => {
  if (isOpenNow()) toggleNow();
};

useEffect(() => {
  if (!mobileMode) return; // свайпы нужны только на мобайле

  const onStart = (e) => {
    const x = e.touches?.[0]?.clientX ?? 0;
    startXRef.current = x;
    lastXRef.current = x;
  };

  const onMove = (e) => {
    lastXRef.current = e.touches?.[0]?.clientX ?? lastXRef.current;
  };

  const onEnd = () => {
    const dx = lastXRef.current - startXRef.current;
    if (dx > SWIPE_THRESHOLD) {
      openSidebar();   // свайп вправо → открыть
    } else if (dx < -SWIPE_THRESHOLD) {
      closeSidebar();  // свайп влево → закрыть
    }
  };

  // пассивные слушатели — не ломают скролл
  document.addEventListener("touchstart", onStart, { passive: true });
  document.addEventListener("touchmove", onMove, { passive: true });
  document.addEventListener("touchend", onEnd);

  return () => {
    document.removeEventListener("touchstart", onStart);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
  };
}, [mobileMode]); 

  const handleCloseSidebar = toggleSidebar || ui.toggleSidebar;

  // Универсальный шаблон для sidebar с кнопкой внизу
  const SidebarContent = ({
     showNewChatButton = true,
     showCloseButton = true,
     onSidebarItemClick, 
     onCloseButtonClick, 
     showUserProfileButton = true,
  }) => (
    <div className="flex flex-col h-full">
      {/* Desktop logo — full-width accent block */}
      {!mobileMode && (
        <div className="flex items-center justify-between pl-1.5 pr-3 pt-4 pb-2">
          <img
            src={theme === "dark" ? "/logo-navi.png" : "/logo-navi black.png"}
            alt="NaviMind"
            className="h-[44px] w-auto object-contain select-none pointer-events-none"
            draggable={false}
          />
          {showCloseButton && (
            <HoverTipRight label="Close Sidebar">
              <button
                onClick={onCloseButtonClick}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                aria-label="Close sidebar"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </HoverTipRight>
          )}
        </div>
      )}

      {/* Верхняя панель (mobile only) */}
     <div className={`relative flex items-center justify-between px-3 py-2 ${!mobileMode ? "hidden" : ""}`}>
        {/* Desktop: logo moved to block above */}

        {/* Mobile: New Chat icon (left) */}
        {mobileMode && showNewChatButton && (
          <NewChatButton onSidebarItemClick={onSidebarItemClick} />
        )}

        {/* Vessel profile pill — mobile sidebar, centered */}
        {mobileMode && vesselProfileData && (
          <button
            onClick={() => { setVesselProfileOpen(true); onSidebarItemClick?.(); }}
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
              border border-blue-500/35 bg-blue-500/[0.07]
              hover:border-blue-400/60 hover:bg-blue-500/[0.13]
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
              transition-all duration-200 group max-w-[170px]"
            style={{ boxShadow: "0 0 10px rgba(59,130,246,0.10)" }}
          >
            <span className="text-gray-700 dark:text-white/75 truncate">{vesselProfileData.rank}</span>
            <span className="text-gray-400 dark:text-white/25">·</span>
            <span className="text-gray-500 dark:text-gray-400 truncate">
              {vesselProfileData.vesselType === "Offshore" && vesselProfileData.offshoreType
                ? vesselProfileData.offshoreType
                : vesselProfileData.vesselType}
            </span>
          </button>
        )}

        {showCloseButton && (
          <div className="relative inline-flex flex-col items-center">
            <button
              onClick={mobileMode ? onSidebarItemClick : onCloseButtonClick}
              className="peer p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Close sidebar"
            >
              {mobileMode ? (
                <Icon name="close" size={24} />
              ) : (
                <svg
                  className="h-6 w-6 text-gray-800 dark:text-gray-200"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            {!mobileMode && (
              <div className="pointer-events-none absolute top-full mt-2 right-0 px-2 py-[2px] text-xs bg-blue-600 text-white rounded shadow opacity-0 peer-hover:opacity-100 transition-opacity z-[200] whitespace-nowrap">
                Close Sidebar
              </div>
            )}
          </div>
        )}
      </div>

{/* New Chat — full-width labeled row (desktop) */}
{!mobileMode && showNewChatButton && (
  <div className="pl-1 pr-[10px] py-0">
    <NewChatButton variant="full" onSidebarItemClick={onSidebarItemClick} />
  </div>
)}

{/* Vessel Profile + Create Topic moved into the scrollable content area below.
    Only New Chat stays fixed at the top. */}

{/* Плейсхолдер при отсутствии данных */}
{!Object.keys(customProjects || {}).length &&
 (!projectChatSessions?.global || !projectChatSessions.global.length) && (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="flex items-center text-[#9CA3AF] pointer-events-auto">
      <Icon name="chat-bubble" size={32} className="mr-3 opacity-80" />
      <div className="flex flex-col leading-tight text-left">
        <span className="text-[15px] font-medium">No chats yet.</span>
        <span className="text-[15px]">Just start typing.</span>
      </div>
    </div>
  </div>
)}


      {/* Контент */}
     <div className="flex-1 overflow-y-auto pt-0 px-2 pb-2 sidebar-scroll [scrollbar-gutter:stable]">

  {/* Vessel Profile (scrolls now) — -mx-2 cancels the px-2 outer so it aligns with New Chat above */}
  <div className="-mx-2 px-1 py-0">
    <button
      onClick={() => setVesselProfileOpen(true)}
      className="
        w-full flex items-center gap-2 px-2.5 py-1 rounded-md
        border border-transparent bg-transparent
        hover:border-blue-500
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        transition-colors duration-200 min-h-[38px]
      "
    >
      <Icon name="vessel-profile" size={20} />
      <span className="ml-[5px] text-[15px] font-normal text-gray-900 dark:text-gray-100">
        Vessel Profile
      </span>
    </button>
  </div>

  {/* No topics yet — show a classic full-width "Create Topic" button.
      Once the first topic exists, switch to the "My Topics" header + list.
      Deleting all topics reverts to the button. */}
  {Object.keys(customProjects || {}).length === 0 ? (
    <div className="-mx-2 px-1 py-0 mt-1">
      <button
        onClick={() => setIsTopicModalOpen(true)}
        className="
          w-full flex items-center gap-2 px-2.5 py-1 rounded-md
          border border-transparent bg-transparent
          hover:border-blue-500
          focus:outline-none focus:ring-2 focus:ring-blue-500
          transition-colors duration-200 min-h-[38px]
        "
      >
        <Icon name="create-new" size={20} />
        <span className="ml-[5px] text-[15px] font-normal text-gray-900 dark:text-gray-100">
          Create Topic
        </span>
      </button>
    </div>
  ) : (
  /* My Topics section — group wraps header + list so chevron reveals on hovering anywhere in the section */
  <div className="group/topics">
    <div className="flex items-center px-1.5 py-1 mt-1 select-none">
      <span className="text-gray-500 dark:text-gray-400 text-[14px] font-medium tracking-wide">
        My Topics
      </span>
      {/* Collapse chevron — small, sits next to label, fades in on section hover */}
      <div className="relative hidden sm:flex items-center justify-center ml-1">
        <button
          onClick={() => setTopicsCollapsed((v) => !v)}
          className="
            peer flex items-center justify-center p-0.5 rounded
            text-gray-400 dark:text-gray-500
            hover:text-gray-700 dark:hover:text-gray-200
            opacity-0 group-hover/topics:opacity-100
            transition-all duration-150
          "
          type="button"
        >
          <svg
            width="14" height="14" viewBox="0 0 16 16" fill="none"
            className={`transition-transform duration-200 ${topicsCollapsed ? "rotate-180" : ""}`}
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="4 10 8 6 12 10" />
          </svg>
        </button>
      </div>
      {/* Create topic (+) — always visible, pushed to the right edge */}
      <HoverTipRight label="Create topic" className="ml-auto items-center justify-center">
        <button
          onClick={() => setIsTopicModalOpen(true)}
          className="
            flex items-center justify-center w-7 h-7 rounded
            text-gray-400 dark:text-gray-500
            hover:text-gray-700 dark:hover:text-gray-200
            transition-colors duration-150
          "
          type="button"
          aria-label="Create topic"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
        </button>
      </HoverTipRight>
    </div>

    {!topicsCollapsed && <MyTopicsSection onSidebarItemClick={onSidebarItemClick} />}
    {topicsCollapsed && <MyTopicsSection onSidebarItemClick={onSidebarItemClick} collapsedMode />}
  </div>
  )}

  <ChatListSection onSidebarItemClick={onSidebarItemClick} />
</div>

      {/* Кнопка профиля — всегда внизу, всегда одна */}
     {showUserProfileButton && (
 <div className="px-3 pb-0">
    <UserProfileButton />
  </div>
)}

{mobileMode && (
  <div className="text-[9px] leading-none text-center text-gray-400 dark:text-gray-500 px-2 pt-0.5 pb-1.5 truncate">
    Powered by advanced AI – Maritime enhanced.
  </div>
)}
    </div>
  );

    // Мобильная версия как переменная
  // Sidebar не двигается — main area съезжает вправо, открывая его
  const MobileAside = (
  <aside
    className="fixed left-0 top-0 flex flex-col sm:hidden bg-[var(--bg-sidebar)] text-gray-900 dark:text-white"
    style={{
      height: "var(--app-height, 100dvh)",
      width: "calc(100vw - 3rem)",
      zIndex: 20,
      pointerEvents: isSidebarOpen ? "auto" : "none",
    }}
  >
    {SidebarContent({
      showNewChatButton: true,
      showCloseButton: false,
      onSidebarItemClick: handleCloseSidebar,
    })}
  </aside>
);

  // Десктоп-версия как переменная — floating card (same language as MiniSidebar)
  const DesktopAside = (
  <aside
    className="hidden sm:flex overflow-visible flex-shrink-0 h-full transition-[width] duration-300 ease-in-out text-gray-900 dark:text-white"
    style={{ width: ui.isSidebarOpen ? "18rem" : "0" }}
  >
    <div
      className="w-[18rem] h-full p-2 flex flex-col"
      style={{
        opacity: ui.isSidebarOpen ? 1 : 0,
        transition: ui.isSidebarOpen
          ? "opacity 180ms ease 160ms"   // открытие: сначала ширина, потом текст
          : "opacity 120ms ease",         // закрытие: текст исчезает сразу
      }}
    >
      {/* Floating card */}
      <div className="relative flex-1 flex flex-col min-h-0 rounded-2xl overflow-hidden
        bg-white/95 dark:bg-[#151e30]/95 backdrop-blur-md
        shadow-[0_4px_24px_rgba(0,0,0,0.09),0_1px_4px_rgba(0,0,0,0.05)]
        dark:shadow-[0_4px_28px_rgba(0,0,0,0.55)]
        ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
        {SidebarContent({
          showNewChatButton: true,
          showCloseButton: true,
          onCloseButtonClick: handleCloseSidebar,
        })}
      </div>
    </div>
    </aside>
  );

  // ЕДИНЫЙ return: сначала aside (мобилка или десктоп), затем TopicModal
  return (
    <>
      {mobileMode ? MobileAside : DesktopAside}

      <TopicModal
        open={isTopicModalOpen}
        topicName={topicName}
        setTopicName={setTopicName}
        topicInstruction={topicInstruction}
        setTopicInstruction={setTopicInstruction}
        onCreate={async () => {
          const name = topicName.trim();
          if (!name) return;
          try {
            const created = await createUserTopic(name);
            if (topicInstruction.trim() && created?.topicId) {
              const user = auth.currentUser;
              if (user) {
                await updateTopicDescription(user.uid, created.topicId, topicInstruction.trim());
              }
            }
          } catch (err) {
            console.error("Failed to create topic:", err);
          } finally {
            setIsTopicModalOpen(false);
            setTopicName("");
            setTopicInstruction("");
          }
        }}
        onClose={() => {
          setIsTopicModalOpen(false);
          setTopicName("");
          setTopicInstruction("");
        }}
      />
      
      <VesselProfileModal
  open={isVesselProfileOpen}
  onClose={() => setVesselProfileOpen(false)}
  onSave={(data) => {
  console.log("Vessel profile data:", data);
  setVesselProfileOpen(false);
}}
/>
    </>
  );
}
