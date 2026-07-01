import { useRef, useEffect, useState, useContext } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UIContext } from "@/context/UIContext";
import { ChatContext } from "@/context/ChatContext";

export default function TopicInstructionsModal({
  open,
  topicName = "this topic",
  value,
  setValue,
  onSave,
  onClose,
  saving = false,
}) {
  const { theme, closeModals } = useContext(UIContext);
  const { splitMode } = useContext(ChatContext);
  const inputRef = useRef(null);
  const [kbHeight, setKbHeight] = useState(0);
  const [isPresent, setIsPresent] = useState(false);

  // Open inside the work area (not over the sidebar). Desktop: portal into
  // nm-workarea, whose transform makes `fixed` relative to it. Mobile: the work
  // area slides off-screen when the sidebar is open, so portal to <body>.
  const [portalTarget, setPortalTarget] = useState(null);
  useEffect(() => {
    const desktop = window.matchMedia?.("(hover: hover)").matches;
    setPortalTarget(
      desktop ? (document.getElementById("nm-workarea") || document.body) : document.body
    );
  }, []);

  useEffect(() => {
    if (open) setIsPresent(true);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // One-modal-at-a-time: on open, close every other modal (UIContext-managed
  // ones + the local-state Search / Library modals).
  useEffect(() => {
    if (!open) return;
    closeModals?.();
    window.dispatchEvent(new CustomEvent("nm-close-topic-library"));
    window.dispatchEvent(new CustomEvent("nm-close-search"));
  }, [open]);

  // Close self when another modal opens.
  useEffect(() => {
    const onCloseSelf = () => onClose?.();
    window.addEventListener("nm-close-topic-instructions", onCloseSelf);
    return () => window.removeEventListener("nm-close-topic-instructions", onCloseSelf);
  }, [onClose]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setKbHeight(Math.max(0, window.innerHeight - vv.height));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !saving) onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.();
  };

  if (!isPresent || !portalTarget) return null;

  const slideVariants = {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
  };

  return createPortal(
    <div
      className={`fixed left-0 top-0 z-[300] flex items-center justify-center overflow-hidden backdrop-blur-sm px-3 py-4 ${theme === "dark" ? "bg-black/60" : "bg-black/25"} transition-opacity duration-500 ${splitMode ? "right-0 [@media(hover:hover)]:right-1/2" : "right-0"}`}
      style={{ bottom: kbHeight, transition: "bottom 200ms, opacity 500ms", opacity: open ? 1 : 0 }}
      onClick={handleBackdropClick}
    >
      <AnimatePresence onExitComplete={() => { if (!open) setIsPresent(false); }}>
        {open && (
          <motion.form
            key="topic-instructions-modal"
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white/90 dark:bg-gray-800/40 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-2xl flex flex-col items-stretch"
            onSubmit={handleSubmit}
            autoComplete="off"
            onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
          >
            {/* Header — title left, light subtitle, close on the right */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                  Topic instructions
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  Context the assistant applies to every chat in “{topicName}”.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Tell the assistant how to behave in every chat here. For example:

Act as an experienced maritime superintendent helping us prepare for a SIRE 2.0 inspection. Always focus on cargo operations, mooring and enclosed-space entry, and flag anything that could raise an observation. When I describe a procedure, check it against MARPOL Annex VI and our company SMS and point out the gaps. Keep answers short and practical, cite the exact regulation or checklist item, and call out safety-critical points up front. Reply in the language I write in.`}
              className="w-full px-3 py-2.5 rounded-xl border text-base bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition resize-none custom-scroll min-h-[160px] sm:min-h-[260px]"
              autoFocus
            />

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60 transition-colors"
              >
                {saving && (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                )}
                Save
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>,
    portalTarget
  );
}
