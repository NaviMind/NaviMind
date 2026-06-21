"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Lightweight global toast, styled like the input-bar file alert. Fire from
// anywhere with:
//   window.dispatchEvent(new CustomEvent("navimind-toast", { detail: { message } }))
// Mounted once (in the app layout) so it survives navigation.
export default function Toast() {
  const [toast, setToast] = useState(null); // { message }
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let timer;
    const onToast = (e) => {
      setToast({ message: e.detail?.message || "" });
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

  return createPortal(
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] px-3 w-full max-w-full flex justify-center pointer-events-none">
      <div className="px-4 py-2 rounded-lg flex items-center gap-2 bg-emerald-600 text-white shadow font-medium w-fit min-w-[160px] max-w-full animate-fade-in pointer-events-auto">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="flex-1">{toast.message}</span>
      </div>
    </div>,
    document.body
  );
}
