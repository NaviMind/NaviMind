// Paddle (Merchant of Record) webhook — SKELETON.
//
// Paddle POSTs subscription/transaction lifecycle events here. We verify the
// signature, resolve which NaviMind user the event belongs to, map the Paddle
// price to one of our plans, and write the result server-side via the Admin SDK
// (client can't be trusted to set its own plan).
//
// TO GO LIVE you must set, in Vercel env:
//   • PADDLE_WEBHOOK_SECRET   — the signing secret from Paddle → Notifications.
//   • PADDLE_PRICE_TO_PLAN    — JSON mapping Paddle price ids → plan keys, e.g.
//       {"pri_starter":"starter","pri_plus":"plus","pri_pro":"pro",
//        "pri_premium":"premium","pri_max":"max"}
//   • PADDLE_TOPUP_PRICE_ID   — (optional) price id of the one-time top-up.
//   • PADDLE_TOPUP_TOKENS     — (optional) tokens granted per top-up purchase.
//   • FIREBASE_SERVICE_ACCOUNT — Admin SDK creds (already needed for the cron).
//
// And at CHECKOUT you must pass custom_data: { userId: <firebase uid> } so we
// can link the Paddle customer back to the Firebase user.

import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, hasAdminCreds } from "@/firebase/admin";
import { PLANS } from "@/lib/planLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Signature verification (Paddle-Signature: "ts=...;h1=...") ─────────────────
function verifySignature(rawBody, sigHeader, secret) {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(
    sigHeader.split(";").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i), kv.slice(i + 1)];
    })
  );
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;
  // Optional freshness check (5 min tolerance).
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const computed = crypto
    .createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`)
    .digest("hex");
  const a = Buffer.from(computed);
  const b = Buffer.from(h1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function currentPeriodKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function currentDayKey() {
  const d = new Date();
  return `${currentPeriodKey()}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function freshUsage() {
  return { period: currentPeriodKey(), tokens: 0, day: currentDayKey(), dayTokens: 0, trialTokens: 0 };
}

function planFromPrice(priceId) {
  if (!priceId) return null;
  let map = {};
  try {
    map = JSON.parse(process.env.PADDLE_PRICE_TO_PLAN || "{}");
  } catch {
    /* ignore bad config */
  }
  const key = map[priceId];
  return key && PLANS[key] ? key : null;
}

function priceIdOf(data) {
  return data?.items?.[0]?.price?.id || data?.items?.[0]?.price_id || null;
}

// Link the Paddle event back to a Firebase user. Primary: custom_data.userId
// (set at checkout). Fallback: match by customer email.
async function resolveUid(db, data) {
  const custom = data?.custom_data || data?.customData || {};
  if (custom.userId) return custom.userId;
  if (custom.uid) return custom.uid;
  const email = data?.customer?.email || data?.billing_details?.email || null;
  if (email) {
    const q = await db.collection("users").where("email", "==", email).limit(1).get();
    if (!q.empty) return q.docs[0].id;
  }
  return null;
}

// ── Handler ─────────────────────────────────────────────────────────────────
export async function POST(req) {
  const rawBody = await req.text();
  const sig = req.headers.get("paddle-signature");

  if (!verifySignature(rawBody, sig, process.env.PADDLE_WEBHOOK_SECRET)) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }
  if (!hasAdminCreds()) {
    return Response.json({ error: "FIREBASE_SERVICE_ACCOUNT not set" }, { status: 500 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }

  const db = adminDb();
  const type = event?.event_type;
  const data = event?.data || {};

  try {
    const uid = await resolveUid(db, data);
    if (!uid) {
      // No linkable user — ack so Paddle doesn't retry forever, but log it.
      console.warn("[paddle] no uid for event", type, event?.event_id);
      return Response.json({ ok: true, note: "no uid" });
    }
    const ref = db.collection("users").doc(uid);

    switch (type) {
      // New subscription or (re)activated → set plan + fresh usage period.
      case "subscription.created":
      case "subscription.activated": {
        const plan = planFromPrice(priceIdOf(data));
        if (plan) {
          await ref.set(
            {
              plan,
              paddleCustomerId: data.customer_id || null,
              paddleSubscriptionId: data.id || null,
              usage: freshUsage(),
              billingPeriodStart: Date.now(),
            },
            { merge: true }
          );
        }
        break;
      }

      // Plan change (upgrade/downgrade). Update plan; don't wipe mid-cycle usage.
      case "subscription.updated": {
        const plan = planFromPrice(priceIdOf(data));
        if (plan) await ref.set({ plan, paddleSubscriptionId: data.id || null }, { merge: true });
        break;
      }

      // Cancellation took effect → back to free.
      case "subscription.canceled": {
        await ref.set({ plan: "free", paddleSubscriptionId: null }, { merge: true });
        break;
      }

      // Each successful payment: subscription renewal resets the monthly usage;
      // a one-time top-up grants extra tokens.
      case "transaction.completed": {
        const topupPrice = process.env.PADDLE_TOPUP_PRICE_ID;
        const priceId = priceIdOf(data);
        if (topupPrice && priceId === topupPrice) {
          const grant = Number(process.env.PADDLE_TOPUP_TOKENS) || 0;
          // TODO(phase-2): factor topUpTokens into getUsageStatus limit.
          await ref.set({ topUpTokens: FieldValue.increment(grant) }, { merge: true });
        } else if (data.subscription_id) {
          // Subscription renewal payment → start a fresh usage period.
          await ref.set({ usage: freshUsage(), billingPeriodStart: Date.now() }, { merge: true });
        }
        break;
      }

      default:
        // Unhandled event types are fine to ack.
        break;
    }
  } catch (e) {
    console.error("[paddle] handler error", type, e?.message || e);
    return Response.json({ error: "handler error" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
