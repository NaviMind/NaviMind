"use client";

import { useContext, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { UIContext } from "@/context/UIContext";
import { ChatContext } from "@/context/ChatContext";
import { useCurrentUserDoc } from "@/hooks/useCurrentUserDoc";
import { auth } from "@/firebase/config";
import Icon from "@/components/common/Icon";
import SearchModal from "./SearchModal";
import MiniPinned from "./MiniPinned";

// ─── Tooltip rendered in a portal (escapes overflow:hidden) ──────────────────

function MiniBtn({ children, morph, tooltip, onClick }) {
  const [tipPos, setTipPos] = useState(null);
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);

  const handleEnter = () => {
    setHovered(true);
    const r = ref.current?.getBoundingClientRect();
    if (r) setTipPos({ top: r.top + r.height / 2, left: r.right + 10 });
  };

  const handleLeave = () => {
    setHovered(false);
    setTipPos(null);
  };

  return (
    <div className="flex justify-center w-full">
      <button
        ref={ref}
        onClick={onClick}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
      >
        {morph ? (
          // Cross-fade between idle (logo) and hover (hamburger)
          <span className="relative w-9 h-9 flex items-center justify-center">
            <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${hovered ? "opacity-0" : "opacity-100"}`}>
              {morph.idle}
            </span>
            <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0"}`}>
              {morph.hover}
            </span>
          </span>
        ) : (
          children
        )}
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
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
    <>
    {/* Aside reserves layout space; overflow-visible lets the card shadow bleed into content */}
    <aside
      style={{ width: isSidebarOpen ? 0 : 68 }}
      className="hidden sm:flex overflow-visible flex-shrink-0 h-full transition-[width] duration-300 ease-in-out"
    >
      {/* Outer padding wrapper — fades out when sidebar opens */}
      <div
        className="w-[68px] h-full px-2 py-3 flex flex-col"
        style={{ opacity: isSidebarOpen ? 0 : 1, transition: "opacity 150ms ease" }}
      >
        {/* Floating card */}
        <div className="flex-1 flex flex-col items-center pt-2 pb-2.5 gap-0.5 rounded-2xl
          bg-white/95 dark:bg-[#151e30]/95
          backdrop-blur-md
          shadow-[0_4px_24px_rgba(0,0,0,0.09),0_1px_4px_rgba(0,0,0,0.05)]
          dark:shadow-[0_4px_28px_rgba(0,0,0,0.55)]
          ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
        >
          <MiniBtn
            tooltip="Open Sidebar"
            onClick={toggleSidebar}
            morph={{
              idle: <img src="/compass.png" alt="" className="w-9 h-9 object-contain" draggable={false} />,
              hover: <IcMenu />,
            }}
          />

          <MiniBtn tooltip="New Chat" onClick={handleNewChat}>
            <IcNewChat />
          </MiniBtn>

          <MiniBtn tooltip="Search topics and chats" onClick={() => setIsSearchOpen(true)}>
            <Icon name="search" size={26} />
          </MiniBtn>

          <MiniPinned />

          <MiniBtn tooltip="Vessel Profile" onClick={() => setVesselProfileOpen(true)}>
            <Icon name="vessel-profile" size={24} />
          </MiniBtn>

          <MiniBtn tooltip="Create Topic" onClick={() => setIsTopicModalOpen(true)}>
            <Icon name="create-new" size={24} />
          </MiniBtn>

          {/* Divider */}
          <div className="w-7 h-px bg-gray-200 dark:bg-white/10 my-1 flex-shrink-0" />

          {/* User avatar — pinned to bottom inside card */}
          <div className="mt-auto flex justify-center w-full px-1">
            <button
              ref={avatarRef}
              onClick={() => toggleSettings(true)}
              onMouseEnter={showAvatarTip}
              onMouseLeave={() => setAvatarTip(null)}
              className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-200 dark:ring-white/10 hover:ring-blue-500 dark:hover:ring-blue-500 hover:shadow-[0_0_10px_rgba(59,130,246,0.55)] transition-all duration-200"
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
      </div>
    </aside>

    <SearchModal
      open={isSearchOpen}
      onClose={() => setIsSearchOpen(false)}
    />
    </>
  );
}
