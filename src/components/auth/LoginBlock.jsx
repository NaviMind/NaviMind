"use client";

export default function LoginBlock({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  errors,
  setErrors,
  onContinue,
  onForgot,
  authError = "",
  onClearAuthError = () => {},
  isSubmitting = false,
}) {
  return (
    <div className="w-full max-w-xl rounded-xl p-0 bg-transparent">

      <h2 className="text-xl font-semibold mb-5 text-white text-center">Sign in</h2>

      {/* Email */}
      <div className="relative mb-4">
        <img
          src="/Mail.svg"
          alt="Email"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 pointer-events-none"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); onClearAuthError(); }}
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
      {errors.email && (
        <p className="text-red-400 text-xs mb-3">Email is required</p>
      )}

      {/* Password */}
      <div className="relative mb-4">
        <img
          src="/Lock.svg"
          alt="Password"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 pointer-events-none"
        />
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => { setPassword(e.target.value); onClearAuthError(); }}
          placeholder="Password"
          name="password"
          autoComplete="current-password"
          className={`w-full p-3 pr-10 pl-10 rounded-xl bg-white/[0.07] border text-white placeholder-white/30 text-sm outline-none focus:ring-2 transition ${
            errors.password || authError
              ? "border-red-500/70 focus:ring-red-500/40"
              : "border-white/[0.10] focus:ring-blue-500/40 focus:border-blue-500/40"
          }`}
        />
        <span
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
        >
          <img
            src={showPassword ? "/Visibility_off.svg" : "/Visibility.svg"}
            alt="Toggle visibility"
            className="w-5 h-5 opacity-50 hover:opacity-80 transition"
          />
        </span>
      </div>
      {errors.password && (
        <p className="text-red-400 text-xs mb-3">Password is required</p>
      )}

      {authError && (
        <p className="text-red-400 text-xs mb-3">{authError}</p>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 text-white py-2.5 rounded-xl mb-3 text-sm font-medium"
      >
        {isSubmitting && (
          <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        )}
        {isSubmitting ? "Please wait…" : "Continue"}
      </button>

      <div className="flex justify-between text-sm text-blue-400 mb-4">
        <button type="button" onClick={onForgot} className="hover:underline">
          Forgot password?
        </button>
      </div>

    </div>
  );
}
