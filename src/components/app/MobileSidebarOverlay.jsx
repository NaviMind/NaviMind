"use client";

import { useContext } from "react"; 
import { UIContext } from "@/context/UIContext";
import SidebarContainer from "./sidebar/SidebarContainer";

export default function MobileSidebarOverlay() {
  const { isSidebarOpen, toggleSidebar } = useContext(UIContext);

  return (
    <>
      {/* Sidebar — всегда слева, неподвижен. Main area съезжает вправо поверх него */}
      <SidebarContainer
        mobileMode={true}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />
      {/* Узкий клик-трап — только поверх 3rem полоски main area, закрывает sidebar */}
      <div
        className="fixed top-0 bottom-0 right-0 [@media(hover:hover)]:hidden"
        style={{
          width: "3rem",
          zIndex: 31,
          pointerEvents: isSidebarOpen ? "auto" : "none",
        }}
        onClick={toggleSidebar}
      />
    </>
  );
}
