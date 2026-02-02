"use client";

import { useState } from "react";
import { resetPasswordByEmail } from "@/firebase/authClient";

export default function ForgotPasswordBlock({ onBack }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);
  const [sent, setSent] = useState(false);
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
}
};

  return (
    <div className="w-full max-w-xl rounded-xl p-0 bg-transparent">
      <h2 className="text-2xl font-semibold mb-1 text-center">Reset password</h2>
      <p className="text-sm text-gray-400 mb-6 text-center">
        Enter your email address and we will send you a reset link to update your password.
      </p>

      {/* Email input */}
      <div className="relative mb-6">
        <img
          src="/Mail.svg"
          alt="Email"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-70 pointer-events-none"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className={`w-full p-3 pl-10 rounded bg-gray-800 text-white placeholder-gray-400 text-sm outline-none focus:ring-2 ${
            error
              ? "border border-red-500 focus:ring-red-500"
              : "focus:ring-blue-600"
          }`}
        />
      </div>
      {error && (
  <p className="text-red-500 text-sm mt-1">
    {errorMessage || "Email is required"}
  </p>
)}

      {/* Continue button */}
      <button
        onClick={handleReset}
        className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-2 rounded mt-3 text-sm font-medium shadow"
      >
        Send reset link
      </button>

      {/* Success message */}
      {sent && (
        <p className="text-green-500 text-sm mt-4 text-center">
          Reset link sent! Check your email.
        </p>
      )}

      {/* Back to login */}
      <div className="h-20" />

<div className="text-center">
  <button
    onClick={onBack}
    className="text-blue-400 text-sm hover:underline"
  >
    <span className="hidden md:inline"> </span>Back to Login
  </button>
</div>
    </div>
  );
}
