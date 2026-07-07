"use client";

// In-app plan picker — rendered as a STEP inside the Settings modal (Billing →
// Choose your plan), so it REPLACES the Billing view instead of stacking on top,
// matching the rest of the app's sub-screen flow.
//
// Tiers are selectable cards (hover highlights, click selects and stays lit). A
// single "Continue" acts on the selected tier: existing paid subscribers go to
// the Paddle portal (proration/swap), first-time buyers get the checkout overlay.
// No forced "most popular" nudging — the user decides.

import { useEffect, useState } from "react";
import { PAID_PLANS, planFor, isTrialPlan, formatTokens, formatBytes, modelLabelFor, docContextLabelFor } from "@/lib/planLimits";
import { usePaddle, openPaddleCheckout, openPaddlePortal, isPlanPurchasable } from "@/lib/paddleClient";
import Icon from "@/components/common/Icon";

const IcBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IcCheck = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-white">
    <path d="M13 4L6 11L3 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// A single "icon + feature" row inside a plan card. fill-current keeps every
// glyph the same muted grey (overrides the lightbulb's built-in amber).
function Feature({ icon, children }) {
  return (
    <div className="flex items-start gap-2">
      <Icon name={icon} size={15} className="mt-[1px] flex-shrink-0 fill-current text-gray-400 dark:text-gray-500" />
      <span>{children}</span>
    </div>
  );
}

function PlanCard({ plan, selected, current, onSelect }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={current}
      onClick={() => onSelect(plan.key)}
      className={`group relative flex flex-col text-left rounded-2xl p-4 ring-1 transition-all duration-150 outline-none
        ${current
          ? "cursor-default bg-gray-50 dark:bg-white/[0.03] ring-gray-300 dark:ring-white/[0.14]"
          : selected
            ? "cursor-pointer bg-blue-50 dark:bg-blue-500/[0.12] ring-2 ring-blue-500 shadow-lg shadow-blue-500/10 -translate-y-0.5"
            : "cursor-pointer bg-gray-50 dark:bg-white/[0.03] ring-gray-200 dark:ring-white/[0.07] hover:ring-blue-400 dark:hover:ring-blue-400/70 hover:bg-white dark:hover:bg-white/[0.06] hover:shadow-md hover:-translate-y-0.5"
        }`}
    >
      {selected && !current && (
        <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
          <IcCheck />
        </span>
      )}
      {current && (
        <span className="absolute top-3 right-3 rounded-full bg-gray-900 dark:bg-white px-2 py-0.5 text-[10px] font-semibold text-white dark:text-gray-900">
          Current
        </span>
      )}

      <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">${plan.priceUsd}</span>
        <span className="text-[12px] text-gray-500 dark:text-gray-400">/ mo</span>
      </div>

      <div className="mt-3 space-y-1.5 text-[12px] text-gray-600 dark:text-gray-300 leading-snug">
        <Feature icon="flash">
          <span className="font-medium text-gray-900 dark:text-white">{formatTokens(plan.tokens)}</span> tokens / mo
        </Feature>
        <Feature icon="storage">
          <span className="font-medium text-gray-900 dark:text-white">{formatBytes(plan.storageBytes)}</span> storage
        </Feature>
        <Feature icon="lightbulb">{modelLabelFor(plan.key)}</Feature>
        <Feature icon="library">{docContextLabelFor(plan.key)}</Feature>
      </div>
    </button>
  );
}

export default function PlanPicker({ currentPlanKey, user, onBack, onDone }) {
  const paddleReady = usePaddle();
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");

  // Fresh selection whenever this step is entered.
  useEffect(() => { setSelected(null); setNotice(""); }, []);

  const current = planFor(currentPlanKey || "free");

  const select = (planKey) => {
    setNotice("");
    setSelected(planKey);
  };

  const proceed = async () => {
    if (!selected) return;

    // Existing paid subscriber → change plan through the Paddle portal (Paddle
    // prorates/swaps the current subscription). NEVER open a fresh checkout for
    // them: that would create a second subscription and double-charge.
    if (currentPlanKey && !isTrialPlan(currentPlanKey)) {
      const opened = await openPaddlePortal();
      if (opened) { onDone?.(); return; }
      setNotice("Couldn’t open the subscription portal. Please try again, or email support@navimind.io to change your plan.");
      return;
    }

    // First-time purchase (free / trial user) → checkout overlay.
    const opened = openPaddleCheckout({ planKey: selected, ready: paddleReady, user });
    if (opened) {
      onDone?.(); // close settings so the Paddle overlay is clean
    } else if (!isPlanPurchasable(selected)) {
      setNotice("Online checkout isn’t enabled yet — it’s coming shortly. For now, contact support@navimind.io to change your plan.");
    } else {
      setNotice("Couldn’t open checkout. Please try again in a moment.");
    }
  };

  const selectedPlan = selected ? planFor(selected) : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header — back to Billing */}
      <div className="flex items-center gap-1 px-3 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-white/70 mr-1" aria-label="Back">
          <IcBack />
        </button>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Choose your plan</h3>
      </div>

      {/* Selectable tiers */}
      <div className="flex-1 overflow-y-auto custom-scroll px-5 py-5">
        <p className="mb-4 text-[12px] text-gray-500 dark:text-gray-400">
          Every plan includes web search, document &amp; drawing analysis, and voice input.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PAID_PLANS.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              selected={selected === plan.key}
              current={plan.key === current.key}
              onSelect={select}
            />
          ))}
        </div>
      </div>

      {/* Footer — compact action + trust line */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 dark:border-white/[0.06]">
        {notice && (
          <p className="mb-3 text-center text-[12px] text-amber-600 dark:text-amber-400">{notice}</p>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="order-2 sm:order-1 text-[11px] text-gray-400 dark:text-gray-500 leading-snug">
            Billed monthly through Paddle · cancel anytime.{" "}
            <a href="/legal/refund" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-gray-300">
              Refund &amp; Cancellation Policy
            </a>
          </p>
          <button
            onClick={proceed}
            disabled={!selected}
            className={`order-1 sm:order-2 flex-shrink-0 w-full sm:w-auto rounded-xl px-6 py-2.5 text-sm font-medium transition
              ${selected
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "cursor-not-allowed bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-gray-500"
              }`}
          >
            {selectedPlan ? `Continue · $${selectedPlan.priceUsd}/mo` : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
