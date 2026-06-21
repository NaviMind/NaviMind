"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

// Lightweight global toast. Fire from anywhere with:
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-slide-up pointer-events-none">
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-2xl border border-white/10">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shrink-0">
          <Check size={13} strokeWidth={3} />
        </span>
        <span className="text-sm font-medium">{toast.message}</span>
      </div>
    </div>,
    document.body
  );
}
