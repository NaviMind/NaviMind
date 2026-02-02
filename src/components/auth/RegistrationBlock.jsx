"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; 
import { registerWithEmail } from "@/firebase/authClient";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/firebase/config";

export default function RegistrationBlock({
  onBack,
  prefilledEmail = "",
  prefilledPassword = "",
}) {
  
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState(prefilledPassword);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [country, setCountry] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  if (!firstName || !lastName || !email || !password) {
    setError("Please fill in all required fields.");
    return;
  }

 try {
  await registerWithEmail({
    email,
    password,
    firstName,
    lastName,
    country,
  });

  // Отправка письма верификации
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  }

  setEmailSent(true);
} catch (err) {
  setError(err.message);
}
};

  return (
  <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
    <h2 className="text-xl font-semibold mb-2 text-white text-center">
      Create your account
    </h2>

    {/* First Name + Last Name */}
    <div className="flex gap-4">
      <div className="relative w-full">
        <img src="Person.svg" alt="First Name"
             className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-70 pointer-events-none" />
        <input
          type="text"
          placeholder="First Name"
          className="w-full p-3 pl-10 rounded bg-gray-800 text-white placeholder-gray-400 text-sm outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={emailSent}
        />
      </div>

      <div className="relative w-full">
        <img src="Person.svg" alt="Last Name"
             className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-70 pointer-events-none" />
        <input
          type="text"
          placeholder="Last Name"
          className="w-full p-3 pl-10 rounded bg-gray-800 text-white placeholder-gray-400 text-sm outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          disabled={emailSent}
        />
      </div>
    </div>

    {/* Email */}
    <div className="relative">
      <img src="/Mail.svg" alt="Email"
           className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-70 pointer-events-none" />
      <input
        type="email"
        placeholder="Email address"
        className="w-full p-3 pl-10 rounded bg-gray-800 text-white placeholder-gray-400 text-sm outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={emailSent}
      />
    </div>

    {/* Password */}
    <div className="relative">
      <img src="/Lock.svg" alt="Password"
           className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-70 pointer-events-none" />
      <input
        type={showPassword ? "text" : "password"}
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-3 pl-10 pr-10 rounded bg-gray-800 text-white placeholder-gray-400 text-sm outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
        disabled={emailSent}
      />
      <span
        onClick={() => !emailSent && setShowPassword((prev) => !prev)}
        className={`absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer ${emailSent ? "pointer-events-none opacity-50" : ""}`}
      >
        <img
          src={showPassword ? "/Visibility_off.svg" : "/Visibility.svg"}
          alt="Toggle visibility"
          className="w-5 h-5 opacity-70 hover:opacity-100 transition"
        />
      </span>
    </div>

    {/* Country (optional) */}
<div className="relative">
  <img src="Country.svg" alt="Country"
       className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-70 pointer-events-none" />
  <input
    type="text"
    placeholder="Country"
    className="w-full p-3 pl-10 rounded bg-gray-800 text-white placeholder-gray-400 text-sm outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
    value={country}
    onChange={(e) => setCountry(e.target.value)}
    disabled={emailSent}
  />
</div>

    {error && <p className="text-red-500 text-sm">{error}</p>}

    {/* Register button: блокируем после успешной отправки */}
    <button
      type="submit"
      disabled={emailSent}
      className={`text-white text-sm font-medium py-2.5 rounded mt-6 transition
                  ${emailSent
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"}`}
      aria-disabled={emailSent}
    >
      {emailSent ? "Email sent" : "Register"}
    </button>

    {/* Информационное сообщение + действия после отправки */}
    {emailSent && (
  <>
    <p className="text-sm text-gray-300 text-center leading-relaxed mt-2">
      Please confirm your email and then log in again.
    </p>

    <button type="button" 
    onClick={onBack} 
    className="text-sm text-blue-400 hover:underline mt-6" 
    > 
    Back to Login 
    </button> 
    </> 
    )} 
    {/* Если email ещё не отправлен — показываем обычный Back */}
     {!emailSent && ( 
        <button 
        type="button" 
     onClick={onBack} 
     className="text-sm text-blue-400 hover:underline mt-1" 
     > 
     Back to Login 
     </button> 
     )} 
     </form> 
     ); 
    }
