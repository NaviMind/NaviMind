"use client";

import { motion, AnimatePresence } from "framer-motion";
import LNGAdvancedContent from "./Advanced/LNGAdvancedContent";

export default function AdvancedCard({
  onBack,
  onSave,
  form,
  setForm,
  showSuccess,
  isEditMode,
}) {
  return (
    <div className="relative w-full">
      {/* Card */}
      <div className="
        relative
        bg-white/90 dark:bg-gray-800/40
        backdrop-blur-xl
        rounded-2xl
        shadow-2xl
        ring-1 ring-black/5 dark:ring-white/10
        text-gray-900 dark:text-white
        w-full
        flex flex-col
        min-h-0
        max-h-[75vh]
        sm:max-h-[95vh]
        p-5
        sm:p-6
      ">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              Advanced Vessel Data
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Add vessel-specific technical parameters to improve operational reasoning and cargo system guidance.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            aria-label="Close"
            className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scroll px-2 mt-4 space-y-4">
          <LNGAdvancedContent form={form} setForm={setForm} />
        </div>

        {/* FIXED BOTTOM BUTTON */}
        <button
          type="button"
          onClick={isEditMode ? onBack : onSave}
          className={`mt-4 shrink-0 px-4 py-2 rounded-xl font-medium transition ${
            isEditMode
              ? "bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-white border border-gray-300 dark:border-transparent"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isEditMode ? "Edit" : "Save Data"}
        </button>
      </div>

      {/* SUCCESS OVERLAY */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-[60] flex flex-col items-center justify-center rounded-2xl bg-white/95 dark:bg-gray-900/90 backdrop-blur-md overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 280, damping: 22 }}
              className="mb-6"
            >
              <div
                className="w-24 h-24 rounded-full border-2 border-blue-500/60 bg-blue-600/10 flex items-center justify-center"
                style={{ boxShadow: "0 0 48px rgba(59,130,246,0.22)" }}
              >
                <motion.svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-11 h-11 text-blue-400"
                >
                  <motion.path
                    d="M5 13l4 4L19 7"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: 0.35, duration: 0.45, ease: "easeOut" }}
                  />
                </motion.svg>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.35 }}
              className="text-center px-6"
            >
              <p className="text-xl font-semibold text-gray-900 dark:text-white tracking-wide mb-2">
                Advanced Data Saved
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 tracking-wide">
                LNG parameters activated
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
