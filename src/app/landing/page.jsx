"use client";

import { useRouter } from "next/navigation";
import { auth } from "@/firebase/config";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoginBlock from "@/components/auth/LoginBlock";
import ForgotPasswordBlock from "@/components/auth/ForgotPasswordBlock";
import RegistrationBlock from "@/components/auth/RegistrationBlock";
import { loginWithEmail } from "@/firebase/authClient";
import ParticleBackground from "@/components/landing/ParticleBackground";
import AuthCard from "@/components/auth/AuthCard";

export default function LandingPage() {
  const [authError, setAuthError]     = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [errors, setErrors]           = useState({ email: false, password: false });
  const [authStage, setAuthStage]     = useState("login");
  const [loginStep, setLoginStep]     = useState("email"); // "email" | "password"
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  function goToLogin() {
    setAuthStage("login");
    setLoginStep("email");
    setPassword("");
    setAuthError("");
    setErrors({ email: false, password: false });
  }

  // Step 1 — проверяем email
  async function handleEmailCheck() {
    const emailInput = email.trim().toLowerCase();
    if (!emailInput) { setErrors({ email: true, password: false }); return; }
    setErrors({ email: false, password: false });
    setIsSubmitting(true);
    setAuthError("");
    try {
      const methods = await fetchSignInMethodsForEmail(auth, emailInput);
      if (!methods || methods.length === 0) {
        // Новый пользователь → регистрация
        setAuthStage("details");
        return;
      }
      if (!methods.includes("password")) {
        setAuthError("An account with this email already exists. Please use password recovery to set a password and access your account.");
        return;
      }
      // Существующий пользователь → показываем поле пароля
      setLoginStep("password");
    } catch {
      setAuthError("Something went wrong. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 2 — логин
  async function handleLogin() {
    if (!password) { setErrors((p) => ({ ...p, password: true })); return; }
    setIsSubmitting(true);
    setAuthError("");
    try {
      await loginWithEmail(email.trim().toLowerCase(), password);
      router.replace("/app");
    } catch (e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setAuthError("Incorrect password.");
      } else if (e.message?.includes("Please verify your email")) {
        setAuthError("Please verify your email before logging in.");
      } else {
        setAuthError("Login failed. Try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBackToEmail() {
    setLoginStep("email");
    setPassword("");
    setAuthError("");
    setErrors({ email: false, password: false });
  }

  const leftBlockText = {
    login: {
      p1: "Powered by advanced AI and trusted maritime data, NaviMind supports safe decision making and compliance in high risk operations, where fatigue and human error can lead to critical consequences.",
      p2: "It reduces paperwork, eliminates guesswork and provides real time support, from inspections to onboard troubleshooting.",
    },
    details: {
      p1: "Create your free account and unlock AI powered maritime support. Get personalized access to procedures, checklists, safety tools, inspection prep and real time guidance all in one place, always up to date.",
      p2: "NaviMind adapts to your role, not the other way around. From OOWs and engineers to DPAs and superintendents, it helps you work smarter, stay compliant and focus on what matters, whether onboard or in the office.",
    },
    forgot: {
      p1: "Get back in and pick up where you left off. NaviMind keeps your maritime data and tools secure so you can quickly restore access to everything from smart search to real world case guidance.",
      p2: "Fast recovery. Full control. No downtime. Reset your password and return to a workspace built for maritime clarity, speed and confidence whenever and wherever you need it.",
    },
  };

  return (
    <>
      <main className="LoginPage h-dvh md:min-h-screen md:h-auto bg-[#0b1220] text-white flex flex-col md:flex-row font-outfit relative overflow-hidden">
        <ParticleBackground />

        {/* Левая часть */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full md:w-1/2 flex flex-col items-center md:justify-center px-6 md:px-12 pt-6 md:py-10 text-center"
        >
          <div className="max-w-2xl">
            <motion.img
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              src="/logo-navi.png"
              alt="NaviMind AI"
              className="w-[200px] md:w-[280px] h-auto object-contain mb-2 mx-auto"
            />
            <motion.h2
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="text-[14px] font-medium text-white/70 tracking-wide mb-2 md:mb-6"
            >
              Your AI Copilot for Maritime Operations.
            </motion.h2>
            <motion.div
              key={`leftText-${authStage}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="hidden md:block text-gray-300 text-[20px] leading-relaxed space-y-6 text-left"
            >
              <p>{leftBlockText[authStage]?.p1}</p>
              <p className="text-gray-400 italic">{leftBlockText[authStage]?.p2}</p>
            </motion.div>
          </div>
        </motion.div>

        {/* Правая часть */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full md:w-1/2 flex justify-center md:items-center px-6 pt-0 md:p-8 mt-3 md:mt-0 flex-none overflow-visible pb-8 md:pb-8"
        >
          <AnimatePresence mode="wait">
            {authStage === "login" && (
              <AuthCard key="login" variant="login">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <LoginBlock
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    errors={errors}
                    step={loginStep}
                    onEmailContinue={handleEmailCheck}
                    onLogin={handleLogin}
                    onBackToEmail={handleBackToEmail}
                    onForgot={() => setAuthStage("forgot")}
                    authError={authError}
                    onClearAuthError={() => setAuthError("")}
                    isSubmitting={isSubmitting}
                  />
                </motion.div>
              </AuthCard>
            )}

            {authStage === "forgot" && (
              <AuthCard key="forgot" variant="forgot">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ForgotPasswordBlock onBack={goToLogin} />
                </motion.div>
              </AuthCard>
            )}

            {authStage === "details" && (
              <AuthCard key="register" variant="register">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <RegistrationBlock
                    onBack={goToLogin}
                    prefilledEmail={email}
                    prefilledPassword=""
                  />
                </motion.div>
              </AuthCard>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </>
  );
}
