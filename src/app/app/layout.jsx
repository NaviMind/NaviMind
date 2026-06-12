"use client";

import { useState, useEffect, useContext } from "react";
import { UIProvider, UIContext } from "@/context/UIContext";
import { ChatProvider } from "@/context/ChatContext";
import SidebarContainer from "@/components/app/sidebar/SidebarContainer";
import TopBar from "@/components/app/TopBar";
import MobileSidebarOverlay from "@/components/app/MobileSidebarOverlay";
import InputBar from "@/components/app/InputBar/InputBar";
import WelcomeModal from "@/components/app/Welcome/WelcomeModal";
import AdvancedReminderBubble from "@/components/common/AdvancedReminderBubble";


/* ---------------------- */
/* 🔹 ВНУТРЕННИЙ SHELL */
/* ---------------------- */

function AppShell({ children }) {
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
      <SidebarContainer />

      <div
          className="flex flex-col flex-1 min-w-0 overflow-x-hidden transition-transform duration-300 ease-in-out"
          style={isMobile && isSidebarOpen ? { transform: "translateX(calc(100vw - 3rem))" } : undefined}
        >
        <div className="relative isolate sm:z-50 z-0 w-full max-w-full">
          <TopBar />
        </div>

        {showAdvancedReminder && (
          <AdvancedReminderBubble
            onOpen={() => {
            setShowAdvancedReminder(false);
            setOpenAdvancedDirectly(true);
            setVesselProfileOpen(true);
           }}
          />
        )}

        <div className="flex flex-col flex-1 min-h-0 w-full max-w-full">
          <div className="flex-1 min-h-0 overflow-hidden w-full max-w-full">
            {children}
          </div>
          <InputBar />
        </div>
      </div>

      <MobileSidebarOverlay />
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