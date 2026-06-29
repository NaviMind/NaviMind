"use client";

import { useContext } from "react";
import { UIContext } from "@/context/UIContext";
import InventoryIcon from "./InventoryIcon";

// Sidebar entry for Drawings — same visual style as Vessel Profile / Create Topic.
export default function DrawingRegisterButton({ onSidebarItemClick, collapsed = false }) {
  const { setDrawingRegisterOpen } = useContext(UIContext);

  const open = () => {
    setDrawingRegisterOpen(true);
    onSidebarItemClick?.();
  };

  // Collapsed rail — a discrete icon square (label is shown via tooltip upstream).
  if (collapsed) {
    return (
      <button
        onClick={open}
        aria-label="Drawings / Manuals"
        className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
      >
        <InventoryIcon size={20} />
      </button>
    );
  }

  return (
    <button
      onClick={open}
      className="
        w-full flex items-center gap-2 px-2.5 py-1 rounded-md
        border border-transparent bg-transparent
        hover:border-blue-500
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        transition-colors duration-200 min-h-[38px]
      "
    >
      <span className="w-5 h-5 flex items-center justify-center text-gray-700 dark:text-gray-200">
        <InventoryIcon size={20} />
      </span>
      <span className="ml-[5px] text-[15px] font-normal text-gray-900 dark:text-gray-100">
        Drawings / Manuals
      </span>
    </button>
  );
}
