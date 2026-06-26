"use client";

import { useState } from "react";
import { resetPasswordByEmail } from "@/firebase/authClient";

export default function ForgotPasswordBlock({ onBack }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleReset = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError(true);
      setSent(false);
      return;
    }
    setError(false);
    setSent(false);
    setIsLoading(true);
    try {
      await resetPasswordByEmail(trimmed);
      setSent(true);
      setErrorMessage("");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setErrorMessage("No account found with this email.");
      } else {
        setErrorMessage("Something went wrong. Try again.");
      }
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-xl p-0 bg-transparent">
      <h2 className="text-xl font-semibold mb-1 text-center text-white">Reset password</h2>
      <p className="text-sm text-white/50 mb-6 text-center">
        Enter your email address and we will send you a reset link to update your password.
      </p>

      <div className="relative mb-3">
        <img
          src="/Mail.svg"
          alt="Email"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 pointer-events-none"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleReset()}
          placeholder="Email address"
          className={`w-full p-3 pl-10 rounded-xl bg-white/[0.07] border text-white placeholder-white/30 text-sm outline-none focus:ring-2 transition ${
            error
              ? "border-red-500/70 focus:ring-red-500/40"
              : "border-white/[0.10] focus:ring-blue-500/40 focus:border-blue-500/40"
          }`}
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-3">
          {errorMessage || "Email is required"}
        </p>
      )}

      <button
        onClick={handleReset}
        disabled={isLoading || sent}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 text-white py-2.5 rounded-xl mt-3 text-sm font-medium"
      >
        {isLoading && (
          <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        )}
        {isLoading ? "Sending…" : "Send reset link"}
      </button>

      {sent && (
        <p className="text-emerald-400 text-sm mt-4 text-center">
          Reset link sent! Check your email.
        </p>
      )}

      <div className="flex justify-center mt-8">
        <button
          onClick={onBack}
          className="text-blue-400 text-sm hover:underline"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
