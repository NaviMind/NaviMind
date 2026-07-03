// Scheduled cleanup: free-trial users who never subscribed have their stored
// files removed after the trial window, so we don't keep paying to store (and
// index in OpenAI) dead data.
//
// SAFETY:
//   • Auth-gated by CRON_SECRET (Vercel Cron sends it as a Bearer token).
//   • DRY-RUN by default — it only logs which users *would* be cleaned. Actual
//     deletion happens only when CLEANUP_ENABLED=true.
//   • Idempotent — a cleaned user is stamped with storageCleanedAt and skipped.
//   • Only targets plan === "free" users whose trial is past.

import OpenAI from "openai";
import { adminDb, adminBucket, hasAdminCreds } from "@/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRIAL_DAYS = 21;
const GRACE_DAYS = Number(process.env.CLEANUP_GRACE_DAYS) || 0;
const ENABLED = process.env.CLEANUP_ENABLED === "true";

function toMs(v) {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (v._seconds) return v._seconds * 1000;
  if (v.seconds) return v.seconds * 1000;
  return 0;
}

export async function GET(req) {
  // Only Vercel Cron (or someone holding CRON_SECRET) may run this.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasAdminCreds()) {
    return Response.json({ error: "FIREBASE_SERVICE_ACCOUNT not set" }, { status: 500 });
  }

  const db = adminDb();
  const now = Date.now();
  const cutoffMs = (TRIAL_DAYS + GRACE_DAYS) * 86400000;
  const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

  // Only free (never-subscribed) users are candidates.
  const snap = await db.collection("users").where("plan", "==", "free").get();

  const results = {
    scanned: snap.size,
    eligible: 0,
    cleaned: 0,
    dryRun: !ENABLED,
    users: [],
  };

  for (const doc of snap.docs) {
    const uid = doc.id;
    const d = doc.data() || {};
    if (d.storageCleanedAt) continue; // already cleaned
    const startMs = toMs(d.trialStartedAt) || toMs(d.createdAt);
    if (!startMs) continue; // unknown trial start → skip (safe default)
    if (now - startMs < cutoffMs) continue; // trial not past the cutoff yet

    results.eligible++;
    const entry = { uid, action: ENABLED ? "cleaned" : "would-clean" };

    if (!ENABLED) {
      results.users.push(entry);
      continue;
    }

    try {
      // 1. Delete all of the user's stored files (chat attachments, topic files,
      //    drawings, avatars) — everything lives under users/{uid}/.
      await adminBucket().deleteFiles({ prefix: `users/${uid}/` }).catch(() => {});

      // 2. Delete the user's OpenAI vector stores — the expensive part.
      if (openai) {
        const storeIds = new Set(
          [d.libraryVectorStoreId, d.drawingsVectorStoreId].filter(Boolean)
        );
        const topics = await db
          .collection(`users/${uid}/topics`)
          .get()
          .catch(() => ({ docs: [] }));
        for (const t of topics.docs) {
          const sid = t.data()?.vectorStoreId;
          if (sid) storeIds.add(sid);
        }
        for (const sid of storeIds) {
          await openai.vectorStores.del(sid).catch(() => {});
        }
      }

      // 3. Stamp so we never re-process, and drop the (now dead) store ids.
      await doc.ref.set(
        { storageCleanedAt: now, libraryVectorStoreId: "", drawingsVectorStoreId: "" },
        { merge: true }
      );
      results.cleaned++;
    } catch (e) {
      entry.error = e?.message || String(e);
    }
    results.users.push(entry);
  }

  console.log("[cron:cleanup-trials]", JSON.stringify(results));
  return Response.json(results);
}
