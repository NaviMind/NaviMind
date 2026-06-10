"use client";

import { motion } from "framer-motion";
import DeckDepartment from "./departments/Deck";

export default function ProfileCard({
  form,
  setForm,
  department,
  setDepartment,
  supportsAdvanced,
  advancedCompleted,
  setAdvancedTouched,
  onSubmit,
  onClose,
  showAdvancedOverlay,
  setShowAdvancedOverlay,
  setStep,
  slideVariants,
  isSaved,
  isDirty,
}) {
  const isEditMode = isSaved && !isDirty;
  const canSave = form.rank && form.vesselType && form.capacity.trim();
  return (
    <motion.form
      key="profile"
      onSubmit={onSubmit}
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
        overflow-y-auto
        p-5
        sm:p-6
      "
      variants={slideVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="w-6" />

        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">
            Vessel Profile
          </h2>

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

      {showAdvancedOverlay && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl p-6">
          <div className="bg-gray-900/90 rounded-2xl p-6 w-full max-w-sm text-center shadow-xl ring-1 ring-white/10">
            <h3 className="text-lg font-semibold mb-3">
              Advanced Vessel Data
            </h3>

            <p className="text-sm text-gray-400 mb-6">
              This vessel type supports Advanced Vessel Data.
              Recommended for accurate operational reasoning.
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAdvancedOverlay(false);
                  setStep("advanced");
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-medium transition"
              >
                Add Details
              </button>

              <button
  type="button"
  onClick={() => {
    setShowAdvancedOverlay(false);
    setAdvancedTouched(true);
  }}
                className="text-gray-400 hover:text-white transition text-sm"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex bg-gray-700/40 rounded-xl p-1 mb-4 shrink-0">
        <div
          className={`
            absolute top-1 bottom-1 w-[calc(50%-4px)]
            rounded-lg
            bg-gradient-to-br from-blue-500 to-blue-600
            shadow-lg shadow-blue-900/40
            transition-transform duration-300 ease-in-out
            ${department === "deck"
              ? "translate-x-0 left-1"
              : "translate-x-full left-1"}
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
          <div className="text-gray-400 text-sm p-4 text-center">
            Engine department coming next...
          </div>
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
    </motion.form>
  );
}