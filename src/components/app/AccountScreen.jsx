"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateProfile,
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "@/firebase/config";
import { updateUserProfile, uploadUserAvatar } from "@/firebase/userRepo";
import { purgeAllUserData } from "@/firebase/privacyData";

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

const IcDeleteForever = () => (
  <svg viewBox="0 -960 960 960" fill="currentColor" className="w-[20px] h-[20px]">
    <path d="m376-300 104-104 104 104 56-56-104-104 104-104-56-56-104 104-104-104-56 56 104 104-104 104 56 56Zm-96 180q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520Zm-400 0v520-520Z" />
  </svg>
);

const Spinner = ({ className = "" }) => (
  <span className={`inline-block rounded-full border-2 border-current border-t-transparent animate-spin ${className}`} />
);

function ConfirmOverlay({ title, message, confirmLabel, onConfirm, onCancel, busy, danger = true, requireText, needPassword }) {
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const textOk = !requireText || typed.trim().toUpperCase() === requireText.toUpperCase();
  const passOk = !needPassword || password.length > 0;
  const canConfirm = textOk && passOk && !busy;

  return (
    <div className="absolute inset-0 z-30 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="w-full max-w-[330px] rounded-2xl bg-white dark:bg-[#141c2b] ring-1 ring-black/10 dark:ring-white/10 shadow-2xl p-5">
        <h4 className="text-[15px] font-semibold text-gray-900 dark:text-white">{title}</h4>
        <p className="mt-2 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">{message}</p>
        {needPassword && (
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Current password" autoFocus
            className="mt-3 w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-400 dark:focus:border-blue-500"
          />
        )}
        {requireText && (
          <input type="text" value={typed} onChange={(e) => setTyped(e.target.value)}
            placeholder={`Type ${requireText} to confirm`} autoFocus={!needPassword}
            className="mt-3 w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-red-400 dark:focus:border-red-500"
          />
        )}
        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-xl text-[14px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] disabled:opacity-60 transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(password)} disabled={!canConfirm}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium text-white disabled:opacity-50 transition-colors
              ${danger ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"}`}>
            {busy && <Spinner className="w-4 h-4" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const MAX_AVATAR_MB = 5;

export default function AccountScreen({ userDoc, onBack }) {
  const router = useRouter();
  const uid = auth.currentUser?.uid || userDoc?.uid || null;
  const provider = auth.currentUser?.providerData?.[0]?.providerId || userDoc?.authProvider || "password";
  const isPasswordUser = provider === "password";
  const fileRef = useRef(null);

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState("");

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const onInputFocus = (e) => {
    const el = e.target;
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 320);
  };

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

  const onRemovePhoto = async () => {
    if (!uid || uploading || removing || !photoURL) return;
    setRemoving(true);
    setError("");
    try {
      await updateUserProfile(uid, { photoURL: null });
      if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: "" });
    } catch (err) {
      console.error("Remove photo failed:", err);
      setError("Couldn't remove photo. Try again.");
    } finally {
      setRemoving(false);
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

  const onDeleteAccount = async (password) => {
    const user = auth.currentUser;
    if (!uid || !user || deleting) return;
    setDeleting(true);
    setError("");
    try {
      if (isPasswordUser) {
        const cred = EmailAuthProvider.credential(user.email, password || "");
        await reauthenticateWithCredential(user, cred);
      } else {
        await reauthenticateWithPopup(user, googleProvider);
      }
      await purgeAllUserData(uid);
      await deleteUser(user);
      localStorage.removeItem("navimind_vessel_profile");
      localStorage.removeItem("navimind_vessel_department");
      try { await signOut(auth); } catch {}
      router.push("/");
    } catch (err) {
      console.error("Delete account failed:", err);
      const code = err?.code || "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Incorrect password.");
      } else if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setError("Re-authentication was cancelled.");
      } else {
        setError("Couldn't delete the account. Try again.");
      }
      setDeleting(false);
    }
  };

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
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
            disabled={uploading || removing}
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
              <div className="w-[84px] h-[84px] rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[28px] font-semibold select-none ring-2 ring-black/10 dark:ring-white/10">
                {initials}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-[#0f1623] group-hover:bg-blue-500 transition-colors">
              {uploading ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <IcCamera />
              )}
            </span>
          </button>

          {photoURL && (
            <button
              onClick={onRemovePhoto}
              disabled={uploading || removing}
              className="mt-3 text-[13px] font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-60 transition-colors"
            >
              {removing ? "Removing…" : "Remove photo"}
            </button>
          )}

          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onAvatarChange} />
        </div>

        {/* Name & email fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1.5">First name</label>
            <input
              type="text"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              placeholder="First name"
              onFocus={onInputFocus}
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
              onFocus={onInputFocus}
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

        <button
          onClick={onSave}
          disabled={!dirty || saving}
          className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-default transition-colors"
        >
          {saving && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
          {savedTick ? "Saved ✓" : saving ? "Saving…" : "Save changes"}
        </button>

        {/* Delete account */}
        <div className="mt-8">
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center gap-3 px-4 py-[13px] text-left rounded-2xl ring-1 bg-gray-50 dark:bg-white/[0.05] ring-gray-200 dark:ring-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors text-red-600 dark:text-red-400"
          >
            <span className="text-red-500 dark:text-red-400"><IcDeleteForever /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] leading-tight">Delete account</span>
              <span className="block text-[11.5px] text-gray-400 dark:text-gray-500 mt-0.5">Permanently erase your account and all data</span>
            </span>
          </button>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmOverlay
          title="Delete account?"
          message={
            isPasswordUser
              ? "This erases your account and all data forever. Enter your password to confirm."
              : "This erases your account and all data forever. You'll be asked to re-authenticate with Google to confirm."
          }
          confirmLabel="Delete account"
          busy={deleting}
          requireText="DELETE"
          needPassword={isPasswordUser}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={(password) => onDeleteAccount(password)}
        />
      )}
    </div>
  );
}
