"use client";

import { useContext, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { UIContext } from "@/context/UIContext";

export default function SettingsModal() {
  const { isSettingsOpen, toggleSettings } = useContext(UIContext);
  const [activeTab, setActiveTab] = useState("account");
  const modalRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isSettingsOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isSettingsOpen]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    function handleClickOutside(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        toggleSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSettingsOpen, toggleSettings]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    function handleEsc(e) {
      if (e.key === "Escape") toggleSettings(false);
    }
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isSettingsOpen, toggleSettings]);

  if (!isSettingsOpen || !mounted) return null;

  const tabs = [
    { id: "account", label: "Account" },
    { id: "subscription", label: "Subscription" },
    { id: "support", label: "Support" },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Бэкдроп */}
      <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[1990]" />
      {/* Модальное окно */}
      <div
        ref={modalRef}
        className={`
          relative z-[2001] bg-white dark:bg-gray-800
          w-[96vw] max-w-lg
          rounded-2xl shadow-xl p-3 sm:p-6 min-h-[180px]
          flex flex-col justify-start
          transition-all duration-200
        `}
        style={{
          maxWidth: '400px', // чуть меньше max-w на мобиле
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg sm:text-xl font-semibold">Settings</h2>
          <button
            onClick={() => toggleSettings(false)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>
        {/* Body */}
        <div className="flex flex-row gap-2 sm:gap-4 mt-2">
          {/* Sidebar */}
          <div className="flex flex-col w-28 min-w-[88px] pr-2 border-r border-gray-300 dark:border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`block w-full text-left px-2 py-1 mb-1 rounded text-xs sm:text-sm whitespace-nowrap
                  ${activeTab === tab.id
                    ? "bg-gray-700 text-white dark:bg-gray-600"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Content */}
          <div className="flex-1 pl-2">
            {activeTab === "account" && (
              <div>
                <div className="text-xs sm:text-sm mb-1"><span className="font-semibold">Name:</span> John Doe</div>
                <div className="text-xs sm:text-sm mb-1"><span className="font-semibold">Email:</span> john@example.com</div>
              </div>
            )}
            {activeTab === "subscription" && (
              <div>
                <div className="text-xs sm:text-sm mb-1">
                  <span className="font-semibold">Current Plan:</span> NaviMind Pro
                </div>
                <div className="text-xs sm:text-sm mb-2">
                  <span className="font-semibold">Auto-renewal:</span> 2025-12-31
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button className="flex-1 px-3 py-1 bg-gray-700 text-white text-xs sm:text-sm rounded hover:bg-gray-600">
                    Upgrade Plan
                  </button>
                  <button
                    onClick={() =>
                      alert("Cancel Subscription (placeholder)")
                    }
                    className="flex-1 px-3 py-1 bg-red-600 text-white text-xs sm:text-sm rounded hover:bg-red-700"
                  >
                    Cancel Subscription
                  </button>
                </div>
              </div>
            )}
            {activeTab === "support" && (
              <div>
                <div className="text-xs sm:text-sm mb-2">
                  Need help? 
                </div>
                <div className="text-xs sm:text-sm mb-1">
                  <span className="font-semibold">Email:</span> support@navimind.com
                </div>
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold">Telegram:</span> @navimind_suppor
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
