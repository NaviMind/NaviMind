"use client";

import { useContext, useEffect, useState } from "react";
import { UIContext } from "@/context/UIContext";
import { auth } from "@/firebase/config";
import { useCurrentUserDoc } from "@/hooks/useCurrentUserDoc";
import Icon from "@/components/common/Icon";

const MOBILE_BREAKPOINT = 900;

export default function UserAvatar() {
  const [profile, setProfile] = useState({
    displayName: "",
    email: "",
    plan: "",
    photoURL: "",
  });

  const { toggleSettings } = useContext(UIContext);
  const { data: userDoc } = useCurrentUserDoc();

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
  }, [userDoc]);

  const initials =
    (profile.displayName || "User")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("") || "U";

  const handleClick = () => {
    toggleSettings(true);
  };

  return (
    <div className="px-0 pb-2 mt-auto w-full">
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-2 px-3.5 py-1 rounded-md border border-transparent bg-transparent hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 min-h-[38px]"
      >
        {profile.photoURL ? (
          <img
            src={profile.photoURL}
            alt={profile.displayName || "User"}
            className="w-8 h-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600">
            <Icon name="person" size={20} />
          </span>
        )}

        <span className="flex flex-col items-start min-w-0 leading-none">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {profile.displayName || "User"}
          </span>
          {profile.plan && (
            <span className="text-[11px] text-gray-500 dark:text-gray-300 font-normal truncate mt-[2px]">
              {profile.plan}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
