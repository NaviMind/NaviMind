"use client";

import { useContext, useEffect, useState } from "react";
import { auth } from "@/firebase/config";
import { ChatContext } from "@/context/ChatContext";
import { loadUserTopics, updateTopicMemory, getAccountStorageUsage } from "@/firebase/chatStore";
import { updateUserProfile } from "@/firebase/userRepo";
import { clearAllConversations, downloadUserDataExport, purgeOrphanMemoryFiles } from "@/firebase/privacyData";
import { storageLimitFor, formatBytes, modelLabelFor, usageLabelFor } from "@/lib/planLimits";
import { getUsageStatus } from "@/firebase/userRepo";
import Icon from "@/components/common/Icon";
import MaskIcon from "@/components/common/MaskIcon";

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
const IcSweep = () => <MaskIcon src="/Mop.svg" size={20} />;
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
    <div className="relative flex flex-col flex-1 min-h-0">
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
  const { clearAllChats } = useContext(ChatContext);

  const [view, setView] = useState("main"); // "main" | "memory"
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [purging, setPurging] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState("");

  // Account-wide storage usage vs the plan limit.
  const [usage, setUsage] = useState(null);
  const storageLimit = storageLimitFor(userDoc?.plan || "free");
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    getAccountStorageUsage(uid).then((u) => { if (alive) setUsage(u); });
    return () => { alive = false; };
  }, [uid]);
  const usedBytes = usage?.total || 0;
  const usedPct = Math.min(100, (usedBytes / storageLimit) * 100);
  const usageBarColor = usedPct >= 100 ? "bg-red-500" : usedPct >= 80 ? "bg-amber-500" : "bg-blue-500";

  // AI usage state (for trial/renewal copy). Tokens are an internal meter — we
  // never show counts or a slider; we surface the model + qualitative usage tier.
  const st = getUsageStatus(userDoc);
  const planKey = userDoc?.plan || "free";

  const onPurgeOrphans = async () => {
    if (!uid || purging) return;
    setPurging(true);
    setPurgeMsg("");
    setError("");
    try {
      const res = await purgeOrphanMemoryFiles(uid);
      const n = res?.deleted ?? 0;
      setPurgeMsg(n > 0 ? `Cleaned up ${n} unused file${n === 1 ? "" : "s"}.` : "Nothing to clean up — everything's tidy.");
    } catch (err) {
      console.error("Purge orphans failed:", err);
      setError("Couldn't clean up storage. Try again.");
    } finally {
      setPurging(false);
    }
  };

  const onClearChats = async () => {
    if (!uid || clearing) return;
    setClearing(true);
    setError("");
    try {
      await clearAllConversations(uid);
      // Reset the UI to a fresh "new chat" — drop active chat/topic + cached
      // sessions so nothing lingers on a now-deleted topic.
      clearAllChats?.();
      setConfirmClear(false);
      onBack?.();
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
    <div className="relative flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-1 px-3 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-white/70 mr-1" aria-label="Back">
          <IcBack />
        </button>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Privacy &amp; Data</h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-5 py-5">
        {/* AI plan — model + qualitative usage tier. No token counts or slider. */}
        <div className="mb-4 rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06] px-4 py-3.5">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-200">
              <Icon name="flash" size={14} className="text-gray-400 dark:text-gray-500" />
              AI plan · {st.plan.name}
            </span>
            <span className="text-gray-500 dark:text-gray-400">{modelLabelFor(planKey)}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {usageLabelFor(planKey)}
              {" · "}
              {st.isTrial
                ? st.trial.ended
                  ? "free trial ended"
                  : `${st.trial.daysLeft} day${st.trial.daysLeft === 1 ? "" : "s"} left in trial`
                : "renews monthly"}
            </span>
            <a
              href="/subscription"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-blue-700 transition"
            >
              {st.isTrial ? "Upgrade" : "Change plan"}
            </a>
          </div>
        </div>

        {/* Storage usage — one account-wide pool (drawings + topics + chats + memory) */}
        <div className="mb-4 rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06] px-4 py-3.5">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-200">
              <MaskIcon src="/Storage.svg" size={15} className="text-gray-400 dark:text-gray-500" />
              Storage
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {usage ? `${formatBytes(usedBytes)} of ${formatBytes(storageLimit)}` : "Calculating…"}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full ${usageBarColor} transition-all duration-300`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          {usage && (
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
              <span>Drawings · {formatBytes(usage.drawings)}</span>
              <span>Topics · {formatBytes(usage.topics)}</span>
              <span>Chats · {formatBytes(usage.chats)}</span>
              <span>Memory · {formatBytes(usage.memory)}</span>
            </div>
          )}
        </div>

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
            icon={<IcSweep />}
            label="Clean up unused files"
            sub="Removes old assistant files no longer used. Your chats, drawings and memory stay."
            busy={purging}
            onPress={onPurgeOrphans}
          />
          <ActionRow
            icon={<IcDelete />}
            label="Clear all chats"
            sub="Delete every chat and topic. Your account stays."
            danger
            onPress={() => setConfirmClear(true)}
          />
        </div>

        {purgeMsg && <p className="mt-4 text-[12px] text-green-600 dark:text-green-400">{purgeMsg}</p>}
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
