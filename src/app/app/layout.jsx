"use client";

import { UIProvider } from "@/context/UIContext";
import { ChatProvider } from "@/context/ChatContext";
import SidebarContainer from "@/components/app/sidebar/SidebarContainer";
import TopBar from "@/components/app/TopBar";
import MobileSidebarOverlay from "@/components/app/MobileSidebarOverlay";
import InputBar from "@/components/app/InputBar/InputBar";
import WelcomeModal from "@/components/app/Welcome/WelcomeModal";
import DebugStateBar from "@/components/dev/DebugStateBar";

// 👉 Регистрация Service Worker
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => console.log("✅ [SW] Registered:", reg.scope))
      .catch((err) => console.error("❌ [SW] Registration failed:", err));
  });
}

export default function AppLayout({ children }) {
  return (
    <UIProvider>
      <ChatProvider>
        {/* ВЕРХНИЙ FLEX-КОНТЕЙНЕР */}
        <div className="flex h-[100dvh] w-full overflow-hidden bg-[#0b1220]">
          {/* Sidebar для десктопа */}
          <SidebarContainer />

          {/* Main content area — плавная адаптация */}
          <div className="flex flex-col flex-1 transition-[width] duration-300 ease-in-out w-full max-w-full min-w-0 overflow-x-hidden">
            {/* TopBar — z-50 только на sm и выше! */}
            <div className="relative isolate sm:z-50 z-0 w-full max-w-full">
              <TopBar />
            </div>

            {/* Область сообщений + InputBar — siblings */}
            <div className="flex flex-col flex-1 min-h-0 w-full max-w-full">
              {/* Scrollable page content */}
              <div className="flex-1 min-h-0 overflow-hidden w-full max-w-full">
                {children}
              </div>

              {/* InputBar — всегда снизу, без fixed! */}
              <InputBar />
            </div>
          </div>

          {/* Overlay-версия для мобильных — поверх main area */}
          <MobileSidebarOverlay />
        </div>

        {/* 🔥 Debug панель всегда внизу */}
        <DebugStateBar />
        {/* 👇 WelcomeModal — поверх всего */}
        <WelcomeModal />
      </ChatProvider>
    </UIProvider>
  );
}
