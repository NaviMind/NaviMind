"use client";
import { createContext, useState, useEffect } from "react";
import { auth } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { getVesselProfile } from "@/firebase/userRepo";

export const UIContext = createContext();

export function UIProvider({ children }) {
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isLogoutOpen, setLogoutOpen] = useState(false);
  const [themePreference, setThemePreferenceState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("themePreference") || "system";
    }
    return "system";
  });
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const pref = localStorage.getItem("themePreference") || "system";
      if (pref === "dark") return "dark";
      if (pref === "light") return "light";
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });
  const [language, setLanguage] = useState("EN");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [advancedTouched, setAdvancedTouched] = useState(false);
  const [advancedCompleted, setAdvancedCompleted] = useState(false);
  const [vesselProfileSaved, setVesselProfileSaved] = useState(false);
  const [vesselProfileData, setVesselProfileData] = useState(null);
  const [openAdvancedDirectly, setOpenAdvancedDirectly] = useState(false);

  // Single source of truth for which full-screen modal is visible.
  // Only one modal can be open at a time; pendingModal queues the next one
  // so the current exit animation completes before the next one enters.
  const [activeModal, setActiveModal] = useState(null); // 'vesselProfile' | 'topicLibrary' | 'drawings' | null
  const [pendingModal, setPendingModal] = useState(null);

  // Backward-compat booleans — consumed by each modal component unchanged.
  const isVesselProfileOpen = activeModal === "vesselProfile";
  const isTopicModalOpen    = activeModal === "topicLibrary";
  const isDrawingRegisterOpen = activeModal === "drawings";

  // Request a modal to open. If another is already open, queue this one and
  // close the current one first; the useEffect below opens the pending one
  // once the exit animation has had time to complete.
  const openModal = (name) => {
    // The Library and Search modals live outside this system (local state).
    // Tell them to close so modals never stack.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nm-close-topic-library"));
      window.dispatchEvent(new CustomEvent("nm-close-search"));
      window.dispatchEvent(new CustomEvent("nm-close-topic-instructions"));
    }
    if (activeModal && activeModal !== name) {
      setPendingModal(name);
      setActiveModal(null);
    } else if (!activeModal) {
      setActiveModal(name);
      setPendingModal(null);
    }
    // activeModal === name → already open, nothing to do
  };

  // Close every UIContext-managed modal (used when the Library modal opens).
  const closeModals = () => {
    setPendingModal(null);
    setActiveModal(null);
  };

  useEffect(() => {
    if (activeModal === null && pendingModal) {
      // Give the exit animation (0.45 s) time to finish before opening next.
      const t = setTimeout(() => {
        setActiveModal(pendingModal);
        setPendingModal(null);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [activeModal, pendingModal]);

  // Backward-compat setters — all existing callers work without changes.
  const setVesselProfileOpen  = (v) => v ? openModal("vesselProfile")  : setActiveModal((m) => m === "vesselProfile"  ? null : m);
  const setIsTopicModalOpen   = (v) => v ? openModal("topicLibrary")   : setActiveModal((m) => m === "topicLibrary"   ? null : m);
  const setDrawingRegisterOpen = (v) => v ? openModal("drawings")       : setActiveModal((m) => m === "drawings"       ? null : m);

  // Step 1: immediately hydrate from localStorage (no network delay)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("navimind_vessel_profile");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.rank && parsed.vesselType) {
          setVesselProfileSaved(true);
          setVesselProfileData(parsed); // full profile as cache
        }
      }
    } catch {}
  }, []);

  // Step 2: sync with Firestore once auth resolves (authoritative source)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user?.uid) return;
      try {
        const profile = await getVesselProfile(user.uid);
        if (profile?.rank && profile?.vesselType) {
          setVesselProfileSaved(true);
          setVesselProfileData(profile);
          // Keep localStorage in sync as cache
          localStorage.setItem("navimind_vessel_profile", JSON.stringify(profile));
        }
      } catch {}
    });
    return () => unsubscribe();
  }, []);
  
  const [isSidebarOpen, setSidebarOpen] = useState(() => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("sidebarOpen");
    if (saved !== null) return saved === "true";
    return window.innerWidth > 900; 
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

  // 🔹 pendingPrompt — текст для НЕМЕДЛЕННОЙ отправки
  // (клик по followup-подсказке под последним ответом)
  const [pendingPrompt, setPendingPrompt] = useState("");

  useEffect(() => {
    localStorage.setItem("sidebarOpen", isSidebarOpen);
  }, [isSidebarOpen]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    if (themePreference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    setTheme(mq.matches ? "dark" : "light");
    return () => mq.removeEventListener("change", handler);
  }, [themePreference]);

  const setThemePreference = (pref) => {
    setThemePreferenceState(pref);
    localStorage.setItem("themePreference", pref);
    if (pref === "light") {
      setTheme("light");
    } else if (pref === "dark") {
      setTheme("dark");
    } else {
      setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }
  };

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
        themePreference,
        setThemePreference,
        language,
        setLanguage,
        inputText,
        setInputText,
        pendingPrompt,
        setPendingPrompt,
        isFullscreen,
        advancedTouched,
        setAdvancedTouched,
        advancedCompleted,
        setAdvancedCompleted,
        vesselProfileSaved,
        setVesselProfileSaved,
        vesselProfileData,
        setVesselProfileData,
        isVesselProfileOpen,
        setVesselProfileOpen,
        openAdvancedDirectly,
        setOpenAdvancedDirectly,
        isTopicModalOpen,
        setIsTopicModalOpen,
        isDrawingRegisterOpen,
        setDrawingRegisterOpen,
        closeModals,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}
