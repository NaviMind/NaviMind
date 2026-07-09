"use client";

import { useEffect, useState } from "react";
import { auth } from "@/firebase/config";
import { getAccountStorageUsage } from "@/firebase/chatStore";
import { getUsageStatus } from "@/firebase/userRepo";
import { planFor, storageLimitFor, formatBytes, modelLabelFor, usageLabelFor } from "@/lib/planLimits";
import Icon from "@/components/common/Icon";
import { openPaddlePortal } from "@/lib/paddleClient";

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
export default function BillingScreen({ userDoc, onBack, onChangePlan }) {
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

  const planKey = userDoc?.plan || "free";
  const storageLimit = storageLimitFor(planKey);
  const usedBytes = storage?.total || 0;
  const storagePct = Math.min(100, storageLimit ? (usedBytes / storageLimit) * 100 : 0);

  const [managing, setManaging] = useState(false);
  const [manageNotice, setManageNotice] = useState("");

  // Manage/cancel → open the Paddle customer portal (hosted; handles cancel and
  // proration). If it isn't available yet (Paddle not wired / no linked
  // customer), show a visible message with a support email — instead of silently
  // firing a mailto that does nothing on devices without a mail client.
  async function manageSubscription() {
    setManaging(true);
    setManageNotice("");
    const opened = await openPaddlePortal();
    if (opened) return; // navigated to the Paddle portal
    setManageNotice("Online subscription management isn’t available yet. To cancel or change now, email");
    setManaging(false);
  }

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

        {/* AI capability — tokens are an internal meter, never shown. We surface
            the value the user actually cares about: which model + usage tier. */}
        <div className="mb-4 rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06] px-4 py-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-200">
              <Icon name="flash" size={14} className="text-gray-400 dark:text-gray-500" />
              AI model
            </span>
            <span className="text-gray-500 dark:text-gray-400">{modelLabelFor(planKey)}</span>
          </div>
          <p className="mt-2.5 text-[11px] text-gray-500 dark:text-gray-400">
            {usageLabelFor(planKey)}
            {" · "}
            {st.isTrial
              ? st.trial.ended
                ? "free trial ended"
                : "usage resets daily during your trial"
              : "renews monthly"}
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

        {/* Primary action — replaces this Billing view with the plan picker step */}
        <button
          onClick={onChangePlan}
          className="block w-full rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          {st.isTrial ? "Choose your plan" : "Change your plan"}
        </button>

        {/* Manage / cancel — a quiet secondary link, not a second big button */}
        {!st.isTrial && (
          <div className="mt-3 text-center">
            <button
              onClick={manageSubscription}
              disabled={managing}
              className="text-[12px] text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-200 transition disabled:opacity-60"
            >
              {managing ? "Opening…" : "Manage or cancel subscription"}
            </button>
            {manageNotice && (
              <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                {manageNotice}{" "}
                <a
                  href="mailto:support@navimind.io?subject=Manage%20my%20NaviMind%20subscription"
                  className="underline hover:text-gray-700 dark:hover:text-gray-200"
                >
                  support@navimind.io
                </a>
              </p>
            )}
          </div>
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
