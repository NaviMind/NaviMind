"use client";

import { useEffect, useRef, useState } from "react";

// Live UTC + local clock for the desktop top bar. UTC is fixed; the user picks
// which timezone "Local" follows (defaults to the device's). Choice persists.

const TZ_KEY = "navimind_local_tz";

const deviceTz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

const ALL_TZ = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["UTC", deviceTz()];
  }
})();

// "Asia/Tokyo" → "Tokyo"
const tzLabel = (tz) => (tz || "").split("/").pop()?.replace(/_/g, " ") || tz;

const timeIn = (tz) => {
  try {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    });
  } catch {
    return "--:--";
  }
};

export default function TopBarClock() {
  const [localTz, setLocalTz] = useState("UTC");
  const [, setTick] = useState(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  // Hydrate the saved timezone on the client (avoids SSR mismatch).
  useEffect(() => {
    setLocalTz(localStorage.getItem(TZ_KEY) || deviceTz());
  }, []);

  // Tick every second so the time stays accurate.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 60), 1000);
    return () => clearInterval(id);
  }, []);

  // Close the picker on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (tz) => {
    setLocalTz(tz);
    try { localStorage.setItem(TZ_KEY, tz); } catch { /* ignore */ }
    setOpen(false);
    setQuery("");
  };

  const q = query.trim().toLowerCase();
  const filtered = (q
    ? ALL_TZ.filter((t) => t.toLowerCase().includes(q))
    : ALL_TZ
  ).slice(0, 120);

  return (
    <div ref={ref} className="relative hidden [@media(hover:hover)]:block">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Change local timezone"
        title="Change local timezone"
        className="flex flex-col items-end leading-tight px-2 py-1 rounded-lg tabular-nums
          text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
      >
        <span className="text-[12px] font-medium">
          <span className="text-gray-400 dark:text-gray-500 mr-1">UTC</span>{timeIn("UTC")}
        </span>
        <span className="text-[11px]">
          <span className="text-gray-400 dark:text-gray-500 mr-1">{tzLabel(localTz)}</span>{timeIn(localTz)}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 z-[200] rounded-xl overflow-hidden
          bg-white dark:bg-[#1a2438] ring-1 ring-black/[0.06] dark:ring-white/10 shadow-2xl">
          <div className="p-2 border-b border-gray-100 dark:border-white/10">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city / timezone…"
              className="w-full px-3 py-1.5 rounded-lg text-sm bg-gray-50 dark:bg-white/[0.05]
                ring-1 ring-gray-200 dark:ring-white/[0.06] outline-none focus:ring-2 focus:ring-blue-500
                text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div className="max-h-64 overflow-y-auto custom-scroll py-1">
            {filtered.map((tz) => {
              const active = tz === localTz;
              return (
                <button
                  key={tz}
                  onClick={() => pick(tz)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 text-left transition-colors
                    ${active
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200"}`}
                >
                  <span className="text-[13px] truncate">{tzLabel(tz)}</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums shrink-0">{timeIn(tz)}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-[13px] text-gray-400 dark:text-gray-500">No match</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
