"use client";

import { useState } from "react";

export default function WelcomeModalMobile({ onClose, onShowTerms, onShowPrivacy }) {
  const [checked, setChecked] = useState(false);

  const handleAccept = () => {
    if (!checked) return;
    onClose();
  };

  return (
      <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl shadow-2xl 
                w-full max-w-sm max-h-[75vh] overflow-y-auto flex flex-col mt-16 mb-6 ring-1 ring-white/10">
        {/* Контент + скролл */}
        <div className="flex-1 p-5 space-y-5">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-3">Welcome to NaviMind</h2>
            <p className="text-gray-400 dark:text-gray-400 text-sm leading-relaxed mb-5">
              NaviMind is built to make maritime work easier,<br />
              helping seafarers find answers faster,<br />
              stay compliant and reduce paperwork,<br />
              so you can focus on real operations.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <FeatureItem
              icon="/welcom/solas.png"
              title="Maritime Knowledge Base"
              text="Ask your question and get an AI answer backed by SOLAS, MARPOL, ISM and flag circulars. Straight to the point, reliable, and without digging through manuals."
            />
            <FeatureItem
              icon="/welcom/Checklist Paper.png"
              title="Smart Ops & Compliance"
              text="AI helps you prepare for inspections, structure PMS tasks, and draft reports for agents or the office. Everything stays aligned with your Safety Management System."
            />
            <FeatureItem
              icon="/welcom/emergency siren light.png"
              title="Troubleshooting & Emergency Support"
              text="Describe an issue or upload a file from machinery faults to safety drills and receive a clear AI response based on verified maritime references."
            />
             <FeatureItem
          icon="/welcom/envelope with a letter.png"
          title="Clear Communication & Forms"
          text="NaviMind helps you understand what the office, agents, or local authorities really ask from you. It can suggest clear replies, draft emails, and guide you through forms, so you don’t waste time guessing the right wording."
        />
          </div>

          {/* Terms */}
          <div className="bg-white/40 dark:bg-gray-700/40 rounded-lg p-3 flex items-start gap-2">
            <input
              type="checkbox"
              id="terms"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 w-6 h-6 min-w-[24px] min-h-[24px] accent-blue-600 cursor-pointer touch-manipulation"
            />
            <label
              htmlFor="terms"
              className="text-xs text-gray-600 dark:text-gray-300"
            >
              I have read and agree with the{" "}
              <button
                type="button"
                onClick={onShowTerms}
                className="underline hover:text-blue-600 dark:hover:text-blue-400"
              >
                Terms of Service
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={onShowPrivacy}
                className="underline hover:text-blue-600 dark:hover:text-blue-400"
              >
                Privacy Policy
              </button>
            </label>
          </div>

          {/* Button */}
          <button
            onClick={handleAccept}
            disabled={!checked}
            className={`w-full py-3 rounded-lg text-sm font-medium transition ${
              checked
                ? "bg-blue-600 hover:bg-blue-500 text-white"
                : "bg-blue-900/50 text-gray-400 cursor-not-allowed"
            }`}
          >
            Accept & Start
          </button>
        </div>
      </div>
  );
}

function FeatureItem({ icon, title, text }) {
  return (
   <div className="bg-white/25 dark:bg-gray-700/25 backdrop-blur-lg ring-1 ring-white/10 rounded-lg p-4 flex items-start gap-3 shadow-md">
      <img
  src={icon}
  alt=""
  className="w-10 h-10 sm:w-6 sm:h-6 mt-1 opacity-90 transition-all"
 />
      <div>
        <h3 className="font-semibold text-sm mb-1">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">{text}</p>
      </div>
    </div>
  );
}
