"use client";

import { motion } from "framer-motion";

export default function AdvancedLayout({
  title,
  description,
  children,
  onBack,
  onSave,
}) {
  const slideVariants = {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
  };

  return (
    <motion.div
      key="advanced"
      variants={slideVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="
        flex-1
        overflow-y-auto
        custom-scroll
        px-2
        mt-4
        space-y-6
      "
    >
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">
          {title}
        </h3>
        <p className="text-sm text-gray-400">
          {description}
        </p>
      </div>

      <div className="space-y-4">
        {children}
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <button
          type="button"
          onClick={onSave}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl transition"
        >
          Save Configuration
        </button>

        <button
          type="button"
          onClick={onBack}
          className="text-gray-400 hover:text-white transition text-sm"
        >
          ← Back to Vessel Profile
        </button>
      </div>
    </motion.div>
  );
}