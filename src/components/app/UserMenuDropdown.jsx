"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, useContext } from "react";
import { UIContext } from "@/context/UIContext";

const MOBILE_BREAKPOINT = 900;

export default function UserMenuDropdown({
  isOpen,
  anchorRef,
  onClose,
  onSettings,
  onHelp,
  user = {},
}) {
  const menuRef = useRef(null);
  const [menuWidth, setMenuWidth] = useState(210);
  const [isMobile, setIsMobile] = useState(false);

  // 🔑 получаем toggleLogout из контекста
  const { toggleLogout } = useContext(UIContext);

  // Адаптивный режим
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Авто-ширина
  useEffect(() => {
    if (!isOpen || !anchorRef?.current) return;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    setMenuWidth(Math.max(anchorRect.width + 2, 170));
  }, [isOpen, anchorRef]);

  // Закрытие по клику вне
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (
        !menuRef.current?.contains(e.target) &&
        !anchorRef?.current?.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, anchorRef, onClose]);

  // Позиционирование
  useEffect(() => {
    if (!isOpen || !anchorRef?.current || !menuRef.current) return;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const menu = menuRef.current;
    menu.style.width = `${menuWidth}px`;
    requestAnimationFrame(() => {
      const menuHeight = menu.offsetHeight;
      let left, top;
      if (isMobile) {
        left = anchorRect.left;
        top = anchorRect.top - menuHeight - 8;
        if (top < 8) top = window.innerHeight - menuHeight - 8;
        if (top + menuHeight > window.innerHeight - 8) {
          top = window.innerHeight - menuHeight - 8;
        }
        menu.style.position = "fixed";
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
      } else {
        left = anchorRect.left + window.scrollX;
        top = anchorRect.top - menuHeight - 8 + window.scrollY;
        if (left < 8) left = 8;
        if (left + menu.offsetWidth > window.innerWidth - 8) {
          left = window.innerWidth - menu.offsetWidth - 8;
        }
        if (top < 8) {
          top = anchorRect.bottom + 8 + window.scrollY;
        }
        menu.style.position = "absolute";
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
      }
      menu.style.zIndex = "1000";
    });
  }, [isOpen, anchorRef, isMobile, menuWidth]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="bg-slate-700/40 backdrop-blur-md text-white rounded-xl shadow-lg border border-white/5 p-1 flex flex-col z-[1000] select-none"
      style={{
        width: `${menuWidth}px`,
        opacity: 1,
        minWidth: 160,
        maxWidth: 320,
      }}
    >
      <button
        onClick={onSettings}
        className="flex items-center w-full text-left px-4 py-2 text-sm font-normal rounded-lg hover:bg-slate-700 transition"
      >
        <img src="/Settings.svg" alt="Settings" className="w-5 h-5 mr-2 opacity-90" />
        Settings
      </button>

      <button
        onClick={onHelp}
        className="flex items-center w-full text-left px-4 py-2 text-sm font-normal rounded-lg hover:bg-slate-700 transition"
      >
        <img src="/Help.svg" alt="Help" className="w-5 h-5 mr-2 opacity-90" />
        Help
      </button>

      {/* 👇 теперь просто открываем модалку через UIContext */}
      <button
        onClick={() => toggleLogout(true)}
        className="flex items-center w-full text-left px-4 py-2 text-sm font-normal rounded-lg hover:bg-slate-700 transition"
      >
        <img src="/Logout.svg" alt="Log Out" className="w-5 h-5 mr-2 opacity-90" />
        Log Out
      </button>
    </div>,
    document.body
  );
}
