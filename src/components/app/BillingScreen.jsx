"use client";

import { useEffect, useState } from "react";
import { auth } from "@/firebase/config";
import { getAccountStorageUsage } from "@/firebase/chatStore";
import { getUsageStatus } from "@/firebase/userRepo";
import { planFor, storageLimitFor, formatBytes, formatTokens } from "@/lib/planLimits";
import Icon from "@/components/common/Icon";

const IcBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

function barColor(pct) {
  return pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-blue-500";
}

// In-app billing / plan management. Reads the same metering helpers as the rest
// of the app (getUsageStatus / storage usage) so the numbers match everywhere,
// and routes paid actions to the /subscription pricing+checkout page.
export default function BillingScreen({ userDoc, onBack }) {
  const uid = userDoc?.uid || auth.currentUser?.uid || null;
  const plan = planFor(userDoc?.plan || "free");
  const st = getUsageStatus(userDoc);

  const [storage, setStorage] = useState(null);
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    getAccountStorageUsage(uid).then((u) => { if (alive) setStorage(u); }).catch(() => {});
    return () => { alive = false; };
  }, [uid]);

  const storageLimit = storageLimitFor(userDoc?.plan || "free");
  const usedBytes = storage?.total || 0;
  const storagePct = Math.min(100, storageLimit ? (usedBytes / storageLimit) * 100 : 0);
  const tokenPct = st.pct;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-1 px-3 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-white/70 mr-1" aria-label="Back">
          <IcBack />
        </button>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Billing</h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-5 py-5">
        {/* Current plan */}
        <div className="mb-4 rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06] px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Current plan</p>
              <p className="mt-0.5 text-[17px] font-semibold text-gray-900 dark:text-white">{plan.name}</p>
            </div>
            <div className="text-right">
              <p className="text-[17px] font-semibold text-gray-900 dark:text-white">
                {plan.priceUsd === 0 ? "Free" : `$${plan.priceUsd}`}
              </p>
              {plan.priceUsd > 0 && <p className="text-[11px] text-gray-500 dark:text-gray-400">per month</p>}
            </div>
          </div>
          <p className="mt-2 text-[12px] text-gray-500 dark:text-gray-400">
            {st.isTrial
              ? st.trial.ended
                ? "Your free trial has ended. Upgrade to keep using NaviMind."
                : `Free trial · ${st.trial.daysLeft} day${st.trial.daysLeft === 1 ? "" : "s"} left.`
              : "Billed monthly through Paddle · cancel anytime."}
          </p>
        </div>

        {/* AI usage (tokens) */}
        <div className="mb-4 rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06] px-4 py-3.5">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-200">
              <Icon name="flash" size={14} className="text-gray-400 dark:text-gray-500" />
              AI usage
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {formatTokens(st.used)} of {formatTokens(st.limit)} tokens
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full ${barColor(tokenPct)} transition-all duration-300`} style={{ width: `${tokenPct}%` }} />
          </div>
          <p className="mt-2.5 text-[11px] text-gray-500 dark:text-gray-400">
            {st.isTrial
              ? st.trial.ended
                ? "Free trial ended."
                : `Free trial · ${formatTokens(st.daily.limit)}/day`
              : st.topUp > 0
                ? `Resets monthly · +${formatTokens(st.topUp)} top-up remaining`
                : "Resets monthly."}
          </p>
        </div>

        {/* Storage */}
        <div className="mb-5 rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06] px-4 py-3.5">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-200">
              <Icon name="storage" size={14} className="text-gray-400 dark:text-gray-500" />
              Document storage
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {formatBytes(usedBytes)} of {formatBytes(storageLimit)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full ${barColor(storagePct)} transition-all duration-300`} style={{ width: `${storagePct}%` }} />
          </div>
        </div>

        {/* Primary action */}
        <a
          href="/subscription"
          className="block w-full rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          {st.isTrial ? "Upgrade your plan" : "Change plan"}
        </a>

        {/* Manage / cancel for paying users */}
        {!st.isTrial && (
          <a
            href="mailto:support@navimind.io?subject=Manage%20my%20NaviMind%20subscription"
            className="mt-2.5 block w-full rounded-xl bg-gray-100 dark:bg-white/10 px-4 py-2.5 text-center text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-white/[0.15] transition"
          >
            Manage or cancel subscription
          </a>
        )}

        <p className="mt-4 text-center text-[11px] text-gray-400 dark:text-gray-500">
          Payments are securely processed by Paddle, our Merchant of Record.{" "}
          <a href="/legal/refund" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-gray-300">
            Refund &amp; Cancellation Policy
          </a>
        </p>
      </div>
    </div>
  );
}
