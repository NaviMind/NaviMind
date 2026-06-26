"use client";

import { useContext, useState } from "react";
import { UIContext } from "@/context/UIContext";
import InventoryIcon from "./InventoryIcon";

// Sidebar entry for the Drawing Register — same visual language as the
// Vessel Profile / Create Topic rows. The box icon lid lifts on hover.
export default function DrawingRegisterButton({ onSidebarItemClick }) {
  const { setDrawingRegisterOpen } = useContext(UIContext);
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => {
        setDrawingRegisterOpen(true);
        onSidebarItemClick?.();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="
        w-full flex items-center gap-2 px-2.5 py-1 rounded-md
        border border-transparent bg-transparent
        hover:border-blue-500
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        transition-colors duration-200 min-h-[38px]
      "
    >
      <span className="w-5 h-5 flex items-center justify-center text-gray-700 dark:text-gray-200">
        <InventoryIcon isOpen={hovered} size={20} />
      </span>
      <span className="ml-[5px] text-[15px] font-normal text-gray-900 dark:text-gray-100">
        Drawing Register
      </span>
    </button>
  );
}
