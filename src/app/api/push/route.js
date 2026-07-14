// Sends an "answer ready" push to all of a user's registered devices via
// Firebase Cloud Messaging (firebase-admin). Called (fire-and-forget) by the
// client when an answer finishes generating.
//
// Data-only messages: each device's service worker decides whether to show a
// notification (it shows one only when that device isn't focused), so a device
// the user is actively looking at never double-notifies over the in-app toast.
//
// Fail-safe: with no admin credentials, or no registered tokens, this no-ops.

import { adminApp, adminDb, hasAdminCreds } from "@/firebase/admin";
import { getMessaging } from "firebase-admin/messaging";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    if (!hasAdminCreds()) return Response.json({ ok: false, skipped: "no-admin" });

    const { uid, title, body, chatId, projId } = await req.json();
    if (!uid) return Response.json({ ok: false, error: "uid required" }, { status: 400 });

    const db = adminDb();
    const snap = await db.collection("users").doc(uid).collection("pushTokens").get();
    const tokens = snap.docs.map((d) => d.id).filter(Boolean);
    if (!tokens.length) return Response.json({ ok: true, sent: 0 });

    const messaging = getMessaging(adminApp());
    const res = await messaging.sendEachForMulticast({
      tokens,
      data: {
        title: String(title || "NaviMind"),
        body: String(body || "").slice(0, 300),
        chatId: String(chatId || ""),
        projId: String(projId || "global"),
      },
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "5" }, payload: { aps: { "content-available": 1 } } },
      webpush: { headers: { Urgency: "high" } },
    });

    // Prune tokens the FCM backend reports as permanently invalid.
    const dead = [];
    res.responses.forEach((r, i) => {
      const code = r?.error?.code || "";
      if (
        !r.success &&
        (code.includes("registration-token-not-registered") ||
          code.includes("invalid-registration-token") ||
          code.includes("invalid-argument"))
      ) {
        dead.push(tokens[i]);
      }
    });
    await Promise.all(
      dead.map((t) =>
        db.collection("users").doc(uid).collection("pushTokens").doc(t).delete().catch(() => {})
      )
    );

    return Response.json({ ok: true, sent: res.successCount, pruned: dead.length });
  } catch (e) {
    console.error("push route error:", e?.message || e);
    return Response.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
