"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import MaskIcon from "@/components/common/MaskIcon";

const SEEN_KEY = "nm-split-drag-hint-seen";

// One-time coachmark shown the first time a user opens split screen, teaching
// the non-obvious gesture: chats can be dragged from the sidebar into this
// pane. Mounts only when the split pane mounts (i.e. split just opened), shows
// once (localStorage flag), desktop-only, and auto-dismisses.
export default function SplitDragHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Desktop only — split is a hover-capable-device feature.
    if (!window.matchMedia?.("(hover: hover)").matches) return;
    if (localStorage.getItem(SEEN_KEY)) return;
    setShow(true);
    const t = setTimeout(dismiss, 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
  };

  if (!show) return null;

  return (
    <div className="absolute top-[70px] left-1/2 -translate-x-1/2 z-[40] pointer-events-auto animate-fade-in">
      <div className="flex items-center gap-2.5 max-w-[300px] px-3.5 py-2.5 rounded-2xl bg-blue-600 text-white shadow-xl ring-1 ring-white/10">
        <MaskIcon src="/Split_scene_right.svg" size={18} className="shrink-0 opacity-90" />
        <span className="text-xs leading-snug">
          Tip: drag any chat from the sidebar here to pin it in split.
        </span>
        <button
          onClick={dismiss}
          aria-label="Dismiss tip"
          className="shrink-0 -mr-1 p-1 rounded-lg hover:bg-white/15 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
