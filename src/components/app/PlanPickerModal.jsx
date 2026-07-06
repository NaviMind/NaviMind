"use client";

// In-app plan picker — a centered overlay (ChatGPT / Claude style) that shows
// the paid tiers on top of the app, so changing plans never opens a new browser
// tab or leaves the product.
//
// Interaction: tiers are selectable cards (hover highlights, click selects and
// stays lit). A single "Continue" button acts on the selected tier and opens the
// Paddle checkout overlay when configured. No forced "most popular" nudging — the
// user decides.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PAID_PLANS, planFor, formatTokens, formatBytes, modelLabelFor, docContextLabelFor } from "@/lib/planLimits";
import { usePaddle, openPaddleCheckout, isPlanPurchasable } from "@/lib/paddleClient";
import Icon from "@/components/common/Icon";

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
          ? "cursor-default bg-gray-50 dark:bg-white/[0.03] ring-gray-200 dark:ring-white/[0.07] opacity-80"
          : selected
            ? "cursor-pointer bg-blue-50 dark:bg-blue-500/[0.12] ring-2 ring-blue-500 shadow-lg shadow-blue-500/10 -translate-y-0.5"
            : "cursor-pointer bg-gray-50 dark:bg-white/[0.03] ring-gray-200 dark:ring-white/[0.07] hover:ring-blue-400 dark:hover:ring-blue-400/70 hover:bg-white dark:hover:bg-white/[0.06] hover:shadow-md hover:-translate-y-0.5"
        }`}
    >
      {/* Selected check / current tag */}
      {selected && !current && (
        <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
          <IcCheck />
        </span>
      )}
      {current && (
        <span className="absolute top-3 right-3 rounded-full bg-gray-200 dark:bg-white/10 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300">
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

export default function PlanPickerModal({ open, onClose, currentPlanKey, user }) {
  const paddleReady = usePaddle();
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => { setMounted(true); }, []);

  // Fresh selection each time the modal opens.
  useEffect(() => { if (open) { setSelected(null); setNotice(""); } }, [open]);

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

  const select = (planKey) => {
    setNotice("");
    setSelected(planKey);
  };

  const proceed = () => {
    if (!selected) return;
    const opened = openPaddleCheckout({ planKey: selected, ready: paddleReady, user });
    if (opened) {
      onClose(); // Paddle overlay takes over the screen.
    } else if (!isPlanPurchasable(selected)) {
      setNotice("Online checkout isn’t enabled yet — it’s coming shortly. For now, contact support@navimind.io to change your plan.");
    } else {
      setNotice("Couldn’t open checkout. Please try again in a moment.");
    }
  };

  if (!mounted) return null;

  const selectedPlan = selected ? planFor(selected) : null;

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
            {/* Header — just a title */}
            <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
              <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">Choose your plan</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex-shrink-0 -mr-1 p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Selectable tiers */}
            <div className="flex-1 overflow-y-auto custom-scroll px-6 py-6">
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

            {/* Footer — compact action, trust line beside it */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 dark:border-white/[0.06]">
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
