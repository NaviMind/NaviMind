"use client";

import { useContext, useEffect, useState } from "react";
import { X } from "lucide-react";
import { UIContext } from "@/context/UIContext";
import MaskIcon from "@/components/common/MaskIcon";

const SEEN_KEY = "nm-split-drag-hint-seen";

// One-time coachmark shown the first time a user opens split screen, teaching
// the non-obvious gesture: chats can be dragged from the sidebar into the pane.
// Styled like the app's other banners and rendered just above the input bar so
// it lands where the eye already expects banners. Shows once (localStorage),
// desktop-only, auto-dismisses.
export default function SplitDragHint() {
  const { theme } = useContext(UIContext);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Desktop only — split is a hover-capable-device feature.
    if (!window.matchMedia?.("(hover: hover)").matches) return;
    if (localStorage.getItem(SEEN_KEY)) return;
    setShow(true);
    const t = setTimeout(dismiss, 12000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
  };

  if (!show) return null;

  return (
    <div className="w-full flex justify-center px-3 pb-2 animate-slide-up">
      <div
        className={`flex items-center gap-3 w-full sm:w-[620px] px-4 py-3.5 rounded-2xl
          backdrop-blur-xl shadow-lg border
          ${theme === "dark" ? "border-white/10 text-white" : "border-blue-200 text-gray-800"}`}
        style={{
          background:
            theme === "dark"
              ? "linear-gradient(90deg, rgba(11,18,32,0.7) 0%, rgba(13,27,58,0.6) 50%, rgba(18,63,124,0.7) 100%)"
              : "linear-gradient(90deg, rgba(239,246,255,1) 0%, rgba(219,234,254,0.95) 50%, rgba(191,219,254,0.85) 100%)",
        }}
      >
        <span className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 dark:text-blue-300">
          <MaskIcon src="/Split_scene_right.svg" size={22} />
        </span>
        <p className="flex-1 text-sm font-medium leading-snug">
          Tip: drag any chat from the sidebar here to pin it in split screen.
        </p>
        <button
          onClick={dismiss}
          aria-label="Dismiss tip"
          className="shrink-0 -mr-1 p-1.5 rounded-lg text-gray-500 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
