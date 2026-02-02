"use client";
import { useState, useEffect, useContext } from "react";
import { UIContext } from "@/context/UIContext";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const { isSidebarOpen } = useContext(UIContext);


  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;

    setIsIos(ios);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      console.log("✅ Install prompt event caught and stored.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // проверяем, когда последний раз закрывали баннер
    const lastDismissed = localStorage.getItem("installBannerDismissedAt");
    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;

    // показываем через 60 секунд, если прошло 48 часов
    const timer = setTimeout(() => {
      if (!standalone && (!lastDismissed || now - lastDismissed > fortyEightHours)) {
        setShowBanner(true);
      }
    }, 60000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (isIos) {
      alert(
        "To install NaviMind on iOS:\n\n1. Tap the Share icon in Safari.\n2. Tap 'More'.\n3. Select 'Add to Home Screen'."
      );
      setShowBanner(false);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        console.log("🎉 App installed");
      } else {
        console.log("❌ User dismissed install prompt");
      }
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  };

  const handleClose = () => {
    setShowBanner(false);
    localStorage.setItem("installBannerDismissedAt", Date.now());
  };

  if (!showBanner) return null;

  return (
   <div
  className={`w-full flex justify-center mtmt-[-8px] sm:mt-0 transition-all duration-500 ease-in-out
  ${showBanner ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}`}
>
      <div
        className={`flex items-center justify-between w-[100%] sm:w-[500px] px-4 py-3 rounded-2xl
        bg-gradient-to-r from-[#0b1220]/70 via-[#0d1b3a]/60 to-[#123f7c]/70
        backdrop-blur-xl shadow-lg border border-white/10
        text-white transition-all duration-500 ease-out`}
      >
        {/* Текстовая часть */}
        <div className="flex flex-col text-sm sm:text-base pt-[2px]">
          <span className="font-medium tracking-wide text-[15px] sm:text-[16px]">
            Add NaviMind to your device
          </span>
          <span className="text-white/50 text-[11px] sm:text-[12px] font-light leading-relaxed tracking-wide">
            Faster access. Smarter support.
          </span>
        </div>

        {/* Кнопки */}
        <div className="flex items-center gap-2 sm:gap-3 mt-[2px]">
          <button
            onClick={handleInstall}
            className="px-3 py-[3px] sm:px-3.5 sm:py-[5px] text-xs sm:text-sm font-medium
            border border-white/25 rounded-lg hover:bg-white/10
            active:scale-[0.97] transition-all duration-200"
          >
            Add
          </button>

          <button
            onClick={handleClose}
            className="px-3 py-[3px] sm:px-3.5 sm:py-[5px] text-xs sm:text-sm font-medium
            border border-white/15 rounded-lg hover:bg-white/10
            text-white/70 active:scale-[0.97] transition-all duration-200"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
