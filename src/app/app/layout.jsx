"use client";

import { useState, useEffect, useContext } from "react";
import { UIProvider, UIContext } from "@/context/UIContext";
import { ChatProvider, ChatContext } from "@/context/ChatContext";
import SidebarContainer from "@/components/app/sidebar/SidebarContainer";
import MiniSidebar from "@/components/app/sidebar/MiniSidebar";
import TopBar from "@/components/app/TopBar";
import MobileSidebarOverlay from "@/components/app/MobileSidebarOverlay";
import InputBar from "@/components/app/InputBar/InputBar";
import TopicSuggestionBanner from "@/components/app/TopicSuggestionBanner";
import Toast from "@/components/app/Toast";
import WelcomeModal from "@/components/app/Welcome/WelcomeModal";
import AdvancedReminderBubble from "@/components/common/AdvancedReminderBubble";
import InstallPrompt from "@/components/common/InstallPrompt";
import ThemeColorMeta from "@/components/common/ThemeColorMeta";


/* ---------------------- */
/* 🔹 ВНУТРЕННИЙ SHELL */
/* ---------------------- */

function AppShell({ children }) {
  const { isLoadingMessages } = useContext(ChatContext);
  const [showAdvancedReminder, setShowAdvancedReminder] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const {
    advancedTouched,
    advancedCompleted,
    vesselProfileSaved,
    setVesselProfileOpen,
    setOpenAdvancedDirectly,
    theme,
    isSidebarOpen,
  } = useContext(UIContext);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 850);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Keep layout pinned to visual viewport so the header stays
  // visible when the iOS keyboard opens
  useEffect(() => {
    const update = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${h}px`);
    };
    const resetScroll = () => window.scrollTo(0, 0);
    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', resetScroll);
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', resetScroll);
    };
  }, []);

  useEffect(() => {
    if (
      vesselProfileSaved &&
      advancedTouched &&
      !advancedCompleted
    ) {
      const timer = setTimeout(() => {
        setShowAdvancedReminder(true);
      }, 15000);

      return () => clearTimeout(timer);
    }
  }, [vesselProfileSaved, advancedTouched, advancedCompleted]);

  return (
    <>
      <ThemeColorMeta />
      <SidebarContainer />
      <MiniSidebar />

      <div
          id="nm-workarea"
          className="flex flex-col flex-1 min-w-0 overflow-x-hidden bg-[var(--bg-app)] border-l border-gray-200 dark:border-transparent sm:border-l-0 text-gray-900 dark:text-white"
          style={{
            zIndex: 30,
            transition: "transform 420ms cubic-bezier(0.32, 0.72, 0, 1), border-radius 420ms cubic-bezier(0.32, 0.72, 0, 1), box-shadow 420ms cubic-bezier(0.32, 0.72, 0, 1)",
            transform: isMobile && isSidebarOpen ? "translateX(calc(100vw - 3rem))" : "translateX(0)",
            borderTopLeftRadius: isMobile && isSidebarOpen ? "22px" : "0",
            borderBottomLeftRadius: isMobile && isSidebarOpen ? "22px" : "0",
            boxShadow: isMobile && isSidebarOpen ? "-8px 0 32px rgba(0,0,0,0.55)" : "-8px 0 32px rgba(0,0,0,0)",
          }}
        >
        <div className="relative isolate sm:z-50 z-0 w-full max-w-full">
          <TopBar />
        </div>

        <div className="flex flex-col flex-1 min-h-0 w-full max-w-full">
          <div className="relative flex-1 min-h-0 overflow-hidden w-full max-w-full">
            {children}
            {isLoadingMessages && (
              <div className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-[6px] bg-white/30 dark:bg-[#0b1220]/40">
                <svg className="animate-spin" width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="3" strokeOpacity="0.15" />
                  <path d="M18 3 A15 15 0 0 1 33 18" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
          {/* Reminder/suggestion banners — grouped just above the input bar */}
          <TopicSuggestionBanner />
          {showAdvancedReminder && (
            <AdvancedReminderBubble
              onOpen={() => {
                setShowAdvancedReminder(false);
                setOpenAdvancedDirectly(true);
                setVesselProfileOpen(true);
              }}
            />
          )}
          <InstallPrompt />
          <InputBar />
        </div>
      </div>

      <MobileSidebarOverlay />
      <Toast />
      <WelcomeModal />
    </>
  );
}


/* ---------------------- */
/* 🔹 ГЛАВНЫЙ LAYOUT */
/* ---------------------- */

export default function AppLayout({ children }) {
  return (
    <UIProvider>
      <ChatProvider>
        <div
          className="flex w-full overflow-hidden bg-[var(--bg-app)]"
          style={{ height: "var(--app-height, 100dvh)" }}
        >
          <AppShell>{children}</AppShell>
        </div>
      </ChatProvider>
    </UIProvider>
  );
}