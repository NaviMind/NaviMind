"use client";

import { useState } from "react";
import { Search, FileText, Layers, Globe, PenLine, FileDown, Sparkles } from "lucide-react";

// A ChatGPT/Claude-style progress trace of the real work the assistant did
// (library search, reading files, drawings, web search, writing), streamed live
// from the server as `step` events. Each step carries a `kind` that picks a
// themed icon. While streaming (`active`) the list shows a timeline with the
// current step shimmering; once done it collapses to a one-line summary.
const ICON_BY_KIND = {
  search: Search,
  read: FileText,
  drawings: Layers,
  web: Globe,
  write: PenLine,
  doc: FileDown,
};
const iconFor = (kind) => ICON_BY_KIND[kind] || Sparkles;

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
          <Sparkles size={13} className="opacity-70" />
          <span>Worked through {list.length} step{list.length === 1 ? "" : "s"}</span>
          <svg
            width="12" height="12" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          >
            <polyline points="4 6 8 10 12 6" />
          </svg>
        </button>
      )}

      {expanded && (
        <div className="mt-1.5 flex flex-col">
          {list.map((s, i) => {
            const isLast = i === list.length - 1;
            const isActive = active && isLast;
            const Ic = iconFor(s.kind);
            const showConnector = i < list.length - 1;
            return (
              <div key={s.id ?? i} className="flex items-start gap-2.5">
                {/* Icon + timeline connector */}
                <div className="flex flex-col items-center self-stretch">
                  <span
                    className={`flex items-center justify-center w-4 h-4 shrink-0 ${
                      isActive ? "text-blue-500" : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    <Ic size={14} strokeWidth={2} />
                  </span>
                  {showConnector && (
                    <span className="w-px flex-1 my-1 bg-gray-200 dark:bg-white/10" style={{ minHeight: 8 }} />
                  )}
                </div>
                <span className={`pb-2 ${isActive ? "step-shimmer" : "text-gray-500 dark:text-gray-400"}`}>
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
