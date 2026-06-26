"use client";

export default function AuthCard({ children, variant = "login" }) {
  let mobileStyles = "";
  if (variant === "login")    mobileStyles = "px-4 pt-5 pb-10 min-h-[350px]";
  if (variant === "forgot")   mobileStyles = "px-4 pt-5 pb-6 min-h-[240px]";
  if (variant === "register") mobileStyles = "px-4 pt-5 pb-4 min-h-[320px]";

  return (
    <div
      className={`
        w-full max-w-sm flex flex-col rounded-2xl
        border border-white/[0.08]
        bg-white/[0.05] backdrop-blur-xl shadow-2xl
        ${mobileStyles}
        md:max-w-xl md:rounded-2xl md:px-10 md:pt-6 md:pb-14 md:min-h-[420px]
      `}
    >
      {children}
    </div>
  );
}
