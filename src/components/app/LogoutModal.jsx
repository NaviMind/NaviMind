"use client";

import { useContext, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { UIContext } from "@/context/UIContext";
import { useRouter } from "next/navigation";

export default function LogoutModal() {
  const { isLogoutOpen, toggleLogout } = useContext(UIContext);
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

  const handleConfirmLogout = () => {
    // 👉 если юзаешь Firebase, тут вставь signOut(auth)
    router.push("/");
    toggleLogout(false);
  };

  if (!isLogoutOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-2"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-2xl p-6 w-full max-w-xs sm:max-w-md mx-4 text-center"
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
            className="px-4 py-2 rounded-md bg-gray-500 hover:bg-gray-400 text-white text-sm transition"
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
