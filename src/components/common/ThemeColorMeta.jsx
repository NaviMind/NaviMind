"use client";

import { useContext, useEffect } from "react";
import { UIContext } from "@/context/UIContext";

export default function ThemeColorMeta() {
  const { theme } = useContext(UIContext);

  useEffect(() => {
    const color = theme === "dark" ? "#0b1220" : "#ffffff";
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [theme]);

  return null;
}
