import { useRef, useEffect, useState, useContext } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UIContext } from "@/context/UIContext";
import { ChatContext } from "@/context/ChatContext";

export default function TopicModal({
  open,
  topicName,
  setTopicName,
  topicInstruction = "",
  setTopicInstruction,
  onCreate,
  onClose,
}) {
  const { theme } = useContext(UIContext);
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
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (topicName.trim()) onCreate();
  };

  if (!isPresent || !portalTarget) return null;

  const slideVariants = {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
  };

  return createPortal(
    <div
      className={`fixed left-0 top-0 z-[300] flex items-center justify-center backdrop-blur-sm px-3 py-4 ${theme === "dark" ? "bg-black/60" : "bg-black/25"} transition-opacity duration-500 ${splitMode ? "right-0 [@media(hover:hover)]:right-1/2" : "right-0"}`}
      style={{ bottom: kbHeight, transition: "bottom 200ms, opacity 500ms", opacity: open ? 1 : 0 }}
      onClick={handleBackdropClick}
    >
      <AnimatePresence onExitComplete={() => { if (!open) setIsPresent(false); }}>
        {open && (
          <motion.form
            key="topic-modal"
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
                  Create Topic
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Group related chats under one theme so the assistant keeps context across them.
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

            {/* Topic name */}
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Topic name
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. PSC Preparation, IMPA Requests, Flag Circulars"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-base bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition"
              autoFocus
            />

            {/* Instructions */}
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-200 mt-4 mb-1">
              Instructions <span className="font-normal text-gray-400 dark:text-gray-500">— optional</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">
              Tell the assistant how to focus here — vessel, port, regulations, or scope. It applies to every chat in this topic.
            </p>
            <textarea
              placeholder="e.g. PSC prep for Hamburg, Aug 2025. Focus on SOLAS II-2 fire safety."
              value={topicInstruction}
              onChange={(e) => setTopicInstruction?.(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-base bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition resize-none custom-scroll min-h-[80px] sm:min-h-[140px]"
            />

            <button
              type="submit"
              disabled={!topicName.trim()}
              className={`
                mt-5 w-full px-4 py-2.5 rounded-xl font-medium text-base transition
                ${topicName.trim()
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow"
                  : "bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed"}
              `}
            >
              Create
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>,
    portalTarget
  );
}
