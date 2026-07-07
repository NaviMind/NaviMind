"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { useCurrentUserDoc } from "@/hooks/useCurrentUserDoc";
import { PAID_PLANS } from "@/lib/planLimits";
import PlanFeatures, { EVERY_PLAN_INCLUDES } from "@/components/common/PlanFeatures";

// Same card visual as the in-app plan picker (icon feature rows), just with a
// per-card action button suited to a public page.
function PriceCard({ plan, current, loggedIn, onAction }) {
  return (
    <div className="group relative flex flex-col rounded-2xl p-5 bg-white ring-1 ring-gray-200 shadow-sm transition-all hover:ring-blue-400 hover:shadow-md">
      {current && (
        <span className="absolute top-3 right-3 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-semibold text-white">
          Current
        </span>
      )}
      <h3 className="text-[15px] font-semibold text-gray-900">{plan.name}</h3>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900">${plan.priceUsd}</span>
        <span className="text-[12px] text-gray-500">/ mo</span>
      </div>

      <div className="mt-3 flex-1">
        <PlanFeatures plan={plan} />
      </div>

      <button
        onClick={() => onAction(plan.key)}
        disabled={current}
        className={`mt-4 w-full rounded-xl px-4 py-2 text-center text-[13px] font-medium transition ${
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
          {/* One small, neat action instead of a banner: signed-in users open the
              app (where they manage/change the plan), guests start free. */}
          <div className="mt-5">
            <Link
              href={loggedIn ? "/app" : "/welcome"}
              className="inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              {loggedIn ? "Open NaviMind" : "Start free"}
            </Link>
          </div>
        </div>

        {/* Same "every plan includes" line as the in-app picker */}
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-gray-500">{EVERY_PLAN_INCLUDES}</p>

        {/* Paid ladder */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
