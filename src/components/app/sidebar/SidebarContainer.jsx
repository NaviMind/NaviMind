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


export default function SidebarContainer({
  mobileMode = false,
  isSidebarOpen,
  toggleSidebar,
}) {
  const router = useRouter();
  const ui = useContext(UIContext);
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
        {showCloseButton && (
          <div className="relative group flex flex-col items-center">
            <button
              onClick={mobileMode ? onSidebarItemClick : onCloseButtonClick}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Close sidebar"
            >
              {/* Крестик/гамбургер */}
              {mobileMode ? (
                <img src="/Close_Small.svg" alt="Close" className="w-6 h-6" />
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
  <img
    src="/create_new.svg"
    alt="Create Topic"
    className="w-5 h-5"
    draggable="false"
  />
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
      <img
        src="/chat_bubble.svg"
        alt=""
        className="w-8 h-8 mr-3 opacity-80"
        draggable="false"
      />
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
  const MobileAside = (
  <aside
    className={[
      "fixed left-0 top-0 z-50 h-full w-4/5 max-w-xs",
      "bg-[#0b1220] backdrop-blur-sm text-gray-200",
      "flex flex-col",
      "transition-transform duration-300 sm:hidden",
      isSidebarOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none",
    ].join(" ")}
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
    className={[
      ui.isSidebarOpen ? "sm:flex" : "sm:hidden",
      "hidden flex-col h-full",
      "bg-gray-900/80 backdrop-blur-sm",
      "text-gray-800 dark:text-gray-200",
      "flex flex-col",
      "transition-[width] duration-300 ease-in-out",
    ].join(" ")}
    style={ui.isSidebarOpen ? { width: "16rem" } : { width: 0 }}
  >
      <SidebarContent
        showNewChatButton={true}
        showCloseButton={true}
        onCloseButtonClick={handleCloseSidebar}
      />
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
    </>
  );
}
