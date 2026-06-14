"use client";

import { useContext } from "react";
import { UIContext } from "@/context/UIContext";
import { auth } from "@/firebase/config";
import { useCurrentUserDoc } from "@/hooks/useCurrentUserDoc";
import Icon from "@/components/common/Icon";

export default function UserAvatar() {
  const { toggleSettings } = useContext(UIContext);
  const { data: userDoc, loading } = useCurrentUserDoc();

  // While Firebase resolves auth/user doc, show a stable skeleton instead of
  // flashing the default placeholder avatar ("User" + generic icon).
  if (loading) {
    return (
      <div className="px-0 pb-2 mt-auto w-full">
        <div className="w-full flex items-center gap-2 px-3.5 py-1 min-h-[38px]">
          <span className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse flex-shrink-0" />
          <span className="h-3 w-24 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
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

  const handleClick = () => {
    toggleSettings(true);
  };

  return (
    <div className="px-0 pb-2 mt-auto w-full">
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-2 px-3.5 py-1 rounded-md border border-transparent bg-transparent hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 min-h-[38px]"
      >
        {photoURL ? (
          <img
            src={photoURL}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 flex-shrink-0">
            <Icon name="person" size={20} />
          </span>
        )}

        <span className="text-sm font-medium text-gray-900 dark:text-white truncate min-w-0">
          {displayName}
        </span>
      </button>
    </div>
  );
}
