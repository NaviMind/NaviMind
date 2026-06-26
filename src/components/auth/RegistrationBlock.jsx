"use client";

import { useState } from "react";
import { registerWithEmail } from "@/firebase/authClient";

export default function RegistrationBlock({
  onBack,
  prefilledEmail = "",
  prefilledPassword = "",
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState(prefilledPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [country, setCountry] = useState("");
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!firstName || !lastName || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);
    try {
      await registerWithEmail({ email, password, firstName, lastName, country });
      setEmailSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = "w-full p-3 pl-10 rounded-xl bg-white/[0.07] border border-white/[0.10] text-white placeholder-white/30 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
      <h2 className="text-xl font-semibold mb-2 text-white text-center">
        Create your account
      </h2>

      {/* First Name + Last Name */}
      <div className="flex gap-3">
        <div className="relative w-full">
          <img src="Person.svg" alt="First Name"
               className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 pointer-events-none" />
          <input
            type="text"
            placeholder="First Name"
            className={inputCls}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={emailSent}
          />
        </div>
        <div className="relative w-full">
          <img src="Person.svg" alt="Last Name"
               className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 pointer-events-none" />
          <input
            type="text"
            placeholder="Last Name"
            className={inputCls}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={emailSent}
          />
        </div>
      </div>

      {/* Email */}
      <div className="relative">
        <img src="/Mail.svg" alt="Email"
             className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 pointer-events-none" />
        <input
          type="email"
          placeholder="Email address"
          className={inputCls}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={emailSent}
        />
      </div>

      {/* Password */}
      <div className="relative">
        <img src="/Lock.svg" alt="Password"
             className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 pointer-events-none" />
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${inputCls} pr-10`}
          disabled={emailSent}
        />
        <span
          onClick={() => !emailSent && setShowPassword((prev) => !prev)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer ${emailSent ? "pointer-events-none opacity-50" : ""}`}
        >
          <img
            src={showPassword ? "/Visibility_off.svg" : "/Visibility.svg"}
            alt="Toggle visibility"
            className="w-5 h-5 opacity-50 hover:opacity-80 transition"
          />
        </span>
      </div>

      {/* Country */}
      <div className="relative">
        <img src="Country.svg" alt="Country"
             className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 pointer-events-none" />
        <input
          type="text"
          placeholder="Country (optional)"
          className={inputCls}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          disabled={emailSent}
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={emailSent || isLoading}
        className={`flex items-center justify-center gap-2 text-white text-sm font-medium py-2.5 rounded-xl mt-3 transition-all duration-200
          ${emailSent
            ? "bg-white/10 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"}`}
      >
        {isLoading && (
          <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        )}
        {emailSent ? "Email sent" : isLoading ? "Registering…" : "Register"}
      </button>

      {emailSent ? (
        <>
          <p className="text-sm text-white/60 text-center leading-relaxed mt-1">
            Please confirm your email and then log in again.
          </p>
          <button type="button" onClick={onBack}
                  className="text-sm text-white/40 hover:text-white/70 hover:underline transition-colors mt-4 text-center">
            ← Back to Login
          </button>
        </>
      ) : (
        <button type="button" onClick={onBack}
                className="text-sm text-white/40 hover:text-white/70 hover:underline transition-colors mt-1 text-center">
          ← Back to Login
        </button>
      )}
    </form>
  );
}
