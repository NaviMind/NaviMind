"use client";

import Image from "next/image";

export default function Logo() {
  return (
    <div className="flex items-center justify-center w-[240px] md:w-[280px] mx-auto mb-2">
      {/* Compass без анимации, но с glow */}
      <div className="relative">
        <Image
          src="/branding/compass.png"
          alt="Compass"
          width={84}
          height={84}
          className="object-contain w-[64px] h-[64px] sm:w-[84px] sm:h-[84px]"
        />

        {/* Glow-подсветка */}
        <div className="absolute inset-0 rounded-full bg-blue-500 opacity-20 blur-2xl"></div>
      </div>

      {/* Wordmark */}
      <Image
        src="/branding/navimind-wordmark.png"
        alt="NaviMind"
        width={200}
        height={64}
        className="object-contain -ml-1 w-[140px] sm:w-[200px]"
      />
    </div>
  );
}
