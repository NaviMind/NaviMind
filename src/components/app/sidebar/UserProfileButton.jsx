"use client";

import { useContext } from "react";
import { UIContext } from "@/context/UIContext";
import { auth } from "@/firebase/config";
import { useCurrentUserDoc } from "@/hooks/useCurrentUserDoc";
import PlanChip from "@/components/common/PlanChip";
export default function UserAvatar({ collapsed = false }) {
  const { toggleSettings } = useContext(UIContext);
  const { data: userDoc, loading } = useCurrentUserDoc();

  // While Firebase resolves auth/user doc, show a stable skeleton instead of
  // flashing the default placeholder avatar ("User" + generic icon).
  if (loading) {
    return (
      <div className={collapsed ? "pb-2 mt-auto" : "px-0 pb-2 mt-auto w-full"}>
        <div className={collapsed
          ? "w-10 h-10 flex items-center justify-center"
          : "w-full flex items-center gap-2 py-1 min-h-[38px] px-3.5"}>
          <span className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse flex-shrink-0" />
          {!collapsed && <span className="h-3 w-24 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />}
        </div>
      </div>
    );
  }

  const u = auth.currentUser;
  const displayName =
    userDoc?.displayName ||
    [userDoc?.firstName, userDoc?.lastName].filter(Boolean).join(" ") ||
    u?.displayName ||
    (u?.email ? u.email.split("@")[0] : "") ||
    "User";
  const photoURL = userDoc?.photoURL || u?.photoURL || "";

  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  const handleClick = () => {
    toggleSettings(true);
  };

  return (
    <div className={collapsed ? "pb-2 mt-auto" : "px-0 pb-2 mt-auto w-full"}>
      <button
        onClick={handleClick}
        className={collapsed
          ? "group w-10 h-10 flex items-center justify-center"
          : "w-full flex items-center gap-2 py-1 rounded-md border border-transparent bg-transparent hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 min-h-[38px] px-3.5"}
      >
        {/* Collapsed: round avatar that gets a blue ring + glow on hover. */}
        {photoURL ? (
          <img
            src={photoURL}
            alt={displayName}
            className={`w-8 h-8 rounded-full object-cover flex-shrink-0 ${collapsed ? "ring-2 ring-gray-200 dark:ring-white/10 group-hover:ring-blue-500 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.55)] transition-all duration-200" : ""}`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className={`flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0 text-white text-[13px] font-semibold select-none ${collapsed ? "ring-2 ring-gray-200 dark:ring-white/10 group-hover:ring-blue-500 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.55)] transition-all duration-200" : ""}`}>
            {initials}
          </span>
        )}

        {!collapsed && (
          <>
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate min-w-0">
              {displayName}
            </span>
            <span className="ml-auto flex-shrink-0">
              <PlanChip plan={userDoc?.plan || "free"} />
            </span>
          </>
        )}
      </button>
    </div>
  );
}
