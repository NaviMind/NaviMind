"use client";

import { useEffect, useRef, useState, useCallback, useContext } from "react";
import { createPortal } from "react-dom";
import { ChatContext } from "@/context/ChatContext";

// Global NaviMind toast. Fire from anywhere with:
//   window.dispatchEvent(new CustomEvent("navimind-toast", { detail: { message, type } }))
// type: "success" (default) | "error"
//
// Optional { chatId, projId }: marks the toast as an "answer ready" notice for a
// specific chat. It is SUPPRESSED when the user is already viewing that chat, and
// clicking it navigates straight there.
//
// Styled as a NaviMind card (compass mark + frosted panel) that slides IN from
// the right edge and slides back OUT to the right on dismiss/timeout. Mounted
// once in the app layout so it survives navigation.
export default function Toast() {
  const { activeChatId, activeProject, openChatSession } = useContext(ChatContext);
  const [toast, setToast] = useState(null); // { title, message, type, chatId, projId }
  const [show, setShow] = useState(false);  // drives the slide in/out
  const [mounted, setMounted] = useState(false);
  const hideTimer = useRef();
  const removeTimer = useRef();

  // The event handler subscribes once, so hold the current chat in refs to decide
  // (with fresh values) whether the user is already looking at the finished chat.
  const activeChatRef = useRef(activeChatId);
  const activeProjectRef = useRef(activeProject);
  useEffect(() => { activeChatRef.current = activeChatId; }, [activeChatId]);
  useEffect(() => { activeProjectRef.current = activeProject; }, [activeProject]);

  // Slide out to the right, then unmount once the transition has finished.
  const dismiss = useCallback(() => {
    clearTimeout(hideTimer.current);
    clearTimeout(removeTimer.current);
    setShow(false);
    removeTimer.current = setTimeout(() => setToast(null), 380);
  }, []);

  useEffect(() => {
    setMounted(true);
    const onToast = (e) => {
      const d = e.detail || {};
      // "Answer ready" toast (carries chatId): skip if the user is already in that
      // chat — they can see the answer, no need to interrupt.
      if (
        d.chatId &&
        d.chatId === activeChatRef.current &&
        (d.projId == null || d.projId === activeProjectRef.current)
      ) {
        return;
      }
      clearTimeout(hideTimer.current);
      clearTimeout(removeTimer.current);
      setToast({
        title: d.title || "",
        message: d.message || "",
        type: d.type || "success",
        chatId: d.chatId || null,
        projId: d.projId || null,
      });
      // Mount off-screen first, then slide in on the next frame.
      requestAnimationFrame(() => requestAnimationFrame(() => setShow(true)));
      hideTimer.current = setTimeout(() => dismiss(), 5000);
    };
    window.addEventListener("navimind-toast", onToast);
    return () => {
      window.removeEventListener("navimind-toast", onToast);
      clearTimeout(hideTimer.current);
      clearTimeout(removeTimer.current);
    };
  }, [dismiss]);

  if (!mounted || !toast) return null;

  const isError = toast.type === "error";
  const clickable = !!toast.chatId;
  const handleCardClick = () => {
    if (!clickable) return;
    openChatSession?.(toast.chatId, toast.projId || "global");
    dismiss();
  };

  return createPortal(
    <div className="fixed top-5 right-5 z-[200] max-w-[calc(100vw-2.5rem)] pointer-events-none">
      <div
        onClick={handleCardClick}
        className={`pointer-events-auto flex items-center gap-3 w-[340px] max-w-full rounded-2xl
          bg-white/95 dark:bg-[#1a2438]/95 backdrop-blur-md
          shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_34px_rgba(0,0,0,0.55)]
          ring-1 ring-black/[0.06] dark:ring-white/[0.08]
          px-3.5 py-3 ${clickable ? "cursor-pointer hover:ring-black/10 dark:hover:ring-white/20 transition" : ""}`}
        style={{
          transform: show ? "translateX(0)" : "translateX(calc(100% + 2rem))",
          opacity: show ? 1 : 0,
          transition:
            "transform 380ms cubic-bezier(0.32, 0.72, 0, 1), opacity 320ms ease",
        }}
        role="status"
      >
        {/* Compass mark — the NaviMind brand, with a small red flag on errors */}
        <span className="relative shrink-0 w-9 h-9 flex items-center justify-center">
          <img
            src="/compass.png"
            alt=""
            aria-hidden
            className="w-8 h-8 object-contain"
            draggable={false}
          />
          {isError && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#1a2438] flex items-center justify-center">
              <span className="text-white text-[9px] font-bold leading-none">!</span>
            </span>
          )}
        </span>

        <div className="flex-1 min-w-0">
          {toast.title ? (
            <>
              <p className="text-[13.5px] font-semibold text-gray-900 dark:text-white truncate">
                {toast.title}
              </p>
              {toast.message && (
                <p className="mt-0.5 text-[12px] leading-snug text-gray-500 dark:text-gray-400 line-clamp-2">
                  {toast.message}
                </p>
              )}
            </>
          ) : (
            <p className="text-[13.5px] leading-snug text-gray-800 dark:text-gray-100">
              {toast.message}
            </p>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          className="shrink-0 -mr-1 p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  );
}
