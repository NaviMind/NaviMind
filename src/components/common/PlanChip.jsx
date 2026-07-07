// Shared subscription-tier chip. Free/trial → neutral pill; paid → branded blue
// gradient with a sparkle, so the user reads their tier at a glance. Used in the
// settings header and the sidebar account button.

import { planFor, isTrialPlan } from "@/lib/planLimits";

const IcSparkle = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[11px] h-[11px] flex-shrink-0" aria-hidden="true">
    <path d="M12 2l2.15 6.35L20.5 10.5l-6.35 2.15L12 19l-2.15-6.35L3.5 10.5l6.35-2.15L12 2z" />
  </svg>
);

export default function PlanChip({ plan, size = "sm" }) {
  const p = planFor(plan);
  const paid = !isTrialPlan(plan);
  const pad = size === "lg" ? "px-2.5 py-1 text-[12px]" : "px-2 py-[3px] text-[11px]";
  if (!paid) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${pad} rounded-full font-medium leading-none
          bg-gray-100 dark:bg-white/[0.07] text-gray-500 dark:text-gray-400
          ring-1 ring-inset ring-gray-200/70 dark:ring-white/[0.06]`}
      >
        {p.name}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 ${pad} rounded-full font-semibold leading-none
        bg-gradient-to-r from-blue-500/[0.14] to-indigo-500/[0.14] text-blue-600 dark:text-blue-300
        ring-1 ring-inset ring-blue-500/25`}
    >
      <IcSparkle />
      {p.name}
    </span>
  );
}
