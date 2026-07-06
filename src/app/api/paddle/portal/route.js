// Paddle customer portal — creates a hosted portal session so a paying user can
// update, pause or cancel their subscription and see invoices. This replaces the
// old "email support" placeholder for managing a subscription.
//
// Auth: the client sends its Firebase ID token; we verify it server-side and
// look up the Paddle customer linked to that user (paddleCustomerId, written by
// the webhook on subscription.created). We never trust a client-supplied uid.
//
// Requires (Vercel env):
//   • PADDLE_API_KEY  — server-side Paddle API key (Paddle → Authentication).
//   • FIREBASE_SERVICE_ACCOUNT — already set for the cron/webhook.
//   • PADDLE_ENV or NEXT_PUBLIC_PADDLE_ENV — "sandbox" (default) or "production".
//
// Until PADDLE_API_KEY is set (or before a customer is linked) this returns
// { available: false } and the client falls back to emailing support.

import { adminDb, adminAuth, hasAdminCreds } from "@/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function paddleApiBase() {
  const env = process.env.PADDLE_ENV || process.env.NEXT_PUBLIC_PADDLE_ENV || "sandbox";
  return env === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
}

export async function POST(req) {
  if (!hasAdminCreds()) {
    return Response.json({ available: false, reason: "server-not-configured" }, { status: 200 });
  }

  // Verify the Firebase ID token.
  const authz = req.headers.get("authorization") || "";
  const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!idToken) return Response.json({ error: "missing token" }, { status: 401 });

  let uid;
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return Response.json({ error: "invalid token" }, { status: 401 });
  }

  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    return Response.json({ available: false, reason: "paddle-not-configured" }, { status: 200 });
  }

  // Find the Paddle customer linked to this user.
  const snap = await adminDb().collection("users").doc(uid).get();
  const data = snap.exists ? snap.data() : {};
  const customerId = data?.paddleCustomerId || null;
  const subscriptionId = data?.paddleSubscriptionId || null;
  if (!customerId) {
    return Response.json({ available: false, reason: "no-customer" }, { status: 200 });
  }

  // Create a portal session (optionally deep-linked to the active subscription).
  try {
    const res = await fetch(`${paddleApiBase()}/customers/${customerId}/portal-sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriptionId ? { subscription_ids: [subscriptionId] } : {}),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[paddle] portal-session failed", res.status, body?.error?.detail || body);
      return Response.json({ available: false, reason: "paddle-error" }, { status: 200 });
    }
    const url = body?.data?.urls?.general?.overview || null;
    if (!url) return Response.json({ available: false, reason: "no-url" }, { status: 200 });
    return Response.json({ available: true, url });
  } catch (e) {
    console.error("[paddle] portal error", e?.message || e);
    return Response.json({ available: false, reason: "exception" }, { status: 200 });
  }
}
