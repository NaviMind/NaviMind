"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const CARD_ICONS = [
  "/welcom/solas.png",
  "/welcom/Checklist Paper.png",
  "/welcom/emergency siren light.png",
  "/welcom/envelope with a letter.png",
];

const cards = [
  {
    icon: "/welcom/solas.png",
    title: "Maritime Knowledge Base",
    content: (
      <>
        <p>
          Instead of scrolling through hundreds of pages in SOLAS, MARPOL, or ISM manuals,
          you simply ask NaviMind. The system gives you the exact clause or paragraph you need fast and reliable.
        </p>
        <p>
          Need to check how a ballast operation should be logged? Want to confirm if sludge
          disposal requires an entry in the record book? Or maybe an inspector questions your
          drill report and you want to be sure he's correct? In each case, you don't waste time —
          you get the rule, the number, and the reference right away.
        </p>
        <p>
          This saves hours of searching, builds confidence during inspections, and helps you
          reply to office or port authority requests with solid backing. You open the book at
          the right page, point to the paragraph, and explain your position clearly —
          no guessing, no confusion.
        </p>
      </>
    ),
  },
  {
    icon: "/welcom/Checklist Paper.png",
    title: "Smart Ops & Compliance",
    content: (
      <>
        <p>
          NaviMind helps you prepare for inspections, structure PMS tasks, and draft reports for agents or the office.
          But NaviMind goes further: it keeps every step aligned with your Safety Management System (SMS), so nothing is missed.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Review port state inspection items and get instant regulatory references.</li>
          <li>Organize planned maintenance tasks and confirm records are filled correctly.</li>
          <li>Draft pre-arrival or cargo reports in minutes, already formatted for office or agent requests.</li>
        </ul>
        <p>
          This way you stay compliant, reduce paperwork stress, and walk into inspections with confidence —
          everything documented, everything backed by the rules.
        </p>
      </>
    ),
  },
  {
    icon: "/welcom/emergency siren light.png",
    title: "Troubleshooting & Emergency Support",
    content: (
      <>
        <p>
          When something goes wrong on board, time matters. With NaviMind,
          you can describe a machinery fault, upload a log extract, or ask about a safety drill, and receive
          a clear response built on verified maritime references.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Diagnose a boiler pressure drop and check recommended ISM procedures.</li>
          <li>Confirm the right MARPOL reference for an oil spill reporting chain.</li>
          <li>Get immediate steps for steering gear failure or blackout drills.</li>
        </ul>
        <p>
          Instead of searching manuals in the heat of the moment, you get structured guidance backed by SOLAS,
          ISM, and class rules — so your crew acts fast, safe, and compliant.
        </p>
      </>
    ),
  },
  {
    icon: "/welcom/envelope with a letter.png",
    title: "Clear Communication & Forms",
    content: (
      <>
        <p>
          Seafarers spend hours trying to figure out what offices, agents, or charterers really mean in their
          messages and forms. With NaviMind, you don't waste time guessing — the AI explains the terms,
          drafts clear replies, and guides you through official paperwork.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Decode tricky phrases like <em>BENDS</em> (both ends), <em>POL</em> (port of load), or <em>SHEX</em> (Sundays/Holidays excluded).</li>
          <li>Draft a professional ETA message with the right wording (<em>AGW WP</em> — all going well, weather permitting).</li>
          <li>Translate office or agent requests into clear step-by-step actions for the crew.</li>
          <li>Prepare port clearance or cargo forms with correct terms and no missing details.</li>
        </ul>
        <p>
          This way, you avoid misunderstandings, reduce back-and-forth emails, and keep communication professional,
          fast, and compliant.
        </p>
      </>
    ),
  },
];

export default function WelcomeModalDesktop({ onClose, onShowTerms, onShowPrivacy }) {
  const [currentCard, setCurrentCard] = useState(0);
  const [accepted, setAccepted] = useState(false);

  const isLast = currentCard === cards.length - 1;

  const handleNext = () => {
    if (!isLast) setCurrentCard((prev) => prev + 1);
  };

  const handleAccept = () => {
    if (!accepted) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/20 dark:bg-gray-800/20 backdrop-blur-xl">
      {/* Preload all card icons */}
      <div className="hidden" aria-hidden="true">
        {CARD_ICONS.map((src) => (
          <Image key={src} src={src} alt="" width={64} height={64} priority />
        ))}
      </div>

      {/* Glass card */}
      <div className="w-[calc(100%-6cm)] h-[calc(100%-2cm)]
                      bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl
                      rounded-2xl ring-1 ring-white/10 shadow-2xl
                      flex flex-col overflow-hidden">

        {/* Header */}
        <div className="p-8 pb-6 text-center flex-shrink-0">
          <h2 className="text-3xl font-bold mb-3">Welcome to NaviMind</h2>
          <p className="text-gray-700 dark:text-gray-300 text-base max-w-2xl mx-auto leading-relaxed">
            NaviMind is built to make maritime work easier, helping seafarers find answers faster
            and stay compliant while cutting down paperwork, so you can focus on real operations.
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 relative px-10 pb-4 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCard}
              className="absolute inset-x-6 inset-y-0 w-[calc(100%-3rem)] h-full overflow-y-auto custom-scroll"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="bg-white/20 dark:bg-gray-700/20 backdrop-blur-lg rounded-xl p-6 ring-1 ring-white/10 shadow-md space-y-4">
                {/* Icon + title */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 shrink-0">
                    <Image
                      src={cards[currentCard].icon}
                      alt={cards[currentCard].title}
                      width={64}
                      height={64}
                      className="object-contain opacity-90"
                      priority
                    />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold
                      bg-gradient-to-r from-white via-blue-200 to-white
                      bg-[length:200%_100%] bg-clip-text text-transparent animate-shine">
                    {cards[currentCard].title}
                  </h3>
                </div>

                {/* Text */}
                <div className="space-y-4 text-base md:text-lg text-gray-300 leading-relaxed">
                  {cards[currentCard].content}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-10 pt-4 pb-6 flex-shrink-0 space-y-4">

          {/* Dot indicators */}
          <div className="flex justify-center items-center gap-2">
            {cards.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === currentCard
                    ? "w-6 h-2 bg-blue-500"
                    : "w-2 h-2 bg-white/25"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          {isLast ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-[0.95rem] text-gray-800 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={() => setAccepted((v) => !v)}
                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                />
                <span>
                  I agree with the{" "}
                  <button
                    type="button"
                    onClick={onShowTerms}
                    className="underline hover:text-blue-400 transition-colors"
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={onShowPrivacy}
                    className="underline hover:text-blue-400 transition-colors"
                  >
                    Privacy Policy
                  </button>
                </span>
              </label>

              <button
                disabled={!accepted}
                onClick={handleAccept}
                className={`h-10 px-6 text-sm font-medium rounded-lg shadow transition ml-auto ${
                  accepted
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "bg-blue-900/40 text-gray-500 cursor-not-allowed"
                }`}
              >
                Accept & Start
              </button>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={handleNext}
                className="h-10 px-6 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow transition flex items-center gap-2"
              >
                Continue
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
