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
// TOKENS ARE AN INTERNAL METER — never shown to users (no counts, no slider).
// Plans are sold on VALUE (model tier, document depth, a qualitative usage
// label), not on raw token numbers. `usageLabel` is the human-facing volume cue.
//
// The token allowances below are COSTED to keep a healthy gross margin
// (AI cost ≈ 30–35% of price) given the per-tier model:
//   • standard = Haiku 4.5  (~$7 / 1M our-tokens)
//   • advance  = Sonnet 5   (~$18 / 1M)
//   • deep     = Opus 4.8   (~$30 / 1M)
// Because volume is hidden and higher tiers buy a smarter model (not just more
// tokens), the raw token counts intentionally don't rise monotonically.
// ─────────────────────────────────────────────────────────────────────────────

const MB = 1024 ** 2;
const GB = 1024 ** 3;
const M = 1_000_000; // one million tokens

export const PLANS = {
  // Free = 21-day trial on the entry model (Haiku). Small, capped budget so a
  // tire-kicker costs us ~$1, not a full paid month. `tokens` is the TOTAL trial
  // budget; `dailyTokens` caps each day (forms a daily-return habit).
  free: {
    key: "free",
    name: "Free",
    trial: true,
    priceUsd: 0,
    tokens: 150_000, // total for the whole trial (~$1 cost on Haiku)
    dailyTokens: 10_000, // per-day cap
    storageBytes: 200 * MB,
    model: "standard", // entry model — paid tiers unlock the smarter models
    docContext: "standard",
    usageLabel: "Trial access",
  },

  // Granular paid ladder — MONTHLY token allowance, costed for ~65% gross margin.
  // Paid tiers differ on three honest, deliverable levers:
  //   • model      — reasoning tier: "standard"(Haiku) → "advance"(Sonnet) → "deep"(Opus)
  //   • docContext — document depth per answer: "standard" → "deep" → "deepest"
  //   • usage      — monthly volume (shown to users as a qualitative label only)
  starter: { key: "starter", name: "Starter", priceUsd: 19, tokens: 900_000, storageBytes: 2 * GB, model: "standard", docContext: "standard", usageLabel: "Everyday usage" },
  plus: { key: "plus", name: "Plus", priceUsd: 39, tokens: 800_000, storageBytes: 4 * GB, model: "advance", docContext: "standard", usageLabel: "High usage" },
  pro: { key: "pro", name: "Pro", priceUsd: 59, tokens: 1.2 * M, storageBytes: 8 * GB, model: "advance", docContext: "deep", usageLabel: "Heavy usage" },
  premium: { key: "premium", name: "Premium", priceUsd: 89, tokens: 1 * M, storageBytes: 15 * GB, model: "deep", docContext: "deep", usageLabel: "Pro-grade usage" },
  max: { key: "max", name: "Max", priceUsd: 129, tokens: 1.5 * M, storageBytes: 30 * GB, model: "deep", docContext: "deepest", usageLabel: "Maximum usage" },
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

// ── Feature tiers (model + document context) ──────────────────────────────────

export const MODEL_LABELS = {
  standard: "Standard model",
  advance: "Advanced model",
  deep: "Deep reasoning",
};

export const DOC_CONTEXT_LABELS = {
  standard: "Standard document context",
  deep: "Deep document context",
  deepest: "Deepest document context",
};

export function modelTierFor(plan) {
  return planFor(plan).model || "standard";
}
export function docContextTierFor(plan) {
  return planFor(plan).docContext || "standard";
}
export function modelLabelFor(plan) {
  return MODEL_LABELS[modelTierFor(plan)] || MODEL_LABELS.standard;
}
export function docContextLabelFor(plan) {
  return DOC_CONTEXT_LABELS[docContextTierFor(plan)] || DOC_CONTEXT_LABELS.standard;
}

// Human-facing volume cue — we sell on value, not raw token counts, so plan
// cards show this instead of a number.
export function usageLabelFor(plan) {
  return planFor(plan).usageLabel || "Everyday usage";
}

// How many retrieved document chunks each answer may draw on, by tier. This is
// the enforceable side of "document context" — higher tiers see more of the
// user's manuals/drawings per answer. Used by the RAG route.
export const DOC_CONTEXT_CHUNKS = { standard: 4, deep: 6, deepest: 8 };
export function docChunksFor(plan) {
  return DOC_CONTEXT_CHUNKS[docContextTierFor(plan)] || DOC_CONTEXT_CHUNKS.standard;
}
