"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginBlock({
  email, setEmail,
  password, setPassword,
  showPassword, setShowPassword,
  errors,
  step = "email",
  onEmailContinue,
  onLogin,
  onBackToEmail,
  onForgot,
  authError = "",
  onClearAuthError = () => {},
  isSubmitting = false,
}) {
  const passwordRef = useRef(null);

  useEffect(() => {
    if (step === "password") {
      const t = setTimeout(() => passwordRef.current?.focus(), 280);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <div className="w-full max-w-xl rounded-xl p-0 bg-transparent">

      <h2 className="text-xl font-semibold mb-5 text-white text-center">
        {step === "email" ? "Get started" : "Welcome back"}
      </h2>

      {/* Email — редактируемое на шаге email, чип на шаге password */}
      {step === "email" ? (
        <div className="relative mb-4">
          <img src="/Mail.svg" alt="Email"
               className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 pointer-events-none" />
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); onClearAuthError(); }}
            onKeyDown={(e) => e.key === "Enter" && onEmailContinue()}
            placeholder="Email address"
            name="email"
            autoComplete="email"
            inputMode="email"
            className={`w-full p-3 pl-10 rounded-xl bg-white/[0.07] border text-white placeholder-white/30 text-sm outline-none focus:ring-2 transition ${
              errors.email || authError
                ? "border-red-500/70 focus:ring-red-500/40"
                : "border-white/[0.10] focus:ring-blue-500/40 focus:border-blue-500/40"
            }`}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
          <img src="/Mail.svg" alt="" className="w-5 h-5 opacity-40 flex-shrink-0" />
          <span className="flex-1 text-sm text-white/70 truncate">{email}</span>
          <button type="button" onClick={onBackToEmail}
                  className="text-xs text-blue-400 hover:underline flex-shrink-0">
            Change
          </button>
        </div>
      )}

      {errors.email && step === "email" && (
        <p className="text-red-400 text-xs mb-3">Email is required</p>
      )}

      {/* Password — плавно выезжает когда step === "password" */}
      <AnimatePresence initial={false}>
        {step === "password" && (
          <motion.div
            key="password-field"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden mb-4"
          >
            <div className="relative">
              <img src="/Lock.svg" alt="Password"
                   className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 pointer-events-none" />
              <input
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); onClearAuthError(); }}
                onKeyDown={(e) => e.key === "Enter" && onLogin()}
                placeholder="Password"
                name="password"
                autoComplete="current-password"
                className={`w-full p-3 pr-10 pl-10 rounded-xl bg-white/[0.07] border text-white placeholder-white/30 text-sm outline-none focus:ring-2 transition ${
                  errors.password || authError
                    ? "border-red-500/70 focus:ring-red-500/40"
                    : "border-white/[0.10] focus:ring-blue-500/40 focus:border-blue-500/40"
                }`}
              />
              <span onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
                <img src={showPassword ? "/Visibility_off.svg" : "/Visibility.svg"}
                     alt="Toggle" className="w-5 h-5 opacity-50 hover:opacity-80 transition" />
              </span>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-2">Password is required</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {authError && (
        <p className="text-red-400 text-xs mb-3">{authError}</p>
      )}

      <button
        type="button"
        onClick={step === "email" ? onEmailContinue : onLogin}
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 text-white py-2.5 rounded-xl mb-3 text-sm font-medium"
      >
        {isSubmitting && (
          <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        )}
        {isSubmitting ? "Please wait…" : step === "email" ? "Continue" : "Sign in"}
      </button>

      {step === "password" && (
        <div className="flex justify-start text-sm">
          <button type="button" onClick={onForgot}
                  className="text-blue-400 hover:underline">
            Forgot password?
          </button>
        </div>
      )}
    </div>
  );
}
