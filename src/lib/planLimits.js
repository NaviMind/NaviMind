// Account-wide storage quota by plan. One ceiling for everything the user
// stores (drawings + topic files + chat uploads + memory); how they spend it
// across those is up to them.

export const PLAN_STORAGE_BYTES = {
  free: 1 * 1024 ** 3, // 1 GB
  // Higher tiers — TBD (e.g. pro, fleet).
};

export function storageLimitFor(plan) {
  return PLAN_STORAGE_BYTES[plan] ?? PLAN_STORAGE_BYTES.free;
}

export function formatBytes(bytes) {
  if (!bytes || bytes < 0) return "0 MB";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb >= 10 ? Math.round(gb) : gb.toFixed(1)} GB`;
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
