"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Lightweight global toast. Fire from anywhere with:
//   window.dispatchEvent(new CustomEvent("navimind-toast", { detail: { message, type } }))
// type: "success" (default) | "error"
// Mounted once (in the app layout) so it survives navigation.
export default function Toast() {
  const [toast, setToast] = useState(null); // { message, type }
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let timer;
    const onToast = (e) => {
      setToast({ message: e.detail?.message || "", type: e.detail?.type || "success" });
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 5000);
    };
    window.addEventListener("navimind-toast", onToast);
    return () => {
      window.removeEventListener("navimind-toast", onToast);
      clearTimeout(timer);
    };
  }, []);

  if (!mounted || !toast) return null;

  const isError = toast.type === "error";

  return createPortal(
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] px-3 w-full max-w-full flex justify-center pointer-events-none">
      <div className={`px-4 py-2 rounded-lg flex items-center gap-2 text-white shadow font-medium w-fit min-w-[160px] max-w-full animate-fade-in pointer-events-auto
        ${isError ? "bg-red-600" : "bg-emerald-600"}`}>
        {isError ? (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
            <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className="flex-1">{toast.message}</span>
        <button
          onClick={() => setToast(null)}
          className="ml-2 flex items-center justify-center text-white/80 hover:text-white transition"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>,
    document.body
  );
}
