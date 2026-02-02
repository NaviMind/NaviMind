"use client";

import { useRouter } from "next/navigation";
import { auth } from "@/firebase/config";
import { signInWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth";
import { useState } from "react";
import { motion } from "framer-motion";
import LoginBlock from "@/components/auth/LoginBlock";
import ForgotPasswordBlock from "@/components/auth/ForgotPasswordBlock";
import RegistrationBlock from "@/components/auth/RegistrationBlock";
import { loginWithGoogle, registerWithEmail, loginWithEmail } from "@/firebase/authClient";
import { AnimatePresence } from "framer-motion";
import ParticleBackground from "@/components/landing/ParticleBackground";
import AuthCard from "@/components/auth/AuthCard";

export default function LandingPage() {
 const [authError, setAuthError] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [errors, setErrors] = useState({ email:false, password:false });
 const [authStage, setAuthStage] = useState("login");
 const router = useRouter();
 const [showPassword, setShowPassword] = useState(false);

  // --- Google Sign-In ---
async function handleGoogle() {
  setAuthError("");
  try {
    setIsSubmitting(true);
    await loginWithGoogle();   
    router.replace("/app");      
  } catch (err) {
    if (err?.code === "auth/popup-closed-by-user") {
      setAuthError("Google popup was closed.");
    } else if (err?.code === "auth/cancelled-popup-request") {
      setAuthError("Popup request cancelled. Try again.");
    } else {
      setAuthError(err?.message || "Google sign-in error.");
    }
  } finally {
    setIsSubmitting(false);
  }
}

// --- Email/Password Sign-Up ---
async function handleRegister(userData = {}) {
  const {
    firstName,
    lastName,
    email: formEmail,
    password: formPassword,
  } = userData;

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || null;
  const finalEmail = (formEmail || email).trim();
  const finalPassword = formPassword || password;

  setAuthError("");
  if (!finalEmail || !finalPassword) {
    setAuthError("Email and password are required.");
    return;
  }

  try {
    setIsSubmitting(true);
    await registerWithEmail({
      email: finalEmail,
      password: finalPassword,
      displayName,
    });
    router.push("/app");
  } catch (err) {
    if (err?.code === "auth/email-already-in-use") {
      setAuthError("This email is already in use.");
    } else if (err?.code === "auth/invalid-email") {
      setAuthError("Invalid email format.");
    } else if (err?.code === "auth/weak-password") {
      setAuthError("Password is too weak.");
    } else {
      setAuthError(err?.message || "Sign-up error.");
    }
  } finally {
    setIsSubmitting(false);
  }
}

 // Continue //
  async function handleContinue() {
  const emailInput = email.trim().toLowerCase();
  const nextErrors = { email: !emailInput, password: !password };
  setErrors(nextErrors);
  if (nextErrors.email || nextErrors.password) return;

  setIsSubmitting(true);
  setAuthError("");

  try {
    // 1. Сначала проверим, какие методы входа доступны
    const methods = await fetchSignInMethodsForEmail(auth, emailInput);

    if (!methods || methods.length === 0) {
      // ➤ Новый email → на регистрацию
      setAuthStage("details");
      return;
    }

    if (methods.includes("google.com") && !methods.includes("password")) {
      setAuthError('This email is registered with Google. Use “Continue with Google”.');
      return;
    }

   // ✅ теперь логинимся с проверкой верификации
    await loginWithEmail(emailInput, password);
    router.replace("/app");

  } catch (e) {
    console.warn("Login error:", e.code);
    if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
      setAuthError("Incorrect email or password.");
    } else if (e.message.includes("Please verify your email")) {
      setAuthError("Please verify your email before logging in.");
    } else {
      setAuthError("Login failed. Try again.");
    }
  } finally {
    setIsSubmitting(false);
  }
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
}

  return (
    <>
    <main className="LoginPage h-dvh md:min-h-screen md:h-auto bg-[#0b1220] text-white flex flex-col md:flex-row font-outfit relative overflow-hidden">
       {/* 🔹 Фон со звёздами */}
  <ParticleBackground />
  
      {/* Левая часть */}
<motion.div
  initial={{ opacity: 0, x: -30 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 1.6, ease: "easeOut" }}
  className="w-full md:w-1/2 flex flex-col items-center md:justify-center px-6 md:px-12 pt-6 md:py-10 text-center"
>
  <div className="max-w-2xl">
    <motion.img
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 1.0 }}
      src="/logo-navi.png"
      alt="NaviMind AI"
      className="w-[200px] md:w-[280px] h-auto object-contain mb-2 mx-auto"
    />

    <motion.h2
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 1.5 }}
      className="text-[14px] font-medium text-white/70 tracking-wide mb-2 md:mb-6"
    >
      Your AI Copilot for Maritime Operations.
    </motion.h2>

    <motion.div
      key={`leftText-${authStage}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="hidden md:block text-gray-300 text-[20px] leading-relaxed space-y-6 text-left"
    >
      <p>{leftBlockText[authStage].p1}</p>
      <p className="text-gray-400 italic">{leftBlockText[authStage].p2}</p>
    </motion.div>
  </div>
</motion.div>

      {/* Правая часть — логика смены стейджей */}
      <motion.div
        key={authStage}
  initial={{ opacity: 0, x: 30 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -30 }}
  transition={{ duration: 1.6, ease: "easeOut" }}
        className="w-full md:w-1/2 flex justify-center md:items-center px-6 pt-0 md:p-8 mt-3 md:mt-0 
                   flex-none md:flex-none overflow-visible pb-8 md:pb-8"
      >
        
          <AnimatePresence mode="wait">
          {authStage === "login" && (
             <AuthCard key="login" variant="login">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <LoginBlock
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                errors={errors}
                setErrors={setErrors}
                onContinue={handleContinue} 
                onForgot={() => setAuthStage("forgot")}
                authError={authError}
                onClearAuthError={() => setAuthError("")}
                isSubmitting={isSubmitting}
                onGoogle={handleGoogle} 
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
              transition={{ duration: 0.4 }}
            >
              <ForgotPasswordBlock onBack={() => setAuthStage("login")} />
            </motion.div>
            </AuthCard>
          )}

          {authStage === "details" && (
            <AuthCard key="register" variant="register">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <RegistrationBlock
              onBack={() => setAuthStage("login")}
              onRegister={handleRegister}
              prefilledEmail={email}
              prefilledPassword={password}
            />
            </motion.div>
            </AuthCard>
          )}
          {/* Индикатор стадий: мобильный лейбл + десктопные точки */}
          </AnimatePresence>
      </motion.div>

      {/* Футер */}
      <footer className="absolute md:bottom-2 bottom-[max(env(safe-area-inset-bottom),0.5rem)] left-1/2 -translate-x-1/2 text-sm text-neutral-500">
        © 2025 NaviMind Inc.
      </footer>
    </main>
  </>
  );
}
