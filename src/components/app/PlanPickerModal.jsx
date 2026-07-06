"use client";

// In-app plan picker — a centered overlay (ChatGPT / Claude style) that shows
// the paid tiers on top of the app, so changing plans never opens a new browser
// tab or leaves the product. Selecting a tier opens the Paddle checkout overlay
// when configured; before Paddle is wired it shows a gentle notice instead.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PAID_PLANS, planFor, formatTokens, formatBytes } from "@/lib/planLimits";
import { usePaddle, openPaddleCheckout, isPlanPurchasable } from "@/lib/paddleClient";

const HIGHLIGHT = "pro";

const IcCheck = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="mt-0.5 flex-shrink-0 text-blue-500 dark:text-blue-400">
    <path d="M13 4L6 11L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function planFeatures(plan) {
  const premium = plan.key === "pro" || plan.key === "premium" || plan.key === "max";
  return [
    `${formatTokens(plan.tokens)} AI tokens / month`,
    `${formatBytes(plan.storageBytes)} document storage`,
    "Vessel-aware answers from your files",
    premium ? "Priority “deep reasoning” model" : "Standard reasoning model",
  ];
}

function PlanCard({ plan, highlighted, current, onChoose }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl p-4 ring-1 transition
        ${current
          ? "bg-blue-50 dark:bg-blue-500/[0.08] ring-blue-500/40"
          : highlighted
            ? "bg-white dark:bg-white/[0.04] ring-2 ring-blue-500 shadow-lg"
            : "bg-gray-50 dark:bg-white/[0.03] ring-gray-200 dark:ring-white/[0.07]"
        }`}
    >
      {highlighted && !current && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-semibold text-white whitespace-nowrap">
          Most popular
        </span>
      )}
      {current && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gray-800 dark:bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold text-white dark:text-gray-900 whitespace-nowrap">
          Current plan
        </span>
      )}

      <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">${plan.priceUsd}</span>
        <span className="text-[12px] text-gray-500 dark:text-gray-400">/ mo</span>
      </div>

      <ul className="mt-3 flex-1 space-y-1.5 text-[12px] text-gray-600 dark:text-gray-300">
        {planFeatures(plan).map((f, i) => (
          <li key={i} className="flex gap-1.5">
            <IcCheck />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        disabled={current}
        onClick={() => onChoose(plan.key)}
        className={`mt-4 w-full rounded-xl px-3 py-2 text-center text-[13px] font-medium transition
          ${current
            ? "cursor-default bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-gray-500"
            : highlighted
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-white/[0.15]"
          }`}
      >
        {current ? "Current plan" : `Choose ${plan.name}`}
      </button>
    </div>
  );
}

export default function PlanPickerModal({ open, onClose, currentPlanKey, user }) {
  const paddleReady = usePaddle();
  const [mounted, setMounted] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => { setMounted(true); }, []);

  // Reset the notice whenever the modal is (re)opened.
  useEffect(() => { if (open) setNotice(""); }, [open]);

  // Lock background scroll + close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const current = planFor(currentPlanKey || "free");

  const choose = (planKey) => {
    const opened = openPaddleCheckout({ planKey, ready: paddleReady, user });
    if (opened) {
      onClose(); // Paddle overlay takes over the screen.
    } else if (!isPlanPurchasable(planKey)) {
      setNotice("Online checkout isn’t enabled yet — it’s coming shortly. For now, contact support@navimind.io to change your plan.");
    } else {
      setNotice("Couldn’t open checkout. Please try again in a moment.");
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-5xl max-h-[90dvh] flex flex-col overflow-hidden rounded-[22px] bg-white dark:bg-[#0f1623] ring-1 ring-black/5 dark:ring-white/[0.08] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
              <div>
                <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">
                  {current.trial ? "Upgrade your plan" : "Change your plan"}
                </h2>
                <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
                  {current.trial
                    ? "You’re on the free trial. Pick a monthly plan — cancel anytime."
                    : `You’re on ${current.name}. Move up or down anytime — changes are prorated by Paddle.`}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex-shrink-0 -mr-1 -mt-1 p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto custom-scroll px-6 py-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {PAID_PLANS.map((plan) => (
                  <PlanCard
                    key={plan.key}
                    plan={plan}
                    highlighted={plan.key === HIGHLIGHT}
                    current={plan.key === current.key}
                    onChoose={choose}
                  />
                ))}
              </div>

              {notice && (
                <p className="mt-5 text-center text-[12px] text-amber-600 dark:text-amber-400">{notice}</p>
              )}

              <p className="mt-5 text-center text-[11px] text-gray-400 dark:text-gray-500">
                Payments are securely processed by Paddle, our Merchant of Record. Taxes are
                calculated at checkout.{" "}
                <a href="/legal/refund" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-gray-300">
                  Refund &amp; Cancellation Policy
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
