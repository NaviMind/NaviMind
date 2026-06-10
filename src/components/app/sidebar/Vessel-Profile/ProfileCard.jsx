"use client";

import { motion, AnimatePresence } from "framer-motion";
import DeckDepartment from "./departments/Deck";
import EngineDepartment from "./departments/Engine";

export default function ProfileCard({
  form,
  setForm,
  department,
  setDepartment,
  supportsAdvanced,
  advancedCompleted,
  onSubmit,
  onClose,
  setStep,
  isSaved,
  isDirty,
  showSuccess,
}) {
  const isEditMode = isSaved && !isDirty;
  const canSave = form.rank && form.vesselType && form.capacity.trim();

  return (
    <div className="relative w-full">
      {/* Form — has overflow-y-auto; overlays must live OUTSIDE this element */}
      <form
        onSubmit={onSubmit}
        className="
          relative
          bg-white/40 dark:bg-gray-800/40
          backdrop-blur-xl
          rounded-2xl
          shadow-2xl
          ring-1 ring-white/10
          w-full
          flex flex-col
          min-h-0
          max-h-[75vh]
          sm:max-h-[95vh]
          overflow-y-auto
          p-5
          sm:p-6
        "
      >
        <div className="flex items-center justify-between mb-2">
          <div className="w-6" />

          <div className="text-center mb-4">
            <h2 className="text-xl font-bold">Vessel Profile</h2>
            <p className="text-xs text-gray-400 mt-1 px-6">
              This helps NaviMind give vessel-specific answers and compliance guidance.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-1 right-1 text-gray-400 hover:text-white transition p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Department toggle */}
        <div className="relative flex bg-gray-700/40 rounded-xl p-1 mb-4 shrink-0">
          <div
            className={`
              absolute top-1 bottom-1 w-[calc(50%-4px)]
              rounded-lg
              bg-gradient-to-br from-blue-500 to-blue-600
              shadow-lg shadow-blue-900/40
              transition-transform duration-300 ease-in-out
              ${department === "deck" ? "translate-x-0 left-1" : "translate-x-full left-1"}
            `}
          />
          <button
            type="button"
            onClick={() => setDepartment("deck")}
            className={`relative flex-1 py-2 text-sm z-20 transition-colors duration-300
              ${department === "deck" ? "text-white" : "text-gray-300 hover:text-white"}`}
          >
            Deck
          </button>
          <button
            type="button"
            onClick={() => setDepartment("engine")}
            className={`relative flex-1 py-2 text-sm z-20 transition-colors duration-300
              ${department === "engine" ? "text-white" : "text-gray-300 hover:text-white"}`}
          >
            Engine
          </button>
        </div>

        {/* Scrollable department fields */}
        <div className="flex-1 overflow-y-auto custom-scroll px-2 mt-4 space-y-4">
          {department === "deck" && (
            <DeckDepartment
              form={form}
              setForm={setForm}
              supportsAdvanced={supportsAdvanced}
              advancedCompleted={advancedCompleted}
              setStep={setStep}
            />
          )}
          {department === "engine" && (
            <EngineDepartment form={form} setForm={setForm} />
          )}
        </div>

        <button
          type={isEditMode ? "button" : "submit"}
          disabled={!isEditMode && !canSave}
          onClick={isEditMode ? onClose : undefined}
          className={`
            mt-4 shrink-0 px-4 py-2 rounded-xl font-medium transition
            ${isEditMode
              ? "bg-gray-600 hover:bg-gray-500 text-white"
              : canSave
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed"}
          `}
        >
          {isEditMode ? "Edit" : "Save & Activate"}
        </button>
      </form>

      {/* Success overlay — outside the form, always covers the full card */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-[60] flex flex-col items-center justify-center rounded-2xl bg-gray-900/90 backdrop-blur-md overflow-hidden"
          >
            {/* Ring + checkmark */}
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

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.35 }}
              className="text-center px-6"
            >
              <p className="text-xl font-semibold text-white tracking-wide mb-2">
                Profile Activated
              </p>
              {form.rank && form.vesselType && (
                <p className="text-sm text-gray-400 tracking-wide">
                  {form.rank}
                  <span className="mx-2 text-gray-600">·</span>
                  {form.vesselType}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
