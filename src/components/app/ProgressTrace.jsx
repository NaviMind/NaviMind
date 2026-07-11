"use client";

import { useState } from "react";

// A ChatGPT/Claude-style progress trace: the real work the assistant did while
// answering (library search, reading files, web search, drawings, writing),
// streamed live from the server as `step` events. While the answer is still
// streaming (`active`) the list is expanded with a spinner on the current step;
// once done it collapses to a one-line summary that expands on click.
function StepIcon({ done }) {
  if (done) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 shrink-0">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin text-blue-500 shrink-0">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
      <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function ProgressTrace({ steps, active }) {
  const [open, setOpen] = useState(false);
  const list = Array.isArray(steps) ? steps.filter((s) => s && s.label) : [];
  if (!list.length) return null;

  const expanded = active || open;

  return (
    <div className="mb-2 text-[12.5px] leading-snug">
      {!active && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          <svg
            width="12" height="12" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          >
            <polyline points="4 6 8 10 12 6" />
          </svg>
          <span>Worked through {list.length} step{list.length === 1 ? "" : "s"}</span>
        </button>
      )}

      {expanded && (
        <div className="mt-1.5 flex flex-col gap-1.5 pl-0.5">
          {list.map((s, i) => {
            const isLast = i === list.length - 1;
            const done = !active || !isLast; // active: last spins, rest checked
            return (
              <div key={s.id ?? i} className="flex items-center gap-2">
                <StepIcon done={done} />
                <span className={done ? "text-gray-500 dark:text-gray-400" : "text-gray-700 dark:text-gray-200"}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
