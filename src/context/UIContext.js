"use client";
import { createContext, useState, useEffect } from "react";

export const UIContext = createContext();

export function UIProvider({ children }) {
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isLogoutOpen, setLogoutOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("EN");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(() => {
  // если уже есть сохранённое значение — читаем его
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("sidebarOpen");
    if (saved !== null) return saved === "true";
    // если нет сохранённого — по ширине экрана
    return window.innerWidth > 900; // десктоп открыт, мобилка закрыта
  }
  return true;
});

    // ✅ Отслеживаем fullscreen (PWA или F11)
 useEffect(() => {
  const compute = () => {
    const dom = !!document.fullscreenElement; // requestFullscreen()
    const dmStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
    const dmFullscreen = window.matchMedia?.("(display-mode: fullscreen)")?.matches;
    const dmMinimal   = window.matchMedia?.("(display-mode: minimal-ui)")?.matches;
    const iosStandalone = "standalone" in window.navigator && window.navigator.standalone; // iOS PWA
    

    setIsFullscreen(Boolean(dom || dmStandalone || dmFullscreen || dmMinimal || iosStandalone));
  };

  // 1) первичный замер
  compute();

  // 2) слушатели изменений
  document.addEventListener("fullscreenchange", compute);
  const mq1 = window.matchMedia?.("(display-mode: standalone)");
  const mq2 = window.matchMedia?.("(display-mode: fullscreen)");
  const mq3 = window.matchMedia?.("(display-mode: minimal-ui)");
  mq1?.addEventListener?.("change", compute);
  mq2?.addEventListener?.("change", compute);
  mq3?.addEventListener?.("change", compute);

  // 3) запасной вариант для F11 в некоторых браузерах
  window.addEventListener("resize", compute);

  return () => {
    document.removeEventListener("fullscreenchange", compute);
    mq1?.removeEventListener?.("change", compute);
    mq2?.removeEventListener?.("change", compute);
    mq3?.removeEventListener?.("change", compute);
    window.removeEventListener("resize", compute);
  };
}, []);

  // 🔹 Новый inputText и setter
  const [inputText, setInputText] = useState("");

  useEffect(() => {
    localStorage.setItem("sidebarOpen", isSidebarOpen);
  }, [isSidebarOpen]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const toggleSettings = (val) => setSettingsOpen(val);
  const toggleLogout = (val) => setLogoutOpen(val);

  return (
    <UIContext.Provider
      value={{
        isSidebarOpen,
        toggleSidebar,
        isSettingsOpen,
        toggleSettings,
        isLogoutOpen,
        toggleLogout,
        theme,
        setTheme,
        language,
        setLanguage,
        inputText,        
        setInputText, 
        isFullscreen    
      }}
    >
      {children}
    </UIContext.Provider>
  );
}
