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

  const {
    advancedTouched,
    advancedCompleted,
    vesselProfileSaved,
    setVesselProfileOpen,
    setOpenAdvancedDirectly
  } = useContext(UIContext);

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

      <div className="flex flex-col flex-1 transition-[width] duration-300 ease-in-out w-full max-w-full min-w-0 overflow-x-hidden">
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
        <div className="flex h-[100dvh] w-full overflow-hidden bg-[#0b1220]">
          <AppShell>{children}</AppShell>
        </div>
      </ChatProvider>
    </UIProvider>
  );
}