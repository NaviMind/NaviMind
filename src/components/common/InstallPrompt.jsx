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
  const { isSidebarOpen } = useContext(UIContext);

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
      className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) setShowIOSModal(false); }}
    >
      <div
        className="w-full max-w-sm mx-4 mb-6 sm:mb-0 rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0d1b3a 0%, #091428 100%)" }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center gap-4 border-b border-white/[0.07]">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}
          >
            <img src="/logo-navi.png" alt="NaviMind" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <p className="text-white font-semibold text-base">Add to Home Screen</p>
            <p className="text-white/45 text-[13px] leading-snug mt-0.5">
              Install NaviMind for faster access
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 space-y-4">
          {/* Step 1 */}
          <div className="flex items-start gap-3.5">
            <StepBadge n={1} />
            <div className="pt-0.5">
              <p className="text-white/90 text-sm leading-relaxed">
                Tap the{" "}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/10 border border-white/15 text-xs font-medium align-middle">
                  <ShareIcon />
                  Share
                </span>{" "}
                icon at the bottom of Safari
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3.5">
            <StepBadge n={2} />
            <p className="text-white/90 text-sm leading-relaxed pt-0.5">
              Scroll down and tap{" "}
              <span className="text-white font-medium">Add to Home Screen</span>
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3.5">
            <StepBadge n={3} />
            <p className="text-white/90 text-sm leading-relaxed pt-0.5">
              Tap <span className="text-white font-medium">Add</span> to confirm
            </p>
          </div>
        </div>

        {/* Arrow indicator */}
        <div className="px-6 pb-5">
          <div
            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm text-blue-300/80"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)" }}
          >
            <ShareIcon className="text-blue-400 shrink-0" size={18} />
            <span className="text-[13px] leading-snug">
              The Share icon looks like a box with an arrow pointing up
            </span>
          </div>
        </div>

        {/* Button */}
        <div className="px-6 pb-6">
          <button
            onClick={() => setShowIOSModal(false)}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-white
              bg-blue-600 hover:bg-blue-500 active:scale-[0.98]
              transition-all duration-200 shadow-lg"
            style={{ boxShadow: "0 4px 24px rgba(59,130,246,0.35)" }}
          >
            Got it
          </button>
        </div>
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
            className="flex items-center justify-between w-full sm:w-[500px] px-4 py-3 rounded-2xl
              backdrop-blur-xl shadow-lg border border-white/10 text-white
              transition-all duration-500 ease-out"
            style={{ background: "linear-gradient(90deg, rgba(11,18,32,0.7) 0%, rgba(13,27,58,0.6) 50%, rgba(18,63,124,0.7) 100%)" }}
          >
            <div className="flex flex-col text-sm sm:text-base pt-[2px]">
              <span className="font-medium tracking-wide text-[15px] sm:text-[16px]">
                Add NaviMind to your device
              </span>
              <span className="text-white/50 text-[11px] sm:text-[12px] font-light leading-relaxed tracking-wide">
                Faster access. Smarter support.
              </span>
            </div>

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
      )}

      {/* iOS instruction modal — rendered in body via portal */}
      {mounted && showIOSModal && createPortal(IOSModal, document.body)}
    </>
  );
}

function StepBadge({ n }) {
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold text-blue-300"
      style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}
    >
      {n}
    </div>
  );
}

function ShareIcon({ className = "text-white/70", size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
