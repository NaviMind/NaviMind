"use client";

import { useEffect, useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UIContext } from "@/context/UIContext";
import WelcomeModalDesktop from "./WelcomeModalDesktop";
import WelcomeModalMobile from "./WelcomeModalMobile";
import TermsModalDesktop from "../Terms/TermsModalDesktop";
import TermsModalMobile from "../Terms/TermsModalMobile";
import PrivacyModalDesktop from "../Privacy/PrivacyModalDesktop";
import PrivacyModalMobile from "../Privacy/PrivacyModalMobile";

export default function WelcomeModal() {
  const { theme } = useContext(UIContext);
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState("welcome"); // "welcome" | "terms" | "privacy"
  const [isClosing, setIsClosing] = useState(false);
  const [currentCard, setCurrentCard] = useState(0); // lifted up so Terms/Privacy don't reset it

  useEffect(() => {
    // TODO: uncomment before launch to show welcome only once
    // const alreadyAccepted = localStorage.getItem("navimind_welcome_accepted");
    // if (alreadyAccepted) setOpen(false);

    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleClose = () => {
    localStorage.setItem("navimind_welcome_accepted", "1");
    setIsClosing(true);
    setTimeout(() => setOpen(false), 800);
  };

  if (!open) return null;

  const slideVariants = {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
  };

  return (
    <AnimatePresence mode="wait">
      {!isClosing && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={`fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-6 ${theme === "dark" ? "bg-black/60" : "bg-black/25"}`}
        >
          <AnimatePresence mode="wait">
            {step === "welcome" && (
              <motion.div
                key="welcome"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={isMobile ? "w-full max-w-sm flex justify-center" : "w-auto flex justify-center"}
              >
                {isMobile ? (
                  <WelcomeModalMobile
                    onClose={handleClose}
                    onShowTerms={() => setStep("terms")}
                    onShowPrivacy={() => setStep("privacy")}
                  />
                ) : (
                  <WelcomeModalDesktop
                    onClose={handleClose}
                    onShowTerms={() => setStep("terms")}
                    onShowPrivacy={() => setStep("privacy")}
                    currentCard={currentCard}
                    setCurrentCard={setCurrentCard}
                  />
                )}
              </motion.div>
            )}

            {step === "terms" && (
              <motion.div
                key="terms"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={isMobile ? "w-full max-w-sm flex justify-center" : "w-auto flex justify-center"}
              >
                {isMobile ? (
                  <TermsModalMobile onClose={() => setStep("welcome")} />
                ) : (
                  <TermsModalDesktop onClose={() => setStep("welcome")} />
                )}
              </motion.div>
            )}

            {step === "privacy" && (
              <motion.div
                key="privacy"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={isMobile ? "w-full max-w-sm flex justify-center" : "w-auto flex justify-center"}
              >
                {isMobile ? (
                  <PrivacyModalMobile onClose={() => setStep("welcome")} />
                ) : (
                  <PrivacyModalDesktop onClose={() => setStep("welcome")} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
