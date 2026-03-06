"use client";

import { useState, useEffect } from "react";
import { useContext } from "react";
import { UIContext } from "@/context/UIContext";

export default function AdvancedReminderBubble({
  onOpen,
}) {

const [visible, setVisible] = useState(true);
const { advancedCompleted } = useContext(UIContext);

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
        className="flex items-center justify-between w-[100%] sm:w-[500px] px-4 py-3 rounded-2xl
        bg-gradient-to-r from-[#0b1220]/70 via-[#0d1b3a]/60 to-[#123f7c]/70
        backdrop-blur-xl shadow-lg border border-white/10
        text-white transition-all duration-500 ease-out"
      >
        <div className="flex flex-col text-sm sm:text-base pt-[2px]">
          <span className="font-medium tracking-wide text-[15px] sm:text-[16px]">
            Complete Vessel Data
          </span>
          <span className="text-white/50 text-[11px] sm:text-[12px] font-light leading-relaxed tracking-wide">
            Improve operational accuracy.
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 mt-[2px]">
          <button
            onClick={onOpen}
            className="px-3 py-[5px] text-xs sm:text-sm font-medium
            border border-white/25 rounded-lg hover:bg-white/10
            active:scale-[0.97] transition-all duration-200"
          >
            Add
          </button>

          <button
  onClick={() => {
  const dismissedCount =
    parseInt(localStorage.getItem("advancedBubbleDismissCount") || "0") + 1;

  localStorage.setItem("advancedBubbleDismissCount", dismissedCount);
  localStorage.setItem("advancedBubbleDismissedAt", Date.now());

  setVisible(false);
}}
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