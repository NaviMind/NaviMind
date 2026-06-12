"use client";

import { useState, useEffect } from "react";
import { useContext } from "react";
import { UIContext } from "@/context/UIContext";

export default function AdvancedReminderBubble({
  onOpen,
}) {

const [visible, setVisible] = useState(true);
const { advancedCompleted, theme } = useContext(UIContext);

useEffect(() => {
  if (advancedCompleted) {
  setVisible(false);
  return;
}

  const dismissedAt = localStorage.getItem("advancedBubbleDismissedAt");
  const dismissedCount = parseInt(
  localStorage.getItem("advancedBubbleDismissCount") || "0"
);

if (dismissedCount >= 5) {
  setVisible(false);
  return;
}

  if (!dismissedAt) return;

  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  if (now - dismissedAt < twentyFourHours) {
    setVisible(false);
  }
}, [advancedCompleted]);

if (!visible) return null;

  return (
    <div className="w-full flex justify-center px-3 mt-2 transition-all duration-500 ease-in-out">
      <div
        className={`flex items-center justify-between w-[100%] sm:w-[500px] px-4 py-3 rounded-2xl
        backdrop-blur-xl shadow-lg border transition-all duration-500 ease-out
        ${theme === "dark"
          ? "border-white/10 text-white"
          : "border-blue-200 text-gray-800"}`}
        style={{ background: theme === "dark"
          ? "linear-gradient(90deg, rgba(11,18,32,0.7) 0%, rgba(13,27,58,0.6) 50%, rgba(18,63,124,0.7) 100%)"
          : "linear-gradient(90deg, rgba(239,246,255,1) 0%, rgba(219,234,254,0.95) 50%, rgba(191,219,254,0.85) 100%)" }}
      >
        <div className="flex flex-col text-sm sm:text-base pt-[2px]">
          <span className="font-medium tracking-wide text-[15px] sm:text-[16px]">
            Complete Vessel Data
          </span>
          <span className={`text-[11px] sm:text-[12px] font-light leading-relaxed tracking-wide ${theme === "dark" ? "text-white/50" : "text-blue-500"}`}>
            Improve operational accuracy.
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 mt-[2px]">
          <button
            onClick={onOpen}
            className={`px-3 py-[5px] text-xs sm:text-sm font-medium rounded-lg active:scale-[0.97] transition-all duration-200
              ${theme === "dark"
                ? "border border-white/25 hover:bg-white/10"
                : "border border-blue-400 text-blue-700 hover:bg-blue-100"}`}
          >
            Add
          </button>

          <button
            onClick={() => {
              const dismissedCount = parseInt(localStorage.getItem("advancedBubbleDismissCount") || "0") + 1;
              localStorage.setItem("advancedBubbleDismissCount", dismissedCount);
              localStorage.setItem("advancedBubbleDismissedAt", Date.now());
              setVisible(false);
            }}
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
  );
}