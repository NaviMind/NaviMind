"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { useCurrentUserDoc } from "@/hooks/useCurrentUserDoc";
import { PLANS, PAID_PLANS, planFor, formatTokens, formatBytes, modelLabelFor, docContextLabelFor } from "@/lib/planLimits";

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

function PriceCard({ plan, current, loggedIn, onAction }) {
  return (
    <div className="group relative flex flex-col rounded-2xl p-6 bg-white ring-1 ring-gray-200 shadow-sm transition-all hover:ring-blue-400 hover:shadow-md">
      {current && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gray-900 px-3 py-0.5 text-[11px] font-semibold text-white">
          Current plan
        </span>
      )}
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
        onClick={() => onAction(plan.key)}
        disabled={current}
        className={`mt-6 w-full rounded-xl px-4 py-2.5 text-center text-sm font-medium transition ${
          current
            ? "cursor-default bg-gray-100 text-gray-400"
            : "bg-gray-100 text-gray-800 group-hover:bg-blue-600 group-hover:text-white hover:bg-blue-700 hover:text-white"
        }`}
      >
        {current ? "Current plan" : loggedIn ? "Manage in app" : `Choose ${plan.name}`}
      </button>
    </div>
  );
}

export default function SubscriptionPage() {
  const [user, setUser] = useState(null);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  const { data: userDoc } = useCurrentUserDoc();

  const loggedIn = !!user;
  const currentPlanKey = userDoc?.plan || null;

  // The public page never opens checkout itself: signed-out visitors sign up
  // first, and signed-in users manage/pay INSIDE the app. A second checkout here
  // would create a duplicate subscription (double charge) and desync from their
  // account — so every action just routes to the right place.
  const onAction = useCallback(() => {
    window.location.href = loggedIn ? "/app" : "/welcome";
  }, [loggedIn]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Plans &amp; Pricing
          </h1>
          <p className="mt-3 text-gray-600">
            NaviMind is a maritime AI assistant. Every plan is metered in AI tokens —
            pick the one that matches how much you use it and pay only for what you need.
          </p>
        </div>

        {/* Context banner — account-aware so a signed-in user is never shown a
            sign-up CTA (or nudged into a second checkout). */}
        {loggedIn ? (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl bg-white p-5 text-center ring-1 ring-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              You’re signed in{currentPlanKey ? ` on ${planFor(currentPlanKey).name}` : ""}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Manage or change your subscription inside NaviMind — this page is just a reference.
            </p>
            <Link
              href="/app"
              className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              Open NaviMind
            </Link>
          </div>
        ) : (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl bg-white p-5 text-center ring-1 ring-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">New to NaviMind?</h2>
            <p className="mt-1 text-sm text-gray-600">
              Start free — no card required. {formatBytes(PLANS.free.storageBytes)} storage and a
              capped token allowance to try it on your own vessel.
            </p>
            <Link
              href="/welcome"
              className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              Start free
            </Link>
          </div>
        )}

        {/* Paid ladder */}
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PAID_PLANS.map((plan) => (
            <PriceCard
              key={plan.key}
              plan={plan}
              current={plan.key === currentPlanKey}
              loggedIn={loggedIn}
              onAction={onAction}
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
