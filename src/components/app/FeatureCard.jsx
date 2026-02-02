
"use client";

export default function FeatureCard({ icon, title, text, children }) {
  return (
    <div className="rounded-2xl bg-[#0b1220]/70 border border-white/5 shadow-lg p-5 md:p-6">
      <div className="flex gap-4">
        <img
          src={icon}
          alt=""
          className="w-6 h-6 opacity-90 mt-1 shrink-0"
        />
        <div className="flex-1">
          <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>

          {children ? (
            <div className="mt-1 text-sm leading-6 text-gray-300 space-y-3">
              {children}
            </div>
          ) : (
            <p className="mt-1 text-sm leading-6 text-gray-300 whitespace-pre-line">
              {text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
