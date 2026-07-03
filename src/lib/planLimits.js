// ─────────────────────────────────────────────────────────────────────────────
// Plan model — the single source of truth for what each subscription tier gives.
//
// Metered resources:
//   • tokens       — AI budget (Claude input+output). The real cost driver.
//                    FREE: this is the TOTAL for the whole 21-day trial (not
//                    per day, not monthly). PAID: this is the MONTHLY allowance.
//   • dailyTokens  — FREE only: per-day cap so the trial budget can't be burned
//                    in one session and the user forms a daily-return habit.
//   • storageBytes — one account-wide storage ceiling.
//
// NOTE: token amounts and prices are DIRECTIONAL PLACEHOLDERS from the pricing
// discussion — tune the whole ladder by editing this one file.
// ─────────────────────────────────────────────────────────────────────────────

const MB = 1024 ** 2;
const GB = 1024 ** 3;
const M = 1_000_000; // one million tokens

export const PLANS = {
  // Free = 21-day trial. `tokens` is the TOTAL trial budget; `dailyTokens` caps
  // each day. ~$4–7 max cost per trial user — acceptable acquisition cost.
  free: {
    key: "free",
    name: "Free",
    trial: true,
    priceUsd: 0,
    tokens: 1 * M, // total for the whole trial
    dailyTokens: 60_000, // per-day cap
    storageBytes: 200 * MB,
  },

  // Granular paid ladder — MONTHLY token allowance. Solves the "too cheap or
  // suddenly ×5" gap so users pick the step that matches their real usage.
  starter: { key: "starter", name: "Starter", priceUsd: 19, tokens: 1.2 * M, storageBytes: 2 * GB },
  plus: { key: "plus", name: "Plus", priceUsd: 39, tokens: 2.5 * M, storageBytes: 4 * GB },
  pro: { key: "pro", name: "Pro", priceUsd: 59, tokens: 4 * M, storageBytes: 8 * GB },
  premium: { key: "premium", name: "Premium", priceUsd: 89, tokens: 6 * M, storageBytes: 15 * GB },
  max: { key: "max", name: "Max", priceUsd: 129, tokens: 9 * M, storageBytes: 30 * GB },
};

// Paid tiers in ladder order — for the pricing page.
export const PAID_PLAN_KEYS = ["starter", "plus", "pro", "premium", "max"];
export const PAID_PLANS = PAID_PLAN_KEYS.map((k) => PLANS[k]);

export function planFor(plan) {
  return PLANS[plan] ?? PLANS.free;
}

export function isTrialPlan(plan) {
  return !!planFor(plan).trial;
}

// ── Tokens ───────────────────────────────────────────────────────────────────

// The headline token budget for a plan (trial-total for free, monthly for paid).
export function tokenLimitFor(plan) {
  return planFor(plan).tokens;
}

// Free-only per-day cap (0 for paid plans → not applied).
export function dailyTokenLimitFor(plan) {
  return planFor(plan).dailyTokens || 0;
}

export function formatTokens(n) {
  if (!n || n < 0) return "0";
  if (n >= M) return `${n >= 10 * M ? Math.round(n / M) : (n / M).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(Math.round(n));
}

// ── Storage (kept backward-compatible with existing callers) ──────────────────

export const PLAN_STORAGE_BYTES = Object.fromEntries(
  Object.entries(PLANS).map(([k, v]) => [k, v.storageBytes])
);

export function storageLimitFor(plan) {
  return planFor(plan).storageBytes;
}

export function formatBytes(bytes) {
  if (!bytes || bytes < 0) return "0 MB";
  const gb = bytes / GB;
  if (gb >= 1) return `${gb >= 10 ? Math.round(gb) : gb.toFixed(1)} GB`;
  const mb = bytes / MB;
  if (mb >= 1) return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
