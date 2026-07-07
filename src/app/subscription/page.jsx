"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { PLANS, PAID_PLANS, formatTokens, formatBytes, modelLabelFor, docContextLabelFor } from "@/lib/planLimits";
import { usePaddle, openPaddleCheckout } from "@/lib/paddleClient";

// A short, honest feature line-up per tier.
function planFeatures(plan) {
  return [
    `${formatTokens(plan.tokens)} AI tokens / month`,
    `${formatBytes(plan.storageBytes)} document storage`,
    modelLabelFor(plan.key),
    docContextLabelFor(plan.key),
    "Web search, drawing & manual analysis, voice",
  ];
}

function PriceCard({ plan, onChoose }) {
  return (
    <div className="group relative flex flex-col rounded-2xl p-6 bg-white ring-1 ring-gray-200 shadow-sm transition-all hover:ring-blue-400 hover:shadow-md">
      <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-gray-900">
          {plan.priceUsd === 0 ? "Free" : `$${plan.priceUsd}`}
        </span>
        {plan.priceUsd > 0 && <span className="text-sm text-gray-500">/ month</span>}
      </div>
      {plan.trial ? (
        <p className="mt-1 text-xs text-gray-500">
          21-day trial · {formatTokens(plan.tokens)} tokens · {formatTokens(plan.dailyTokens)}/day
        </p>
      ) : (
        <p className="mt-1 text-xs text-gray-500">Billed monthly · cancel anytime</p>
      )}

      <ul className="mt-5 flex-1 space-y-2.5 text-sm text-gray-600">
        {planFeatures(plan).map((f, i) => (
          <li key={i} className="flex gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" className="mt-0.5 flex-shrink-0 text-blue-500" fill="none">
              <path d="M13 4L6 11L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onChoose(plan.key)}
        className="mt-6 w-full rounded-xl px-4 py-2.5 text-center text-sm font-medium transition bg-gray-100 text-gray-800 group-hover:bg-blue-600 group-hover:text-white hover:bg-blue-700 hover:text-white"
      >
        Choose {plan.name}
      </button>
    </div>
  );
}

export default function SubscriptionPage() {
  const paddleReady = usePaddle();
  const [user, setUser] = useState(null);
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const choose = useCallback(
    (planKey) => {
      // Opens the Paddle overlay when configured; otherwise (or for a signed-out
      // visitor we can't link a purchase to) fall back to the sign-up flow.
      const opened = openPaddleCheckout({ planKey, ready: paddleReady, user });
      if (!opened) window.location.href = "/welcome";
    },
    [paddleReady, user]
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Plans &amp; Pricing
          </h1>
          <p className="mt-3 text-gray-600">
            NaviMind is a maritime AI assistant. Start free for 21 days, then pick the
            monthly plan that matches how much you use it. Every plan is metered in AI
            tokens — pay for what you actually need, with no jump straight to the biggest tier.
          </p>
        </div>

        {/* Free trial banner */}
        <div className="mx-auto mt-8 max-w-3xl rounded-2xl bg-white p-5 text-center ring-1 ring-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">{PLANS.free.name} — 21-day trial</h2>
          <p className="mt-1 text-sm text-gray-600">
            {formatTokens(PLANS.free.tokens)} AI tokens over the trial ·{" "}
            {formatTokens(PLANS.free.dailyTokens)} tokens/day ·{" "}
            {formatBytes(PLANS.free.storageBytes)} storage. No card required to start.
          </p>
          <Link
            href="/welcome"
            className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            Start free
          </Link>
        </div>

        {/* Paid ladder */}
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PAID_PLANS.map((plan) => (
            <PriceCard
              key={plan.key}
              plan={plan}
              onChoose={choose}
            />
          ))}
        </div>

        {/* Trust / legal footer — required for Paddle domain review */}
        <div className="mx-auto mt-12 max-w-3xl text-center text-xs text-gray-500">
          <p>
            Payments are securely processed by <strong>Paddle</strong>, our Merchant of
            Record. Prices are in USD; applicable taxes are calculated at checkout. You
            can cancel or change your plan at any time.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link href="/legal/terms" className="underline hover:text-gray-700">Terms of Service</Link>
            <Link href="/legal/privacy" className="underline hover:text-gray-700">Privacy Policy</Link>
            <Link href="/legal/refund" className="underline hover:text-gray-700">Refund &amp; Cancellation</Link>
            <a href="mailto:support@navimind.io" className="underline hover:text-gray-700">Contact</a>
          </div>
        </div>
      </div>
    </main>
  );
}
