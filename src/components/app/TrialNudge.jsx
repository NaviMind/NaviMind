"use client";

// Right-side upsell nudge for free-trial users. Two flavours:
//   • "daily"  — they've used today's free tokens (sending is blocked until
//                tomorrow); shown while over the daily cap, dismissible.
//   • "ending" — a once-a-day reminder in the BACK HALF of the trial.
// Trial-ENDED is the hard paywall: it opens the plan picker directly (once per
// session) rather than showing a banner.
//
// Everything is gated behind NEXT_PUBLIC_BILLING_ENFORCE, so it stays dark until
// billing is live and there's actually something to upgrade to.

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentUserDoc } from "@/hooks/useCurrentUserDoc";
import { getUsageStatus, TRIAL_DAYS } from "@/firebase/userRepo";
import Icon from "@/components/common/Icon";

const ENFORCE = process.env.NEXT_PUBLIC_BILLING_ENFORCE === "true";
const HALF = Math.floor(TRIAL_DAYS / 2); // periodic nudge only in the second half
const DAY_MS = 24 * 60 * 60 * 1000;

function openPlans() {
  window.dispatchEvent(new CustomEvent("navimind-open-plans"));
}

function throttleKey(uid) {
  return `nm-trial-nudge:${uid || "anon"}`;
}
function periodicDue(uid) {
  try {
    const last = Number(localStorage.getItem(throttleKey(uid)) || 0);
    return Date.now() - last >= DAY_MS;
  } catch {
    return false;
  }
}
function stampPeriodic(uid) {
  try {
    localStorage.setItem(throttleKey(uid), String(Date.now()));
  } catch {
    /* ignore */
  }
}

export default function TrialNudge() {
  const { data: userDoc } = useCurrentUserDoc();
  const st = useMemo(() => (userDoc ? getUsageStatus(userDoc) : null), [userDoc]);
  const uid = userDoc?.uid || null;

  const [dismissed, setDismissed] = useState(false);
  const [showEnding, setShowEnding] = useState(false);
  const [endingDecided, setEndingDecided] = useState(false);

  // Trial ENDED → open the picker once per session (the hard paywall moment).
  useEffect(() => {
    if (!ENFORCE || !st?.isTrial || !st.trial?.ended) return;
    try {
      if (sessionStorage.getItem("nm-trial-ended-prompted")) return;
      sessionStorage.setItem("nm-trial-ended-prompted", "1");
    } catch {
      /* ignore */
    }
    openPlans();
  }, [st?.isTrial, st?.trial?.ended]);

  // Decide the periodic "ending" banner ONCE (so the 24h throttle stamp doesn't
  // make it flash and vanish on the next render).
  useEffect(() => {
    if (endingDecided || !st?.isTrial) return;
    if (
      ENFORCE &&
      !st.trial?.ended &&
      !st.daily?.over &&
      (st.trial?.daysLeft ?? 99) <= HALF &&
      periodicDue(uid)
    ) {
      stampPeriodic(uid);
      setShowEnding(true);
    }
    setEndingDecided(true);
  }, [st, endingDecided, uid]);

  // Daily-over is evaluated live (it stays true once hit, so no flicker).
  const showDaily = ENFORCE && !!st?.isTrial && !st.trial?.ended && !!st.daily?.over;
  const variant = dismissed ? null : showDaily ? "daily" : showEnding ? "ending" : null;

  const daysLeft = st?.trial?.daysLeft ?? 0;
  const title = variant === "daily" ? "Daily limit reached" : "Your trial is ending";
  const body =
    variant === "daily"
      ? "You’ve used today’s free tokens. Upgrade for more, or come back tomorrow."
      : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial. Upgrade any time to keep going without limits.`;

  return (
    <AnimatePresence>
      {variant && (
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-5 right-5 z-[1400] w-[300px] max-w-[calc(100vw-2.5rem)] rounded-2xl bg-white/95 dark:bg-[#0f1623]/95 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/[0.08] shadow-2xl p-4"
        >
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="absolute top-2.5 right-2.5 p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-2 pr-5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/[0.12] text-blue-600 dark:text-blue-300">
              <Icon name="flash" size={16} className="fill-current" />
            </span>
            <p className="text-[13px] font-semibold text-gray-900 dark:text-white">{title}</p>
          </div>
          <p className="mt-2 text-[12px] leading-snug text-gray-600 dark:text-gray-300">{body}</p>
          <button
            onClick={() => { setDismissed(true); openPlans(); }}
            className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2 text-center text-[13px] font-medium text-white hover:bg-blue-700 transition"
          >
            See plans
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
