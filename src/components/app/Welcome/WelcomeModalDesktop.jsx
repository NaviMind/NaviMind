"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function WelcomeModalDesktop({ onClose, onShowTerms, onShowPrivacy }) {
  const [accepted, setAccepted] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);

  const handleAccept = () => {
    if (!accepted) return;
    onClose();
  };

  // 🔹 Две карточки
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
            drill report and you want to be sure he’s correct? In each case, you don’t waste time
            you get the rule, the number, and the reference right away.
          </p>

          <p>
            This saves hours of searching, builds confidence during inspections, and helps you
            reply to office or port authority requests with solid backing. You open the book at
            the right page, point to the paragraph, and explain your position clearly -
            no guessing, no confusion.
          </p>
        </>
      )
    },
    {
  icon: "/welcom/Checklist Paper.png",
  title: "Smart Ops & Compliance",
  content: (
    <>
      <p>
        AI helps you prepare for inspections, structure PMS tasks, and draft reports for agents or the office.
        But NaviMind goes further: it keeps every step aligned 
        with your Safety Management System (SMS), so nothing is missed.
      </p>

      <ul className="list-disc list-inside space-y-1">
        <li>Review port state inspection items and get instant regulatory references.</li>
        <li>Organize planned maintenance tasks and confirm records are filled correctly.</li>
        <li>Draft pre-arrival or cargo reports in minutes, already formatted for office or agent requests.</li>
      </ul>

      <p>
        This way you stay compliant, reduce paperwork stress, and walk into inspections with confidence,
        everything documented, everything backed by the rules.
      </p>
    </>
  )
  },
    {
  icon: "/welcom/emergency siren light.png",
    title: "Troubleshooting & Emergency Support",
    content: (
      <>
        <p>
          When something goes wrong on board, time matters. With NaviMind,
          you can describe a machinery fault, upload a log extract, or ask about a safety drill, and receive
          a clear AI response built on verified maritime references.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Diagnose a boiler pressure drop and check recommended ISM procedures.</li>
          <li>Confirm the right MARPOL reference for an oil spill reporting chain.</li>
          <li>Get immediate steps for steering gear failure or blackout drills.</li>
        </ul>
        <p>
          Instead of searching manuals in the heat of the moment, you get structured guidance backed by SOLAS,
          ISM, and class rules so your crew acts fast, safe, and compliant.
        </p>
      </>
    )
  },
{
    icon: "/welcom/envelope with a letter.png",
    title: "Clear Communication & Forms",
    content: (
      <>
        <p>
          Seafarers spend hours trying to figure out what offices, agents, or charterers really mean in their
          messages and forms. With NaviMind, you don’t waste
          time guessing the AI explains the terms, drafts clear replies, and guides you through official paperwork.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Decode tricky phrases like <em>BENDS</em> (both ends), <em>POL</em> (port of load), or <em>SHEX</em> (Sundays/Holidays excluded).</li>
          <li>Draft a professional ETA message with the right wording (<em>AGW WP</em> all going well, weather permitting).</li>
          <li>Translate office or agent requests into clear step-by-step actions for the crew.</li>
          <li>Prepare port clearance or cargo forms with correct terms and no missing details.</li>
        </ul>
        <p>
          This way, you avoid misunderstandings, reduce back and forth emails, and keep communication professional,
          fast, and compliant.
        </p>
      </>
    )
  }
];
  
  const handleNext = () => setCurrentCard((prev) => (prev + 1) % cards.length);
  const handlePrev = () => setCurrentCard((prev) => (prev - 1 + cards.length) % cards.length);

  return (
    // 🔹 ЛЁГКИЙ overlay (не чёрная заглушка) + лёгкий blur
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/20 dark:bg-gray-800/20 backdrop-blur-xl">
      {/* 🔹 Стеклянная карточка */}
      <div className="w-[calc(100%-6cm)] h-[calc(100%-2cm)] 
                      bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl
                      rounded-2xl ring-1 ring-white/10 shadow-2xl
                      flex flex-col overflow-hidden">

        {/* HEADER — фиксированный */}
        <div className="p-8 pb-6 text-center flex-shrink-0">
          <h2 className="text-3xl font-bold mb-3">Welcome to NaviMind</h2>
          <p className="text-gray-700 dark:text-gray-300 text-base max-w-2xl mx-auto leading-relaxed">
            NaviMind is built to make maritime work easier, helping seafarers find answers faster
            and stay compliant while cutting down paperwork, so you can focus on real operations.
          </p>
        </div>

        {/* CONTENT — ТОЛЬКО ЭТА ЧАСТЬ СКРОЛЛИТСЯ */}
        <div className="flex-1 relative px-10 pb-6 custom-scroll">
  <AnimatePresence mode="wait">
    <motion.div
      key={currentCard}
      className="absolute inset-x-6 inset-y-0 w-[calc(100%-3rem)] h-full overflow-y-auto"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4 }}
    >
              <FeatureCard icon={null} title={null}>
                <div className="space-y-4">
                  {/* Заголовок с иконкой */}
                  <div className="flex items-center gap-3">
                    <img
                      src={cards[currentCard].icon}
                      alt={cards[currentCard].title}
                      className="w-16 h-16 object-contain opacity-90"
                    />
                    <h3 className="text-2xl md:text-3xl font-bold 
                        bg-gradient-to-r from-white via-blue-200 to-white 
                        bg-[length:200%_100%] bg-clip-text text-transparent animate-shine">
                      {cards[currentCard].title}
                    </h3>
                  </div>

                  {/* Текст */}
                  <div className="space-y-4 text-base md:text-lg text-gray-300 leading-relaxed">
                    {cards[currentCard].content}
                  </div>
                </div>
              </FeatureCard>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation arrows */}
        <div className="flex justify-center gap-6 pb-2">
          <button onClick={handlePrev} className="opacity-60 hover:opacity-100 transition">
            <img src="/welcom/Arrow_Left.svg" alt="Previous" className="w-6 h-6" />
          </button>
          <button onClick={handleNext} className="opacity-60 hover:opacity-100 transition">
            <img src="/welcom/Arrow_Right.svg" alt="Next" className="w-6 h-6" />
          </button>
        </div>

        {/* FOOTER — фиксированный */}
        <div className="p-6 pt-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-[0.95rem] text-gray-800 dark:text-gray-300">
              <input
                type="checkbox"
                checked={accepted}
                onChange={() => setAccepted(v => !v)}
                className="w-5 h-5"
              />
              <span>
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
              </span>
            </label>

            <button
              disabled={!accepted}
              onClick={handleAccept}
              className={`h-10 px-5 text-sm font-medium rounded-lg shadow transition ml-auto
                ${accepted
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-blue-900/40 text-gray-400 cursor-not-allowed"}`}
            >
              Accept & Start
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, text, children }) {
  return (
    <div className="bg-white/20 dark:bg-gray-700/20 backdrop-blur-lg
                    rounded-xl p-6 ring-1 ring-white/10 shadow-md">
      <div className="flex items-start gap-4">
        {icon && (
          <img src={icon} alt="" className="w-7 h-7 mt-0.5 opacity-90" />
        )}
        <div>
          <h3 className="font-semibold text-lg mb-3">{title}</h3>

          {children ? (
            <div className="text-sm text-gray-300 dark:text-gray-300 leading-relaxed space-y-3">
              {children}
            </div>
          ) : (
            <p className="text-sm text-gray-300 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
