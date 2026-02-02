"use client";

import { useState, useRef, useContext, useEffect } from "react";
import UserMenuDropdown from "@/components/app/UserMenuDropdown";
import { UIContext } from "@/context/UIContext";
import { auth } from "@/firebase/config";
import { useCurrentUserDoc } from "@/hooks/useCurrentUserDoc";

const MOBILE_BREAKPOINT = 900;

export default function UserAvatar() {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const avatarRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ left: 0, bottom: 0 });

  // 🔹 Данные пользователя (локальный стейт чтобы не ломать твой рендер)
  const [profile, setProfile] = useState({
    displayName: "John Doe",
    email: "",
    plan: "Free plan",
    photoURL: "",
  });

  const { toggleSettings, toggleLogout, toggleSidebar, isSidebarOpen } =
    useContext(UIContext);

  // 🧲 Берём профиль из безопасного хука (только свой users/{uid})
  const { data: userDoc } = useCurrentUserDoc();

  // Сводим в один объект с понятными фолбэками
  useEffect(() => {
    const u = auth.currentUser;

    const displayName =
      userDoc?.displayName ||
      [userDoc?.firstName, userDoc?.lastName].filter(Boolean).join(" ") ||
      u?.displayName ||
      (u?.email ? u.email.split("@")[0] : "") ||
      "User";

    const email = userDoc?.email || u?.email || "";
    const photoURL = userDoc?.photoURL || u?.photoURL || "";
    const plan = userDoc?.plan || "Free plan";

    setProfile({ displayName, email, plan, photoURL });
  }, [userDoc]); // хук сам дергается при логине/логауте

  // 🔤 Инициалы (если нет фото)
  const initials =
    (profile.displayName || "User")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("") || "U";

  // Позиционируем дропдаун
  useEffect(() => {
    if (isDropdownOpen && avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setDropdownPos({
        left: rect.left,
        bottom: window.innerHeight - rect.top + 8,
      });
    }
  }, [isDropdownOpen]);

  const handleAvatarClick = () => setDropdownOpen((p) => !p);
  const closeDropdown = () => setDropdownOpen(false);

  // --- Logout (как и было) ---
  const handleLogout = () => {
    closeDropdown();
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      if (isSidebarOpen) toggleSidebar();
      setTimeout(() => toggleLogout(true), 220);
    } else {
      toggleLogout(true);
    }
  };

  const handleHelp = () => {
    closeDropdown();
    // твоя логика Help, если нужна
  };

  return (
    <div className="px-0 pb-2 mt-auto w-full">
      <button
        ref={avatarRef}
        onClick={handleAvatarClick}
       className="
   w-full flex items-center gap-2 px-3.5 py-1 rounded-md
  border border-transparent
  bg-transparent
  hover:border-blue-500
  focus:outline-none focus:ring-2 focus:ring-blue-500
  transition-colors duration-200 min-h-[38px]
"
      >

        {/* Фото из Google/профиля или иконка */}
{profile.photoURL ? (
  <img
    src={profile.photoURL}
    alt={profile.displayName || "User"}
    className="w-8 h-8 rounded-full object-cover"
    referrerPolicy="no-referrer"
  />
) : (
  <span
    className="
      flex items-center justify-center w-8 h-8 rounded-full
      bg-blue-600
    "
  >
    <img
      src="Person User.svg"
      alt="User icon"
      className="w-5 h-5"
      draggable="false"
    />
  </span>
)}

        <span className="flex flex-col items-start min-w-0 leading-none">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {profile.displayName || "John Doe"}
          </span>
          {profile.plan ? (
            <span className="text-[11px] text-gray-500 dark:text-gray-300 font-normal truncate mt-[2px]">
              {profile.plan}
            </span>
          ) : null}
        </span>
      </button>

      {isDropdownOpen && (
        <UserMenuDropdown
          isOpen={isDropdownOpen}
          anchorRef={avatarRef}
          onClose={closeDropdown}
          onSettings={() => {
            closeDropdown();
            toggleSettings(true);
          }}
          onHelp={handleHelp}
          onLogout={handleLogout}
          dropdownPos={dropdownPos}
        />
      )}
    </div>
  );
}
