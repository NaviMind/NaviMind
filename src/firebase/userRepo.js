
import { db, storage } from "./config";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { planFor, tokenLimitFor, dailyTokenLimitFor, isTrialPlan } from "@/lib/planLimits";

export async function ensureUserDoc(user, extra = {}) {
  if (!user || !user.uid) return;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  // Парсим имя из Google при наличии
  let gFirst = null, gLast = null;
  if (user.displayName) {
    const parts = user.displayName.trim().split(" ");
    gFirst = parts[0] || null;
    gLast = parts.slice(1).join(" ") || null;
  }

  const base = {
    uid: user.uid,
    email: user.email || null,
    emailVerified: !!user.emailVerified,
    photoURL: user.photoURL || null,
    authProvider: user.providerData?.[0]?.providerId || "password",
    plan: "free",
    tokens: 0,
    trialStartedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const profile = {
    firstName: extra.firstName ?? gFirst ?? null,
    lastName:  extra.lastName  ?? gLast  ?? null,
    country:   extra.country   ?? null,
  };

  if (!snap.exists()) {
    await setDoc(ref, { ...base, ...profile }, { merge: true });
  } else {
    await updateDoc(ref, { ...profile, updatedAt: serverTimestamp() });
  }
}

// ── Token metering ────────────────────────────────────────────────────────────
// Monthly period key ("2026-07", UTC) for paid plans; daily key ("2026-07-02")
// for the free daily cap. `trialTokens` is a cumulative counter used for the
// free trial's TOTAL budget.
function currentPeriodKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function currentDayKey() {
  const d = new Date();
  return `${currentPeriodKey()}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// Record billed AI tokens (input + output). Maintains three counters at once:
//   • monthly (period/tokens)      → paid-plan allowance
//   • daily   (day/dayTokens)      → free per-day cap
//   • trial   (trialTokens, cum.)  → free total trial budget
// Called client-side after each answer (user authenticated → Firestore rules).
export async function recordTokenUsage(uid, billedTokens) {
  if (!uid || !billedTokens || billedTokens <= 0) return;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const d = snap.exists() ? snap.data() : {};
  const prev = d?.usage || null;
  const period = currentPeriodKey();
  const day = currentDayKey();
  const prevPeriodTokens = prev?.period === period ? prev.tokens || 0 : 0;

  const update = {
    usage: {
      period,
      tokens: prevPeriodTokens + billedTokens,
      day,
      dayTokens: (prev?.day === day ? prev.dayTokens || 0 : 0) + billedTokens,
      trialTokens: (prev?.trialTokens || 0) + billedTokens,
    },
    updatedAt: serverTimestamp(),
  };

  // Paid plans: tokens used BEYOND the monthly allowance draw down the top-up
  // balance. The plan bucket refills monthly (period key); top-up persists and
  // only depletes when the plan is exhausted.
  const planKey = d?.plan || "free";
  if (!isTrialPlan(planKey)) {
    const allowance = tokenLimitFor(planKey);
    const overflowBefore = Math.max(0, prevPeriodTokens - allowance);
    const overflowAfter = Math.max(0, prevPeriodTokens + billedTokens - allowance);
    const consumed = overflowAfter - overflowBefore;
    if (consumed > 0) {
      update.topUpTokens = Math.max(0, (d?.topUpTokens || 0) - consumed);
    }
  }

  await setDoc(ref, update, { merge: true });
}

// ── Usage readers (from a live userDoc) ───────────────────────────────────────
export function usageForCurrentPeriod(userDoc) {
  const u = userDoc?.usage;
  return u?.period === currentPeriodKey() ? u.tokens || 0 : 0;
}
export function dailyUsage(userDoc) {
  const u = userDoc?.usage;
  return u?.day === currentDayKey() ? u.dayTokens || 0 : 0;
}
export function trialUsage(userDoc) {
  return userDoc?.usage?.trialTokens || 0;
}

// Unified status for the meter UI and enforcement. For free/trial it reports the
// TRIAL-TOTAL budget plus the daily cap and trial-window state; for paid it
// reports the MONTHLY allowance. `blocked` is true when any applicable limit is
// hit (used by gated enforcement).
export function getUsageStatus(userDoc) {
  const planKey = userDoc?.plan || "free";
  const plan = planFor(planKey);
  const limit = tokenLimitFor(planKey);

  if (isTrialPlan(planKey)) {
    const used = trialUsage(userDoc);
    const dayLimit = dailyTokenLimitFor(planKey);
    const dayUsed = dailyUsage(userDoc);
    const trial = trialStatus(userDoc);
    return {
      plan,
      isTrial: true,
      used,
      limit,
      topUp: 0,
      pct: Math.min(100, limit ? (used / limit) * 100 : 0),
      daily: { used: dayUsed, limit: dayLimit, over: dayLimit > 0 && dayUsed >= dayLimit },
      trial,
      blocked: trial.ended || used >= limit || (dayLimit > 0 && dayUsed >= dayLimit),
    };
  }

  // Paid: effective budget = monthly allowance + any purchased top-up. Overflow
  // already consumed this period is folded into the limit so used/limit stays
  // consistent (remaining = limit - used = remaining top-up).
  const allowance = limit; // tokenLimitFor(plan) for paid = monthly allowance
  const topUp = Math.max(0, userDoc?.topUpTokens || 0);
  const used = usageForCurrentPeriod(userDoc);
  const overflowUsed = Math.max(0, used - allowance);
  const effectiveLimit = allowance + topUp + overflowUsed;
  return {
    plan,
    isTrial: false,
    used,
    limit: effectiveLimit,
    topUp,
    pct: Math.min(100, effectiveLimit ? (used / effectiveLimit) * 100 : 0),
    daily: null,
    trial: { isTrial: false, active: true, ended: false, daysLeft: null },
    blocked: used >= allowance && topUp <= 0,
  };
}

// ── Free-trial window ─────────────────────────────────────────────────────────
export const TRIAL_DAYS = 21;

const toMs = (v) =>
  typeof v === "number" ? v : v?.toMillis?.() ?? (v?.seconds ?? 0) * 1000;

// Trial state for a userDoc. Paid plans are never "in trial". If we can't find a
// start timestamp we default to active (never wrongly cut a user off).
export function trialStatus(userDoc) {
  if (!userDoc || (userDoc.plan && userDoc.plan !== "free")) {
    return { isTrial: false, active: true, ended: false, daysLeft: null };
  }
  const startMs = toMs(userDoc.trialStartedAt) || toMs(userDoc.createdAt);
  if (!startMs) return { isTrial: true, active: true, ended: false, daysLeft: TRIAL_DAYS };
  const endMs = startMs + TRIAL_DAYS * 86400000;
  const now = Date.now();
  return {
    isTrial: true,
    active: now < endMs,
    ended: now >= endMs,
    daysLeft: Math.max(0, Math.ceil((endMs - now) / 86400000)),
  };
}

export async function updateUserProfile(uid, data) {
  if (!uid) return;
  const ref = doc(db, "users", uid);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// Upload a new avatar image and return its download URL. Stored under the
// user's own storage prefix (users/{uid}/...) so existing rules apply.
export async function uploadUserAvatar(uid, file) {
  if (!uid || !file) return null;
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const r = storageRef(storage, `users/${uid}/avatar/avatar.${ext || "jpg"}`);
  await uploadBytes(r, file, { contentType: file.type || "image/jpeg" });
  return await getDownloadURL(r);
}

export async function saveVesselProfile(uid, vesselData) {
  if (!uid) return;
  const ref = doc(db, "users", uid);
  await setDoc(ref, { vesselProfile: vesselData, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getVesselProfile(uid) {
  if (!uid) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data()?.vesselProfile ?? null) : null;
}
