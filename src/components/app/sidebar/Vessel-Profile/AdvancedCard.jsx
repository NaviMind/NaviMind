"use client";

import { motion } from "framer-motion";
import LNGAdvancedContent from "./Advanced/LNGAdvancedContent";

export default function AdvancedCard({
  slideVariants,
  onBack,
  form,
  setForm,
  onSave,
}) {
  return (
    <motion.form
      key="advanced"
      className="
        relative
        bg-white/40 dark:bg-gray-800/40
        backdrop-blur-xl
        rounded-2xl
        shadow-2xl
        ring-1 ring-white/10
        w-full
        max-w-sm
        sm:max-w-lg
        flex flex-col
        min-h-0
        max-h-[75vh]
        sm:max-h-[95vh]
        p-5
        sm:p-6
      "
      variants={slideVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="w-6" />

        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">
            Advanced Vessel Data
          </h2>

          <p className="text-xs text-gray-400 mt-1 px-6">
            Add vessel-specific technical parameters to improve
            operational reasoning and cargo system guidance. 
          </p>

          <button
            type="button"
            onClick={onBack}
            className="absolute top-1 right-1 text-gray-400 hover:text-white transition p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            ✕
          </button>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scroll px-2 mt-4 space-y-4">
        <LNGAdvancedContent form={form} setForm={setForm} />
      </div>

      {/* FIXED BOTTOM BUTTON */}
      <button
        type="button"
        onClick={onSave}
        className="mt-4 shrink-0 px-4 py-2 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white transition"
      >
        Save Data
      </button>
    </motion.form>
  );
}