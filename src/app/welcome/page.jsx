"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { landingQuickChecks } from "@/data/landingQuickChecks";
import ParticleBackground from "@/components/landing/ParticleBackground";
import { loginWithGoogle } from "@/firebase/authClient";
// import { loginWithApple } from "@/firebase/authClient";

export default function WelcomePage() {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showUI, setShowUI] = useState(false);

    async function handleGoogle() {
    setAuthError("");
    try {
      setIsSubmitting(true);
      await loginWithGoogle();
      router.replace("/app");
    } catch (err) {
      console.error("Google sign-in error:", err);
      alert("Google sign-in failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

 // async function handleApple() {
 // setAuthError("");
 // try {
  //  setIsSubmitting(true);
  //  await loginWithApple();
 //   router.replace("/app");
 // } catch (err) {
 //   console.error("Apple sign-in error:", err);
 //   alert("Apple sign-in failed. Please try again.");
 // } finally {
 //   setIsSubmitting(false);
 // }
// }

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
        if (!showUI) {
  setShowUI(true);
}
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
      className="WelcomePage fixed inset-0 z-[100] flex flex-col items-center justify-center gradient-bg text-white"
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
      <div className="
  relative z-10
  flex flex-col items-center justify-between flex-1
  px-6 text-center
  pt-10 sm:pt-16 md:pt-20 lg:pt-24
  pb-[calc(env(safe-area-inset-bottom)+4rem)]
">

  {/* Верх: логотип + слоган (без motion) */}
<motion.div
  className="flex flex-col items-center mb-1 sm:mb-6"
  initial={{ opacity: 0, y: -10 }}
 animate={{
  opacity: showUI ? 1 : 0,
  y: showUI ? 0 : -10,
}}
  transition={{ duration: 0.6, ease: "easeOut" }}
>
  <div className="max-w-2xl">
    <img
      src="/logo-navi.png"
      alt="NaviMind"
      className="w-[220px] md:w-[300px] h-auto object-contain mb-2 mx-auto"
    />

    <h2 className="text-[14px] font-medium text-white/60 tracking-wide text-center">
      Your AI Copilot for Maritime Operations.
    </h2>
  </div>
</motion.div>

  {/* Низ: typewriter */}
  <div className="min-h-[72px] sm:min-h-[96px] flex items-center justify-center w-full welcome-typewriter">
    <AnimatePresence mode="wait">
      <motion.div
        key={qIndex}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: FADE_MS / 1000 }}
      >
        <p className="text-[20px] sm:text-[30px] font-extrabold leading-snug px-4 text-center whitespace-normal break-words max-w-[800px] mx-auto">
  <span>{typed}</span>
  {isTyping && (
    <span
      aria-hidden="true"
      className="inline-block align-[-0.1em] w-[2px] h-[1.2em] bg-current -mr-[2px]"
    />
  )}
  {/* Прозрачный остаток резервирует полную высоту — без скачков при тайпинге */}
  <span aria-hidden="true" className="text-transparent">
    {current.text.slice(typed.length)}
  </span>
</p>
      </motion.div>
    </AnimatePresence>
  </div>
  
  {/* Auth buttons */}
<motion.div
  className="mt-6 flex flex-col items-center gap-4"
  initial={{ opacity: 0, y: 10 }}
  animate={{
  opacity: showUI ? 1 : 0,
  y: showUI ? 0 : -10,
}}
  transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
>

  {/* Google — primary, в фирменном стиле */}
<button
  type="button"
  onClick={handleGoogle}
  disabled={isSubmitting}
  className="
    w-[320px] sm:w-[360px] lg:w-[420px]
    mx-auto h-12
    flex items-center justify-center gap-4
    py-3 
    bg-white/5 backdrop-blur-sm
    text-white
    border border-white/20
    rounded-xl
    shadow-md
    hover:bg-white/15
    transition
    disabled:opacity-60 disabled:cursor-not-allowed
    text-sm font-medium
  "
>
  <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
  Continue with Google
</button>

 {/* Secondary options */}
<div className="w-[320px] sm:w-[360px] lg:w-[420px] mx-auto flex gap-3 mt-0.5">

  {/* Apple */}
  <button
    type="button"
    // onClick={handleApple}
    // disabled={isSubmitting}
    onClick={() => alert("Apple Sign-In coming next")}
    className="
      flex-1
      h-12
      flex items-center justify-center
      rounded-xl
      border border-white/20
      bg-white/5 backdrop-blur-sm
      hover:bg-white/15
      transition
    "
  >
    <img src="/apple-icon.svg" alt="Apple" className="w-5 h-5" />
  </button>

  {/* Email */}
  <button
    type="button"
    onClick={() => router.push('/landing')}
    className="
      flex-1
      h-12
      flex items-center justify-center
      rounded-xl
      border border-white/20
      bg-white/5 backdrop-blur-sm
      hover:bg-white/15
      transition
    "
  >
    <img src="/Mail-icon.svg" alt="Email" className="w-5 h-5" />
  </button>
</div>
</motion.div>

{/* Футер */}
      <footer className="absolute md:bottom-2 bottom-[max(env(safe-area-inset-bottom),0.5rem)] left-1/2 -translate-x-1/2 text-sm text-neutral-500">
        © 2026 NaviMind Inc.
      </footer>
      </div>

     {isSubmitting && (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm">
    <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  </div>
)}

    </motion.div>
  );
}
