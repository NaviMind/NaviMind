"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UIContext } from "@/context/UIContext";
import { ChatContext } from "@/context/ChatContext";
import { useCurrentUserDoc } from "@/hooks/useCurrentUserDoc";
import { auth } from "@/firebase/config";
import Icon from "@/components/common/Icon";

// ─── Single icon button with right-side tooltip ───────────────────────────────

function MiniBtn({ children, tooltip, onClick }) {
  return (
    <div className="relative group flex justify-center w-full">
      <button
        onClick={onClick}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
      >
        {children}
      </button>
      <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[300] whitespace-nowrap">
        {tooltip}
      </div>
    </div>
  );
}

// ─── Hamburger icon ───────────────────────────────────────────────────────────

const IcMenu = () => (
  <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── New chat icon ────────────────────────────────────────────────────────────

const IcNewChat = () => (
  <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 20h9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── MiniSidebar ─────────────────────────────────────────────────────────────

export default function MiniSidebar() {
  const {
    isSidebarOpen,
    toggleSidebar,
    toggleSettings,
    setVesselProfileOpen,
    setIsTopicModalOpen,
  } = useContext(UIContext);

  const { setActiveProject, setActiveChatId, setMessages } = useContext(ChatContext);
  const router = useRouter();
  const { data: userDoc } = useCurrentUserDoc();

  const [photoURL, setPhotoURL] = useState("");
  const [initials, setInitials] = useState("U");

  useEffect(() => {
    const u = auth.currentUser;
    const displayName =
      userDoc?.displayName ||
      [userDoc?.firstName, userDoc?.lastName].filter(Boolean).join(" ") ||
      u?.displayName ||
      "";
    const photo = userDoc?.photoURL || u?.photoURL || "";
    setPhotoURL(photo);
    setInitials(
      (displayName || userDoc?.email || "U")
        .split(/\s+/)
        .map((w) => w[0]?.toUpperCase())
        .filter(Boolean)
        .slice(0, 2)
        .join("") || "U"
    );
  }, [userDoc]);

  const handleNewChat = () => {
    setActiveProject("global");
    setActiveChatId(null);
    setMessages([]);
    window.nextPrompt?.();
    router.push("/app");
  };

  return (
    <aside
      style={{ width: isSidebarOpen ? 0 : 56 }}
      className="hidden sm:flex flex-col overflow-hidden flex-shrink-0 h-full bg-[var(--bg-sidebar)] border-r border-gray-200 dark:border-white/[0.06] transition-[width] duration-300 ease-in-out"
    >
      {/* Inner fixed-width column — clipped by parent overflow:hidden */}
      <div className="w-14 flex flex-col items-center py-3 gap-1 h-full">

        {/* Top buttons */}
        <MiniBtn tooltip="Open Sidebar" onClick={toggleSidebar}>
          <IcMenu />
        </MiniBtn>

        <MiniBtn tooltip="New Chat" onClick={handleNewChat}>
          <IcNewChat />
        </MiniBtn>

        <MiniBtn tooltip="Vessel Profile" onClick={() => setVesselProfileOpen(true)}>
          <Icon name="vessel-profile" size={22} />
        </MiniBtn>

        <MiniBtn tooltip="Create Topic" onClick={() => setIsTopicModalOpen(true)}>
          <Icon name="create-new" size={22} />
        </MiniBtn>

        {/* Bottom: user avatar */}
        <div className="relative group flex justify-center w-full mt-auto mb-1">
          <button
            onClick={() => toggleSettings(true)}
            className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-200 dark:ring-white/10 hover:ring-blue-500 transition-all duration-200"
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt=""
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-xs font-semibold">
                {initials}
              </span>
            )}
          </button>
          <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[300] whitespace-nowrap">
            Account & Settings
          </div>
        </div>

      </div>
    </aside>
  );
}
