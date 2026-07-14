"use client";

// Client-side push (Firebase Cloud Messaging) helpers.
//
// enablePush(uid): asks the browser for notification permission, registers the
// FCM service worker, gets this device's push token, and saves it under the user
// so the server can push "answer ready" to this device even when the app is
// closed. Everything is guarded: with no VAPID key, or on an unsupported
// browser, these are no-ops — the app works exactly as before.
//
// iOS note: Safari only delivers Web Push when the site is installed to the Home
// Screen (Add to Home Screen) on iOS 16.4+. In a normal Safari tab, permission
// can't be granted and enablePush() will report "unsupported".

import { app, db } from "@/firebase/config";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";

export function pushConfigured() {
  return !!VAPID_KEY;
}

export async function isPushSupported() {
  try {
    if (typeof window === "undefined") return false;
    if (!VAPID_KEY) return false;
    if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) {
      return false;
    }
    const { isSupported } = await import("firebase/messaging");
    return await isSupported();
  } catch {
    return false;
  }
}

export function notificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

async function getTokenAndSave(uid) {
  const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const { getMessaging, getToken } = await import("firebase/messaging");
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: reg,
  });
  if (!token) return null;

  // One doc per device token → the server reads them all and prunes dead ones.
  await setDoc(
    doc(db, "users", uid, "pushTokens", token),
    { token, updatedAt: serverTimestamp(), ua: (navigator.userAgent || "").slice(0, 200) },
    { merge: true }
  );
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem("nm_push_token", token);
  } catch { /* ignore */ }
  return token;
}

// Ask permission (needs a user gesture the first time) and register this device.
export async function enablePush(uid) {
  if (!uid) return { ok: false, reason: "no-uid" };
  if (!(await isPushSupported())) return { ok: false, reason: "unsupported" };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: perm };
  try {
    const token = await getTokenAndSave(uid);
    return token ? { ok: true, token } : { ok: false, reason: "no-token" };
  } catch (e) {
    console.error("enablePush failed:", e?.message || e);
    return { ok: false, reason: "error" };
  }
}

// Silently refresh this device's token on app load IF permission is already
// granted — keeps the stored token current without prompting.
export async function refreshPushIfGranted(uid) {
  if (!uid) return;
  if (notificationPermission() !== "granted") return;
  if (!(await isPushSupported())) return;
  try {
    await getTokenAndSave(uid);
  } catch { /* ignore */ }
}

// Turn push off for this device: drop the stored token so the server stops
// pushing to it.
export async function disablePush(uid) {
  try {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("nm_push_token") : null;
    if (uid && token) await deleteDoc(doc(db, "users", uid, "pushTokens", token)).catch(() => {});
    if (typeof localStorage !== "undefined") localStorage.removeItem("nm_push_token");
  } catch { /* ignore */ }
}
