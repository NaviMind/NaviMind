"use client";

import { useContext } from "react";
import { UIContext } from "@/context/UIContext";

export default function MainAreaWrapper({ children }) {
  const { isSidebarOpen } = useContext(UIContext);

  const mainWidth = isSidebarOpen
    ? "calc(100vw - 256px)"
    : "100vw";

  return (
    <div
      className="flex flex-col flex-1 min-h-0 transition-[width] duration-300 ease-in-out"
      style={{ width: mainWidth }}
    >
      {children}
    </div>
  );
}
