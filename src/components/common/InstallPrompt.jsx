"use client";
import { useState, useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { UIContext } from "@/context/UIContext";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isSidebarOpen, theme } = useContext(UIContext);

  useEffect(() => {
    setMounted(true);
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;

    setIsIos(ios);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const lastDismissed = localStorage.getItem("installBannerDismissedAt");
    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;

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
      setShowBanner(false);
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  };

  const handleClose = () => {
    setShowBanner(false);
    localStorage.setItem("installBannerDismissedAt", Date.now());
  };

  const IOSModal = (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) setShowIOSModal(false); }}
    >
      <div className="w-full max-w-sm bg-white/90 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-6 flex flex-col gap-5 text-gray-900 dark:text-white">

        {/* Title */}
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Add to Home Screen</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Install NaviMind on your device for faster access and a better experience.
          </p>
        </div>

        {/* Steps */}
        <div className="bg-gray-50 dark:bg-gray-700/25 backdrop-blur-lg ring-1 ring-black/5 dark:ring-white/10 rounded-xl p-4 space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            <span className="font-semibold">1.</span> Tap the <span className="font-semibold">Share</span> icon at the bottom of Safari
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-200">
            <span className="font-semibold">2.</span> Scroll down and tap <span className="font-semibold">Add to Home Screen</span>
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-200">
            <span className="font-semibold">3.</span> Tap <span className="font-semibold">Add</span> to confirm
          </p>
        </div>

        {/* Button */}
        <button
          onClick={() => setShowIOSModal(false)}
          className="w-full py-3 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all duration-200"
        >
          Got it
        </button>

      </div>
    </div>
  );

  return (
    <>
      {/* Banner */}
      {showBanner && (
        <div
          className={`w-full flex justify-center mt-[-8px] sm:mt-0 transition-all duration-500 ease-in-out
            ${showBanner ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}`}
        >
          <div
            className={`flex items-center justify-between w-full sm:w-[500px] px-4 py-3 rounded-2xl
              backdrop-blur-xl shadow-lg border transition-all duration-500 ease-out
              ${theme === "dark" ? "border-white/10 text-white" : "border-blue-200 text-gray-800"}`}
            style={{ background: theme === "dark"
              ? "linear-gradient(90deg, rgba(11,18,32,0.7) 0%, rgba(13,27,58,0.6) 50%, rgba(18,63,124,0.7) 100%)"
              : "linear-gradient(90deg, rgba(239,246,255,1) 0%, rgba(219,234,254,0.95) 50%, rgba(191,219,254,0.85) 100%)" }}
          >
            <div className="flex flex-col text-sm sm:text-base pt-[2px]">
              <span className="font-medium tracking-wide text-[15px] sm:text-[16px]">
                Add NaviMind to your device
              </span>
              <span className={`text-[11px] sm:text-[12px] font-light leading-relaxed tracking-wide ${theme === "dark" ? "text-white/50" : "text-blue-500"}`}>
                Faster access. Smarter support.
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 mt-[2px]">
              <button
                onClick={handleInstall}
                className={`px-3 py-[3px] sm:px-3.5 sm:py-[5px] text-xs sm:text-sm font-medium rounded-lg active:scale-[0.97] transition-all duration-200
                  ${theme === "dark"
                    ? "border border-white/25 hover:bg-white/10"
                    : "border border-blue-400 text-blue-700 hover:bg-blue-100"}`}
              >
                Add
              </button>
              <button
                onClick={handleClose}
                className={`px-3 py-[3px] sm:px-3.5 sm:py-[5px] text-xs sm:text-sm font-medium rounded-lg active:scale-[0.97] transition-all duration-200
                  ${theme === "dark"
                    ? "border border-white/15 hover:bg-white/10 text-white/70"
                    : "border border-gray-300 hover:bg-gray-100 text-gray-500"}`}
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS instruction modal — rendered in body via portal */}
      {mounted && showIOSModal && createPortal(IOSModal, document.body)}
    </>
  );
}

