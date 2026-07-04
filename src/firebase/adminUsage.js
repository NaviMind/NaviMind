// Server-side token metering (Admin SDK). Mirrors the client recordTokenUsage
// logic, but runs on the server so usage can't be tampered with from the client.
// Used by the RAG route after each answer.

import { adminDb } from "./admin";
import { tokenLimitFor, isTrialPlan } from "@/lib/planLimits";

function periodKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function dayKey() {
  const d = new Date();
  return `${periodKey()}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export async function recordTokenUsageAdmin(uid, billedTokens) {
  if (!uid || !billedTokens || billedTokens <= 0) return;
  const db = adminDb();
  const ref = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : {};
    const prev = d?.usage || null;
    const period = periodKey();
    const day = dayKey();
    const prevPeriodTokens = prev?.period === period ? prev.tokens || 0 : 0;

    const update = {
      usage: {
        period,
        tokens: prevPeriodTokens + billedTokens,
        day,
        dayTokens: (prev?.day === day ? prev.dayTokens || 0 : 0) + billedTokens,
        trialTokens: (prev?.trialTokens || 0) + billedTokens,
      },
    };

    // Paid plans: overflow beyond the monthly allowance draws down top-up.
    const planKey = d?.plan || "free";
    if (!isTrialPlan(planKey)) {
      const allowance = tokenLimitFor(planKey);
      const overflowBefore = Math.max(0, prevPeriodTokens - allowance);
      const overflowAfter = Math.max(0, prevPeriodTokens + billedTokens - allowance);
      const consumed = overflowAfter - overflowBefore;
      if (consumed > 0) update.topUpTokens = Math.max(0, (d?.topUpTokens || 0) - consumed);
    }

    tx.set(ref, update, { merge: true });
  });
}
