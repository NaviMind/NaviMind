"use client";

// Shared client-side Paddle helpers — used by both the public pricing page and
// the in-app upgrade modal so the checkout logic lives in exactly one place.
//
// All config is via client-safe NEXT_PUBLIC_* env vars (inlined at build time).
// Until a client token + price ids are set, `usePaddle` stays not-ready and
// `openPaddleCheckout` returns false, so callers can fall back gracefully.

import { useEffect, useState } from "react";
import { auth } from "@/firebase/config";

export const PADDLE_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
export const PADDLE_ENV = process.env.NEXT_PUBLIC_PADDLE_ENV || "sandbox";

// plan key → Paddle price id. Set NEXT_PUBLIC_PADDLE_PRICE_IDS to a JSON string,
// e.g. {"starter":"pri_...","plus":"pri_...","pro":"pri_...", ...}
export function priceIdFor(planKey) {
  try {
    const map = JSON.parse(process.env.NEXT_PUBLIC_PADDLE_PRICE_IDS || "{}");
    return map[planKey] || null;
  } catch {
    return null;
  }
}

// True once Paddle is configured enough for a given plan to be purchasable.
export function isPlanPurchasable(planKey) {
  return !!PADDLE_TOKEN && !!priceIdFor(planKey);
}

// Load Paddle.js once and initialise it. Returns whether it's ready. Does
// nothing (stays not-ready) until a client token is configured.
export function usePaddle() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!PADDLE_TOKEN || typeof window === "undefined") return;
    if (window.Paddle) {
      setReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    s.async = true;
    s.onload = () => {
      try {
        if (PADDLE_ENV !== "production") window.Paddle.Environment.set("sandbox");
        window.Paddle.Initialize({ token: PADDLE_TOKEN });
        setReady(true);
      } catch (e) {
        console.error("Paddle init failed:", e);
      }
    };
    document.body.appendChild(s);
  }, []);
  return ready;
}

// Open the Paddle checkout overlay for a plan. Returns true if it opened, false
// if Paddle isn't configured/ready or we can't link the purchase to a user (so
// the caller can decide what to do instead). `customData.userId` is what the
// webhook uses to attach the subscription to this Firebase user.
export function openPaddleCheckout({ planKey, ready, user }) {
  const priceId = priceIdFor(planKey);
  if (!priceId || !ready || !user?.uid || typeof window === "undefined" || !window.Paddle) {
    return false;
  }
  window.Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    ...(user.email ? { customer: { email: user.email } } : {}),
    customData: { userId: user.uid },
    settings: { successUrl: `${window.location.origin}/app` },
  });
  return true;
}

// Open the Paddle customer portal for the signed-in user — the ONLY safe way to
// change or cancel an EXISTING subscription (Paddle handles the proration/swap
// on its own subscription). Never open a fresh checkout for an existing
// subscriber: that would create a second subscription and double-charge them.
// Returns true if it navigated to the portal, false if unavailable (caller
// should fall back, e.g. email support).
export async function openPaddlePortal() {
  try {
    const token = await auth.currentUser?.getIdToken?.();
    if (!token) return false;
    const res = await fetch("/api/paddle/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.url) {
      window.location.href = data.url;
      return true;
    }
  } catch {
    /* fall through → caller decides */
  }
  return false;
}
