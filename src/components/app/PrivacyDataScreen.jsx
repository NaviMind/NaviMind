"use client";

import { useEffect, useState } from "react";
import { auth } from "@/firebase/config";
import { loadUserTopics, updateTopicMemory } from "@/firebase/chatStore";
import { updateUserProfile } from "@/firebase/userRepo";
import { clearAllConversations, downloadUserDataExport } from "@/firebase/privacyData";

// ─── icons (Material Design, viewBox 0 -960 960 960) ────────────────────────

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
  <svg viewBox="0 -960 960 960" fill="currentColor" className="w-[20px] h-[20px]">
    <path d="M480-480ZM202-65l-56-57 118-118h-90v-80h226v226h-80v-89L202-65Zm278-15v-80h240v-440H520v-200H240v400h-80v-400q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H480Z" />
  </svg>
);
const IcMemory = () => (
  <svg viewBox="0 -960 960 960" fill="currentColor" className="w-[20px] h-[20px]">
    <path d="M360-360v-240h240v240H360Zm80-80h80v-80h-80v80Zm-80 320v-80h-80q-33 0-56.5-23.5T200-280v-80h-80v-80h80v-80h-80v-80h80v-80q0-33 23.5-56.5T280-760h80v-80h80v80h80v-80h80v80h80q33 0 56.5 23.5T760-680v80h80v80h-80v80h80v80h-80v80q0 33-23.5 56.5T680-200h-80v80h-80v-80h-80v80h-80Zm320-160v-400H280v400h400ZM480-480Z" />
  </svg>
);
const IcDelete = () => (
  <svg viewBox="0 -960 960 960" fill="currentColor" className="w-[20px] h-[20px]">
    <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
  </svg>
);
const Spinner = ({ className = "" }) => (
  <span className={`inline-block rounded-full border-2 border-current border-t-transparent animate-spin ${className}`} />
);

// ─── action row (tappable) ──────────────────────────────────────────────────

function ActionRow({ icon, label, sub, onPress, danger, busy, right, disabled }) {
  return (
    <button
      onClick={onPress}
      disabled={disabled || busy}
      className={`w-full flex items-center gap-3 px-4 py-[13px] text-left rounded-2xl ring-1 transition-colors disabled:opacity-60
        ${danger
          ? "bg-gray-50 dark:bg-white/[0.05] ring-gray-200 dark:ring-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.08] text-red-600 dark:text-red-400"
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

// ─── toggle row ─────────────────────────────────────────────────────────────

function ToggleRow({ label, sub, checked, onToggle }) {
  return (
    <div className="flex items-center gap-3 px-4 py-[13px] rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06]">
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] text-gray-800 dark:text-white/90 leading-tight">{label}</span>
        {sub && <span className="block text-[11.5px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</span>}
      </span>
      <button
        onClick={onToggle}
        aria-checked={checked}
        role="switch"
        className={`relative overflow-hidden flex-shrink-0 w-[34px] h-[20px] rounded-full border transition-colors duration-200
          ${checked
            ? "bg-gradient-to-br from-blue-500 to-blue-600 border-transparent shadow shadow-blue-900/30"
            : "bg-gray-200/80 dark:bg-gray-700/60 border-gray-300/40 dark:border-white/10"}`}
      >
        <span className={`absolute top-[2px] left-0 w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200
          ${checked ? "translate-x-[16px]" : "translate-x-[2px]"}`}
        />
      </button>
    </div>
  );
}

// ─── confirmation overlay ───────────────────────────────────────────────────

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

// ─── Memory settings view ────────────────────────────────────────────────────

const MEMORY_DEFAULTS = {
  searchPastChats: true,
  buildFromChats: true,
  crossTopicContext: false,
};

function MemoryView({ uid, userDoc, onBack }) {
  const saved = userDoc?.memorySettings ?? {};
  const [settings, setSettings] = useState({ ...MEMORY_DEFAULTS, ...saved });
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const toggle = async (key) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      await updateUserProfile(uid, { memorySettings: next });
    } catch (err) {
      console.error("Failed to save memory setting:", err);
      setSettings(settings); // revert on error
    }
  };

  const clearAll = async () => {
    setClearingAll(true);
    try {
      const all = await loadUserTopics(uid);
      await Promise.all(all.map((t) => updateTopicMemory(uid, t.topicId, "")));
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
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Memory</h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-5 py-5 space-y-2">
        <ToggleRow
          label="Search past chats"
          sub="Reference relevant details from previous conversations"
          checked={settings.searchPastChats}
          onToggle={() => toggle("searchPastChats")}
        />
        <ToggleRow
          label="Build memory from chats"
          sub="Automatically extract and save useful context as you talk"
          checked={settings.buildFromChats}
          onToggle={() => toggle("buildFromChats")}
        />
        <ToggleRow
          label="Cross-topic context"
          sub="Apply what's learned in one topic to related questions in others"
          checked={settings.crossTopicContext}
          onToggle={() => toggle("crossTopicContext")}
        />

        <div className="pt-3 pb-1 h-px" />

        <button
          onClick={() => setConfirmClearAll(true)}
          className="w-full px-4 py-[13px] rounded-2xl text-[14px] text-left font-medium text-red-600 dark:text-red-400 bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors"
        >
          Clear all memory
          <span className="block text-[11.5px] font-normal text-gray-400 dark:text-gray-500 mt-0.5">Remove everything the assistant has learned across all topics</span>
        </button>
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
  const uid = auth.currentUser?.uid || userDoc?.uid || null;

  const [view, setView] = useState("main"); // "main" | "memory"
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

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

  if (view === "memory") {
    return <MemoryView uid={uid} userDoc={userDoc} onBack={() => setView("main")} />;
  }

  return (
    <div className="relative flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-white/70 mr-1" aria-label="Back">
          <IcBack />
        </button>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Privacy &amp; Data</h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-5 py-5">
        <div className="space-y-2">
          <ActionRow
            icon={<IcExport />}
            label="Export data"
            sub="Download all your chats and profile as JSON"
            busy={exporting}
            onPress={onExport}
            right={<IcChevron />}
          />
          <ActionRow
            icon={<IcMemory />}
            label="Memory"
            sub="Control how the assistant learns and remembers"
            onPress={() => setView("memory")}
            right={<IcChevron />}
          />
        </div>

        <div className="mt-4 space-y-2">
          <ActionRow
            icon={<IcDelete />}
            label="Clear all chats"
            sub="Delete every chat and topic. Your account stays."
            danger
            onPress={() => setConfirmClear(true)}
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

    </div>
  );
}
