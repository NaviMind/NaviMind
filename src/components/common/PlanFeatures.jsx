// Shared plan-card feature rows (icon + text) so the in-app plan picker and the
// public pricing page render the tiers identically. fill-current keeps every
// glyph the same muted grey (overrides the lightbulb's built-in amber).

import Icon from "@/components/common/Icon";
import { formatTokens, formatBytes, modelLabelFor, docContextLabelFor } from "@/lib/planLimits";

// One line shown once above the grid — the capabilities every tier shares.
export const EVERY_PLAN_INCLUDES =
  "Every plan includes web search, document & drawing analysis, and voice input.";

export function Feature({ icon, children }) {
  return (
    <div className="flex items-start gap-2">
      <Icon name={icon} size={15} className="mt-[1px] flex-shrink-0 fill-current text-gray-400 dark:text-gray-500" />
      <span>{children}</span>
    </div>
  );
}

export default function PlanFeatures({ plan }) {
  return (
    <div className="space-y-1.5 text-[12px] text-gray-600 dark:text-gray-300 leading-snug">
      <Feature icon="flash">
        <span className="font-medium text-gray-900 dark:text-white">{formatTokens(plan.tokens)}</span> tokens / mo
      </Feature>
      <Feature icon="storage">
        <span className="font-medium text-gray-900 dark:text-white">{formatBytes(plan.storageBytes)}</span> storage
      </Feature>
      <Feature icon="lightbulb">{modelLabelFor(plan.key)}</Feature>
      <Feature icon="library">{docContextLabelFor(plan.key)}</Feature>
    </div>
  );
}
