// ─────────────────────────────────────────────────────────────────────────────
// Plan model — the single source of truth for what each subscription tier gives.
//
// Two metered resources:
//   • tokens       — monthly AI budget (Claude input+output). This is the real
//                    cost driver, so it's the primary meter.
//   • storageBytes — one account-wide ceiling for everything stored (drawings +
//                    topic files + chat uploads + memory).
//
// NOTE: token amounts and prices below are DIRECTIONAL PLACEHOLDERS from the
// pricing discussion. They're deliberately in one place so we can tune the whole
// ladder by editing this file once the exact numbers are locked.
// ─────────────────────────────────────────────────────────────────────────────

const MB = 1024 ** 2;
const GB = 1024 ** 3;
const M = 1_000_000; // one million tokens

export const PLANS = {
  // Free = 21-day trial. Small token budget + tight storage; heavy limits are
  // enforced separately (trial window / daily cap) in the billing layer.
  free: { key: "free", name: "Free", priceUsd: 0, tokens: 1 * M, storageBytes: 200 * MB },

  // Granular paid ladder — solves the "too cheap or suddenly ×5" gap so users
  // can pick the step that matches their actual usage.
  starter: { key: "starter", name: "Starter", priceUsd: 19, tokens: 1.2 * M, storageBytes: 2 * GB },
  plus: { key: "plus", name: "Plus", priceUsd: 39, tokens: 2.5 * M, storageBytes: 4 * GB },
  pro: { key: "pro", name: "Pro", priceUsd: 59, tokens: 4 * M, storageBytes: 8 * GB },
  premium: { key: "premium", name: "Premium", priceUsd: 89, tokens: 6 * M, storageBytes: 15 * GB },
  max: { key: "max", name: "Max", priceUsd: 129, tokens: 9 * M, storageBytes: 30 * GB },
};

export function planFor(plan) {
  return PLANS[plan] ?? PLANS.free;
}

// ── Tokens ───────────────────────────────────────────────────────────────────

export function tokenLimitFor(plan) {
  return planFor(plan).tokens;
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
