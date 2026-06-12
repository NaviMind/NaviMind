"use client";

import { useContext, useState, useRef, useEffect } from "react";
import TopicModal from "./TopicModal";
import { useRouter } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";
import { UIContext } from "@/context/UIContext";
import { createUserTopic } from "@/firebase/chatStore";
import SidebarSectionTitle from "./SidebarSectionTitle";
import MyTopicsSection from "./MyTopicsSection";
import NewChatButton from "./NewChatButton";
import ChatListSection from "./ChatListSection";
import UserProfileButton from "./UserProfileButton";
import VesselProfileModal from "./Vessel-Profile";
import Icon from "@/components/common/Icon";


export default function SidebarContainer({
  mobileMode = false,
  isSidebarOpen,
  toggleSidebar,
}) {
  const router = useRouter();
  const ui = useContext(UIContext);
  const { isVesselProfileOpen, setVesselProfileOpen, vesselProfileData } = ui;
  const { customProjects, projectChatSessions } = useContext(ChatContext);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [topicName, setTopicName] = useState("");

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
      {/* Верхняя панель */}
     <div className="flex items-center justify-between px-3 py-2">
        {showNewChatButton && (
          <NewChatButton onSidebarItemClick={onSidebarItemClick} />
        )}

        {/* Vessel profile pill — mobile sidebar center, shown when profile saved */}
        {mobileMode && vesselProfileData && (
          <button
            onClick={() => { setVesselProfileOpen(true); onSidebarItemClick?.(); }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
              border border-blue-500/35 bg-blue-500/[0.07]
              hover:border-blue-400/60 hover:bg-blue-500/[0.13]
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
              transition-all duration-200 group max-w-[170px]"
            style={{ boxShadow: "0 0 10px rgba(59,130,246,0.10)" }}
          >
            <span className="text-white/75 truncate">{vesselProfileData.rank}</span>
            <span className="text-white/25">·</span>
            <span className="text-gray-400 truncate">
              {vesselProfileData.vesselType === "Offshore" && vesselProfileData.offshoreType
                ? vesselProfileData.offshoreType
                : vesselProfileData.vesselType}
            </span>
          </button>
        )}

        {showCloseButton && (
          <div className="relative group flex flex-col items-center">
            <button
              onClick={mobileMode ? onSidebarItemClick : onCloseButtonClick}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Close sidebar"
            >
              {/* Крестик/гамбургер */}
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
              <div className="absolute top-full mt-2 px-2 py-[2px] text-xs bg-blue-600 text-white rounded shadow opacity-0 group-hover:opacity-100 transition-opacity z-[100] whitespace-nowrap translate-x-6">
                Close Sidebar
              </div>
            )}
          </div>
        )}
      </div>

{/* Vessel Profile Button */}
 <div className="px-1 py-0">
  <button
  onClick={() => setVesselProfileOpen(true)}
 className="
  w-full flex items-center gap-2 px-3.5 py-1 rounded-md
  border border-transparent
  bg-transparent
  hover:border-blue-500
  focus:outline-none focus:ring-2 focus:ring-blue-500
  transition-colors duration-200 min-h-[38px] 
"
>
  <Icon name="vessel-profile" size={20} />
  <span className="ml-[5px] text-[15px] font-normal text-gray-900 dark:text-gray-100">
    Vessel Profile
  </span>
</button>
</div>

{/* Create Topic Button */}
<div className="px-1 py-0">
  <button
  onClick={() => setIsTopicModalOpen(true)}
 className="
  w-full flex items-center gap-2 px-3.5 py-1 rounded-md
  border border-transparent
  bg-transparent
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
     <div className="flex-1 overflow-y-auto pt-0 px-2 pb-2 custom-scroll">
  <MyTopicsSection onSidebarItemClick={onSidebarItemClick} />
  <ChatListSection onSidebarItemClick={onSidebarItemClick} />
</div>

      {/* Кнопка профиля — всегда внизу, всегда одна */}
     {showUserProfileButton && (
 <div className="px-3 pb-0">
    <UserProfileButton />
  </div>
)}

{mobileMode && (
  <div className="text-[9px] text-center text-gray-500 px-2 pt-1 pb-2 truncate">
    Powered by advanced AI – Maritime enhanced.
  </div>
)}
    </div>
  );

    // Мобильная версия как переменная
  // Sidebar не двигается — main area съезжает вправо, открывая его
  const MobileAside = (
  <aside
    className="fixed left-0 top-0 h-full flex flex-col sm:hidden bg-[var(--bg-sidebar)]"
    style={{
      width: "calc(100vw - 3rem)",
      zIndex: 20,
      pointerEvents: isSidebarOpen ? "auto" : "none",
    }}
  >
    <SidebarContent
      showNewChatButton={true}
      showCloseButton={true}
      onSidebarItemClick={handleCloseSidebar}
    />
  </aside>
);

  // Десктоп-версия как переменная
  const DesktopAside = (
  <aside
    className="hidden sm:flex flex-col h-full bg-[var(--bg-sidebar)] backdrop-blur-sm overflow-hidden flex-shrink-0 transition-[width] duration-300 ease-in-out"
    style={{ width: ui.isSidebarOpen ? "16rem" : "0" }}
  >
    <div
      className="flex flex-col h-full w-[16rem]"
      style={{
        opacity: ui.isSidebarOpen ? 1 : 0,
        transition: ui.isSidebarOpen
          ? "opacity 180ms ease 160ms"   // открытие: сначала ширина, потом текст
          : "opacity 120ms ease",         // закрытие: текст исчезает сразу
      }}
    >
      <SidebarContent
        showNewChatButton={true}
        showCloseButton={true}
        onCloseButtonClick={handleCloseSidebar}
      />
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
        onCreate={async () => {
          const name = topicName.trim();
          if (!name) return;
          try {
            await createUserTopic(name);
          } catch (err) {
            console.error("Failed to create topic:", err);
            alert("Failed to create topic. Check console.");
          } finally {
            setIsTopicModalOpen(false);
            setTopicName("");
          }
        }}
        onClose={() => {
          setIsTopicModalOpen(false);
          setTopicName("");
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
