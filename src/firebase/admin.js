// Firebase Admin SDK — server-side only. Used for privileged operations the
// client can't/shouldn't do: the trial-cleanup cron, and (in billing phase 2)
// Paddle webhooks that set the plan and reset usage server-side.
//
// Credentials come from FIREBASE_SERVICE_ACCOUNT (the service-account JSON as a
// single-line string). Init is lazy so a missing key never breaks the build —
// only a request that actually needs Admin access fails.

import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";

let _app;

function adminApp() {
  if (_app) return _app;
  const existing = getApps();
  if (existing.length) {
    _app = existing[0];
    return _app;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env var");
  const creds = JSON.parse(raw);
  _app = initializeApp({
    credential: cert(creds),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      `${creds.project_id}.appspot.com`,
  });
  return _app;
}

export function hasAdminCreds() {
  return !!process.env.FIREBASE_SERVICE_ACCOUNT;
}

export function adminDb() {
  return getFirestore(adminApp());
}

export function adminBucket() {
  return getStorage(adminApp()).bucket();
}

export function adminAuth() {
  return getAuth(adminApp());
}
