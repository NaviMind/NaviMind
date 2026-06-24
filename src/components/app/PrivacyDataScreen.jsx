"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "@/firebase/config";
import { loadUserTopics, updateTopicMemory } from "@/firebase/chatStore";
import {
  clearAllConversations,
  purgeAllUserData,
  downloadUserDataExport,
} from "@/firebase/privacyData";

// ─── icons ──────────────────────────────────────────────────────────────────

const IcBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IcChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-[13px] h-[13px] text-gray-400 flex-shrink-0">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IcExport = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[19px] h-[19px]">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IcMemory = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[19px] h-[19px]">
    <path d="M12 2a4 4 0 0 0-4 4v1a3 3 0 0 0-1 5.83V16a3 3 0 0 0 5 2.24A3 3 0 0 0 17 16v-3.17A3 3 0 0 0 16 7V6a4 4 0 0 0-4-4z" />
    <path d="M12 2v20" />
  </svg>
);
const IcBroom = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[19px] h-[19px]">
    <path d="M19.4 7.6 12 15M22 2l-4.5 4.5M9.8 12.2 3 19a2 2 0 0 0 0 3h0M6.5 15.5 11 20" />
    <path d="m3 22 4-1c2-.5 3-2 3-4" />
  </svg>
);
const IcTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[19px] h-[19px]">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const Spinner = ({ className = "" }) => (
  <span className={`inline-block rounded-full border-2 border-current border-t-transparent animate-spin ${className}`} />
);

// ─── a tappable action row ──────────────────────────────────────────────────

function ActionRow({ icon, label, sub, onPress, danger, busy, right, disabled }) {
  return (
    <button
      onClick={onPress}
      disabled={disabled || busy}
      className={`w-full flex items-center gap-3 px-4 py-[13px] text-left rounded-2xl ring-1 transition-colors disabled:opacity-60
        ${danger
          ? "bg-red-50/60 dark:bg-red-500/[0.07] ring-red-200/70 dark:ring-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/[0.12] text-red-600 dark:text-red-400"
          : "bg-gray-50 dark:bg-white/[0.05] ring-gray-200 dark:ring-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.08] text-gray-800 dark:text-white/90"}`}
    >
      <span className={danger ? "text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] leading-tight">{label}</span>
        {sub && <span className="block text-[11.5px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</span>}
      </span>
      {busy ? <Spinner className="w-4 h-4" /> : right}
    </button>
  );
}

// ─── confirmation overlay ───────────────────────────────────────────────────

function ConfirmOverlay({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
  danger = true,
  // optional gated confirmation: user must type `requireText` (e.g. "DELETE")
  requireText,
  // optional password field (re-auth for password accounts)
  needPassword,
}) {
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
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Current password"
            autoFocus
            className="mt-3 w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-400 dark:focus:border-blue-500"
          />
        )}

        {requireText && (
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={`Type ${requireText} to confirm`}
            autoFocus={!needPassword}
            className="mt-3 w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-red-400 dark:focus:border-red-500"
          />
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-xl text-[14px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(password)}
            disabled={!canConfirm}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium text-white disabled:opacity-50 transition-colors
              ${danger ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"}`}
          >
            {busy && <Spinner className="w-4 h-4" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Manage memory view ─────────────────────────────────────────────────────

function MemoryView({ uid, onBack }) {
  const [topics, setTopics] = useState(null); // null = loading
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const load = async () => {
    if (!uid) return;
    const all = await loadUserTopics(uid);
    const withMem = all
      .map((t) => ({ topicId: t.topicId, name: t.name || t.title || "Untitled topic", memory: t.topicMemory || "" }))
      .filter((t) => t.memory.trim().length > 0);
    setTopics(withMem);
    setDrafts(Object.fromEntries(withMem.map((t) => [t.topicId, t.memory])));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [uid]);

  const saveOne = async (topicId) => {
    setSavingId(topicId);
    try {
      await updateTopicMemory(uid, topicId, drafts[topicId] ?? "");
    } finally {
      setSavingId(null);
    }
  };

  const clearOne = async (topicId) => {
    setSavingId(topicId);
    try {
      await updateTopicMemory(uid, topicId, "");
      setTopics((prev) => prev.filter((t) => t.topicId !== topicId));
    } finally {
      setSavingId(null);
    }
  };

  const clearAll = async () => {
    if (!topics?.length) { setConfirmClearAll(false); return; }
    setClearingAll(true);
    try {
      await Promise.all(topics.map((t) => updateTopicMemory(uid, t.topicId, "")));
      setTopics([]);
    } finally {
      setClearingAll(false);
      setConfirmClearAll(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-white/70 mr-1" aria-label="Back">
          <IcBack />
        </button>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Manage memory</h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-5 py-5">
        <p className="text-[12.5px] leading-relaxed text-gray-500 dark:text-gray-400 mb-4">
          What the assistant remembers from each topic. Edit or clear anything below — changes apply to future replies.
        </p>

        {topics === null ? (
          <div className="flex justify-center py-10 text-gray-400"><Spinner className="w-5 h-5" /></div>
        ) : topics.length === 0 ? (
          <p className="text-[13px] text-gray-400 dark:text-gray-500 text-center py-10">No memory stored yet.</p>
        ) : (
          <div className="space-y-4">
            {topics.map((t) => (
              <div key={t.topicId} className="rounded-2xl ring-1 ring-gray-200 dark:ring-white/[0.06] bg-gray-50 dark:bg-white/[0.04] p-3.5">
                <p className="text-[13px] font-medium text-gray-800 dark:text-white/90 mb-2 truncate">{t.name}</p>
                <textarea
                  value={drafts[t.topicId] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [t.topicId]: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[13px] text-gray-900 dark:text-white outline-none focus:border-blue-400 dark:focus:border-blue-500 resize-none"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => saveOne(t.topicId)}
                    disabled={savingId === t.topicId || (drafts[t.topicId] ?? "") === t.memory}
                    className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors"
                  >
                    {savingId === t.topicId ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => clearOne(t.topicId)}
                    disabled={savingId === t.topicId}
                    className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={() => setConfirmClearAll(true)}
              className="w-full mt-1 px-4 py-2.5 rounded-xl text-[13px] font-medium text-red-600 dark:text-red-400 bg-red-50/60 dark:bg-red-500/[0.07] ring-1 ring-red-200/70 dark:ring-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/[0.12] transition-colors"
            >
              Clear all memory
            </button>
          </div>
        )}
      </div>

      {confirmClearAll && (
        <ConfirmOverlay
          title="Clear all memory?"
          message="The assistant will forget everything it learned across all topics. Your chats themselves stay."
          confirmLabel="Clear all"
          busy={clearingAll}
          onCancel={() => setConfirmClearAll(false)}
          onConfirm={clearAll}
        />
      )}
    </div>
  );
}

// ─── main Privacy & Data screen ─────────────────────────────────────────────

export default function PrivacyDataScreen({ userDoc, onBack }) {
  const router = useRouter();
  const uid = auth.currentUser?.uid || userDoc?.uid || null;
  const provider = auth.currentUser?.providerData?.[0]?.providerId || userDoc?.authProvider || "password";
  const isPasswordUser = provider === "password";

  const [view, setView] = useState("main"); // "main" | "memory"
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onExport = async () => {
    if (!uid || exporting) return;
    setExporting(true);
    setError("");
    try {
      await downloadUserDataExport(uid);
    } catch (err) {
      console.error("Export failed:", err);
      setError("Couldn't export your data. Try again.");
    } finally {
      setExporting(false);
    }
  };

  const onClearChats = async () => {
    if (!uid || clearing) return;
    setClearing(true);
    setError("");
    try {
      await clearAllConversations(uid);
      setConfirmClear(false);
    } catch (err) {
      console.error("Clear chats failed:", err);
      setError("Couldn't clear chats. Try again.");
    } finally {
      setClearing(false);
    }
  };

  const onDeleteAccount = async (password) => {
    const user = auth.currentUser;
    if (!uid || !user || deleting) return;
    setDeleting(true);
    setError("");
    try {
      // Firebase requires a recent login before account deletion. Re-auth by
      // provider: Google → popup, email/password → credential.
      if (isPasswordUser) {
        const cred = EmailAuthProvider.credential(user.email, password || "");
        await reauthenticateWithCredential(user, cred);
      } else {
        await reauthenticateWithPopup(user, googleProvider);
      }

      // Purge data while still authenticated (security rules require it), then
      // remove the auth user itself.
      await purgeAllUserData(uid);
      await deleteUser(user);

      // Mirror the logout cleanup and leave the app.
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

  if (view === "memory") {
    return <MemoryView uid={uid} onBack={() => setView("main")} />;
  }

  return (
    <div className="relative flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-1 px-3 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-white/70 mr-1" aria-label="Back">
          <IcBack />
        </button>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Privacy &amp; Data</h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-5 py-5">
        {/* Your data */}
        <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Your data</p>
        <div className="space-y-2">
          <ActionRow
            icon={<IcExport />}
            label="Export my data"
            sub="Download all your chats and profile as JSON"
            busy={exporting}
            onPress={onExport}
            right={<IcChevron />}
          />
          <ActionRow
            icon={<IcMemory />}
            label="Manage memory"
            sub="View, edit or clear what the assistant remembers"
            onPress={() => setView("memory")}
            right={<IcChevron />}
          />
        </div>

        {/* Danger zone */}
        <p className="px-1 mt-6 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Danger zone</p>
        <div className="space-y-2">
          <ActionRow
            icon={<IcBroom />}
            label="Clear all chats"
            sub="Delete every chat and topic. Your account stays."
            danger
            onPress={() => setConfirmClear(true)}
          />
          <ActionRow
            icon={<IcTrash />}
            label="Delete account"
            sub="Permanently erase your account and all data"
            danger
            onPress={() => setConfirmDelete(true)}
          />
        </div>

        {error && <p className="mt-4 text-[12px] text-red-500">{error}</p>}
      </div>

      {confirmClear && (
        <ConfirmOverlay
          title="Clear all chats?"
          message="This permanently deletes every chat and topic, including their memory and uploaded documents. Your account and profile stay. This can't be undone."
          confirmLabel="Clear all"
          busy={clearing}
          onCancel={() => setConfirmClear(false)}
          onConfirm={onClearChats}
        />
      )}

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
