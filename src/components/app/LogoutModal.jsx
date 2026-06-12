"use client";

import { useContext, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { UIContext } from "@/context/UIContext";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/config";

export default function LogoutModal() {
  const { isLogoutOpen, toggleLogout, theme } = useContext(UIContext);
  const router = useRouter();
  const modalRef = useRef(null);

  // Клик вне окна — закрыть
  useEffect(() => {
    function handleClickOutside(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        if (isLogoutOpen) toggleLogout(false);
      }
    }
    if (isLogoutOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLogoutOpen, toggleLogout]);

  // Escape — закрыть
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape" && isLogoutOpen) {
        toggleLogout(false);
      }
    }
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isLogoutOpen, toggleLogout]);

  const handleConfirmLogout = async () => {
    localStorage.removeItem("navimind_vessel_profile");
    localStorage.removeItem("navimind_vessel_department");
    toggleLogout(false);
    await signOut(auth);
    router.push("/");
  };

  if (!isLogoutOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm p-2 ${theme === "dark" ? "bg-black/60" : "bg-black/25"}`}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-2xl p-6 w-full max-w-xs sm:max-w-md mx-4 text-center text-gray-900 dark:text-white"
      >
        {/* Заголовок */}
        <h4 className="text-lg font-semibold mb-3">
          Are you sure you want to log out?
        </h4>

        {/* Подпись тонким шрифтом */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          NaviMind will always be here when you return.
        </p>

        {/* Кнопки */}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => toggleLogout(false)}
            className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-500 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmLogout}
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm transition"
          >
            Log out
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
