"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { landingQuickChecks } from "@/data/landingQuickChecks";
import ParticleBackground from "@/components/landing/ParticleBackground";
import Logo from "@/components/branding/Logo";


export default function WelcomePage() {
  const router = useRouter();

  const [qIndex, setQIndex] = useState(() =>
  Math.floor(Math.random() * landingQuickChecks.length)
);
  const [typed, setTyped] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  const TYPING_DURATION_MS = 4000;
  const READING_PAUSE_MS = 3000;
  const FADE_MS = 400;

  const current = landingQuickChecks[qIndex] || { text: "", ref: "" };
  const typingTimerRef = useRef(null);
  const holdTimerRef = useRef(null);

  useEffect(() => {
    clearTimeout(typingTimerRef.current);
    clearTimeout(holdTimerRef.current);

    setTyped("");
    setIsTyping(true);

    const full = current.text || "";
    const perChar =
      full.length > 0 ? TYPING_DURATION_MS / full.length : TYPING_DURATION_MS;

    let i = 0;
    const type = () => {
      setTyped(full.slice(0, i));
      i += 1;
      if (i <= full.length) {
        typingTimerRef.current = setTimeout(type, perChar);
      } else {
        setIsTyping(false);
        holdTimerRef.current = setTimeout(() => {
         setQIndex((prev) => {
  let next = prev;
  while (next === prev) {
    next = Math.floor(Math.random() * landingQuickChecks.length);
  }
  return next;
});
        }, READING_PAUSE_MS);
      }
    };

    typingTimerRef.current = setTimeout(type, perChar);

    return () => {
      clearTimeout(typingTimerRef.current);
      clearTimeout(holdTimerRef.current);
    };
  }, [qIndex, current.text]);

  return (
    <motion.div
      className="WelcomePage fixed inset-0 z-[100] flex flex-col items-center justify-center gradient-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Фон */}
      <div className="absolute inset-0 gradient-bg">
        <ParticleBackground />
      </div>

      {/* Контент */}
      <div className="relative z-10 flex flex-col items-center justify-between flex-1 px-6 text-center py-10 sm:py-16 md:py-20 lg:py-24">
  {/* Верх: логотип + слоган */}
  <div className="flex flex-col items-center mb-10">
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    className="mb-4"
  >
    <Logo />
  </motion.div>
    <motion.p
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5 }}
      className="text-[14px] sm:text-[16px] md:text-[17px] font-medium text-white/70 tracking-wide mb-6"
>
      Your AI Copilot for Maritime Operations.
    </motion.p>
  </div>

  {/* Низ: typewriter */}
  <div className="min-h-[80px] flex items-center justify-center w-full welcome-typewriter">
    <AnimatePresence mode="wait">
      <motion.div
        key={qIndex}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: FADE_MS / 1000 }}
      >
        <p className="text-[22px] sm:text-[36px] font-extrabold leading-snug px-4 text-center whitespace-normal break-words max-w-[800px] mx-auto">
  {typed}
  {isTyping && (
    <span
      aria-hidden="true"
      className="inline-block align-[-0.1em] w-[1px] h-[1.2em] bg-current ml-1"
    />
  )}
</p>
      </motion.div>
    </AnimatePresence>
  </div>

        {/* Кнопка */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-10"
        >
          <button
    type="button"
    onClick={() => router.push("/landing")}
    className="px-7 py-3 rounded-lg border border-cyan-500 text-base hover:text-white hover:bg-cyan-600 transition animate-pulse-outline pwa-button"
  >
    Ask NaviMind
  </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
