"use client";

import { useContext } from "react"; 
import { UIContext } from "@/context/UIContext";
import SidebarContainer from "./sidebar/SidebarContainer";

export default function MobileSidebarOverlay() {
  const { isSidebarOpen, toggleSidebar } = useContext(UIContext);

  return (
    <>
      {/* Dim/blur-подложка */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 sm:hidden
          ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={toggleSidebar}
      />
      {/* Сам Sidebar — рендерим SidebarContainer (он у тебя основной) */}
      <SidebarContainer
        mobileMode={true}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />
    </>
  );
}
