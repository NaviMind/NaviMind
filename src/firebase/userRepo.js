
import { db, storage } from "./config";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

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
// Billing period key, e.g. "2026-07" (UTC month). Paid plans will later be
// reset by the provider webhook on the real billing cycle; until then this gives
// free users a clean monthly rollover.
function currentPeriodKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Record billed AI tokens (input + output) against the user's current period.
// Called client-side after each answer completes (the user is authenticated,
// so Firestore rules apply).
export async function recordTokenUsage(uid, billedTokens) {
  if (!uid || !billedTokens || billedTokens <= 0) return;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const period = currentPeriodKey();
  const prev = snap.exists() ? snap.data()?.usage : null;
  const tokens = (prev?.period === period ? prev.tokens || 0 : 0) + billedTokens;
  await setDoc(
    ref,
    { usage: { period, tokens }, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// Tokens used in the CURRENT period from a live userDoc (0 if a new period).
export function usageForCurrentPeriod(userDoc) {
  const u = userDoc?.usage;
  return u?.period === currentPeriodKey() ? u.tokens || 0 : 0;
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
