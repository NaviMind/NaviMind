"use client";

import { useEffect, useRef, useState } from "react";
import { updateProfile } from "firebase/auth";
import { auth } from "@/firebase/config";
import { updateUserProfile, uploadUserAvatar } from "@/firebase/userRepo";

const IcBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IcCamera = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const MAX_AVATAR_MB = 5;

// Account settings: edit avatar + first / last name. Other fields (email,
// password, deletion) are planned for later passes.
export default function AccountScreen({ userDoc, onBack }) {
  const uid = auth.currentUser?.uid || userDoc?.uid || null;
  const fileRef = useRef(null);

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState("");

  // Seed inputs from the loaded user doc.
  useEffect(() => {
    setFirst(userDoc?.firstName || "");
    setLast(userDoc?.lastName || "");
  }, [userDoc?.firstName, userDoc?.lastName]);

  const photoURL = userDoc?.photoURL || auth.currentUser?.photoURL || null;
  const displayName =
    [userDoc?.firstName, userDoc?.lastName].filter(Boolean).join(" ") ||
    userDoc?.displayName || userDoc?.email || "?";
  const initials = displayName
    .split(/\s+/).map((w) => w[0]?.toUpperCase()).filter(Boolean).slice(0, 2).join("");

  const dirty =
    (first.trim() !== (userDoc?.firstName || "")) ||
    (last.trim() !== (userDoc?.lastName || ""));

  const pickAvatar = () => fileRef.current?.click();

  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uid) return;
    if (!file.type?.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) { setError(`Image must be under ${MAX_AVATAR_MB} MB.`); return; }
    setError("");
    setUploading(true);
    try {
      const url = await uploadUserAvatar(uid, file);
      await updateUserProfile(uid, { photoURL: url });
      if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: url });
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setError("Couldn't update photo. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!uid || !dirty || saving) return;
    setSaving(true);
    setError("");
    const f = first.trim();
    const l = last.trim();
    const name = [f, l].filter(Boolean).join(" ");
    try {
      await updateUserProfile(uid, { firstName: f || null, lastName: l || null, displayName: name || null });
      if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: name || null });
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1800);
    } catch (err) {
      console.error("Save profile failed:", err);
      setError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-1 px-3 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-white/70 mr-1"
          aria-label="Back"
        >
          <IcBack />
        </button>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Account</h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-5 py-6">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-7">
          <button
            onClick={pickAvatar}
            disabled={uploading}
            className="relative group rounded-full focus:outline-none"
            aria-label="Change photo"
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-[84px] h-[84px] rounded-full object-cover ring-2 ring-black/10 dark:ring-white/10"
              />
            ) : (
              <div className="w-[84px] h-[84px] rounded-full bg-gradient-to-br from-gray-400 to-gray-600 dark:from-gray-500 dark:to-gray-700 flex items-center justify-center text-white text-[28px] font-semibold select-none ring-2 ring-black/10 dark:ring-white/10">
                {initials}
              </div>
            )}
            {/* Edit overlay */}
            <span className="absolute inset-0 rounded-full bg-black/45 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <IcCamera />
              )}
            </span>
            {/* Small camera badge (always visible hint) */}
            <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-[#0f1623]">
              {uploading ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <IcCamera />
              )}
            </span>
          </button>
          <button
            onClick={pickAvatar}
            disabled={uploading}
            className="mt-3 text-[13px] font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Change photo"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onAvatarChange} />
        </div>

        {/* Name fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1.5">First name</label>
            <input
              type="text"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              placeholder="First name"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1.5">Last name</label>
            <input
              type="text"
              value={last}
              onChange={(e) => setLast(e.target.value)}
              placeholder="Last name"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
            />
          </div>

          {userDoc?.email && (
            <div>
              <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1.5">Email</label>
              <div className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100/60 dark:bg-white/[0.03] text-[14px] text-gray-500 dark:text-gray-400 truncate">
                {userDoc.email}
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-[12px] text-red-500">{error}</p>}

        {/* Save */}
        <button
          onClick={onSave}
          disabled={!dirty || saving}
          className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-default transition-colors"
        >
          {saving && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
          {savedTick ? "Saved ✓" : saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
