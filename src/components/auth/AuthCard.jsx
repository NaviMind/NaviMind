"use client";

export default function AuthCard({ children, variant = "login" }) {
  let baseClasses = "w-full max-w-sm border border-gray-700 flex flex-col rounded-lg";

  // 📱 разные настройки под тип блока
  let mobileStyles = "";
  if (variant === "login") {
    mobileStyles = "px-4 pt-5 pb-10 min-h-[350px]";
  }
  if (variant === "forgot") {
    mobileStyles = "px-4 pt-5 pb-6 min-h-[240px]";
  }
  if (variant === "register") {
    mobileStyles = "px-4 pt-5 pb-4 min-h-[320px]";
  }

  // 💻 десктоп — одинаково для всех
  let desktopStyles =
    "md:max-w-xl md:rounded-xl md:px-10 md:pt-6 md:pb-14 md:min-h-[420px]";

  return (
    <div className={`${baseClasses} ${mobileStyles} ${desktopStyles}`}>
      {children}
    </div>
  );
}
