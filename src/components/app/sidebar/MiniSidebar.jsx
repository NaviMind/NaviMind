"use client";

import { useContext, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { UIContext } from "@/context/UIContext";
import { ChatContext } from "@/context/ChatContext";
import { useCurrentUserDoc } from "@/hooks/useCurrentUserDoc";
import { auth } from "@/firebase/config";
import Icon from "@/components/common/Icon";

// ─── Tooltip rendered in a portal (escapes overflow:hidden) ──────────────────

function MiniBtn({ children, tooltip, onClick }) {
  const [tipPos, setTipPos] = useState(null);
  const ref = useRef(null);

  const handleEnter = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setTipPos({ top: r.top + r.height / 2, left: r.right + 10 });
  };

  return (
    <div className="flex justify-center w-full">
      <button
        ref={ref}
        onClick={onClick}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setTipPos(null)}
        className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
      >
        {children}
      </button>

      {tipPos && createPortal(
        <div
          className="fixed z-[9999] px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded-md shadow-lg pointer-events-none whitespace-nowrap"
          style={{ top: tipPos.top, left: tipPos.left, transform: "translateY(-50%)" }}
        >
          {tooltip}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IcMenu = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IcNewChat = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
  const [avatarTip, setAvatarTip] = useState(null);
  const avatarRef = useRef(null);

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

  const showAvatarTip = () => {
    const r = avatarRef.current?.getBoundingClientRect();
    if (r) setAvatarTip({ top: r.top + r.height / 2, left: r.right + 10 });
  };

  return (
    <aside
      style={{ width: isSidebarOpen ? 0 : 56 }}
      className="hidden sm:flex flex-col overflow-hidden flex-shrink-0 h-full bg-[var(--bg-sidebar)] border-r border-gray-200 dark:border-white/[0.06] transition-[width] duration-300 ease-in-out"
    >
      {/* Fixed-width inner column — clipped by parent during animation */}
      <div className="w-14 flex flex-col items-center py-3 gap-0.5 h-full">

        <MiniBtn tooltip="Open Sidebar" onClick={toggleSidebar}>
          <IcMenu />
        </MiniBtn>

        <MiniBtn tooltip="New Chat" onClick={handleNewChat}>
          <IcNewChat />
        </MiniBtn>

        <MiniBtn tooltip="Vessel Profile" onClick={() => setVesselProfileOpen(true)}>
          <Icon name="vessel-profile" size={24} />
        </MiniBtn>

        <MiniBtn tooltip="Create Topic" onClick={() => setIsTopicModalOpen(true)}>
          <Icon name="create-new" size={24} />
        </MiniBtn>

        {/* User avatar — bottom */}
        <div className="mt-auto mb-1 flex justify-center w-full">
          <button
            ref={avatarRef}
            onClick={() => toggleSettings(true)}
            onMouseEnter={showAvatarTip}
            onMouseLeave={() => setAvatarTip(null)}
            className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-200 dark:ring-white/10 hover:ring-blue-500 transition-all duration-200"
          >
            {photoURL ? (
              <img src={photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-xs font-semibold">
                {initials}
              </span>
            )}
          </button>

          {avatarTip && createPortal(
            <div
              className="fixed z-[9999] px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded-md shadow-lg pointer-events-none whitespace-nowrap"
              style={{ top: avatarTip.top, left: avatarTip.left, transform: "translateY(-50%)" }}
            >
              Account & Settings
            </div>,
            document.body
          )}
        </div>

      </div>
    </aside>
  );
}
