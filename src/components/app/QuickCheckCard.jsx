"use client";

import { useContext } from "react";
import { UIContext } from "@/context/UIContext";

export default function QuickCheckCard({ question, onNext }) {
  const { setInputText } = useContext(UIContext);

  const handleClick = () => {
    setInputText(question.text);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-10 px-4 py-6 rounded-2xl shadow-md">
      {/* Заголовок с лампочкой */}
      <div className="flex items-center gap-2 mb-4">
        <img src="/Lightbulb.svg" alt="Idea" className="w-7 h-7 sm:w-8 sm:h-8" />
        <span className="text-white/70 text-sm sm:text-base tracking-wide">
          Quick Check:
        </span>
      </div>

      {/* Вопрос */}
      <p className="text-base sm:text-xl font-semibold text-white mb-2 leading-snug sm:leading-normal">
        {question.text}
      </p>

      {/* Ref */}
      <p className="text-xs text-gray-400 mb-5">
        Ref: {question.ref}
      </p>

      {/* Кнопки */}
{/* Actions */}
<div className="flex justify-between items-center mt-4">
  {/* Left: Next */}
  <div className="relative group flex items-center">
  <button
    onClick={onNext}
    className="flex items-center justify-center w-9 h-9 rounded-md text-white/70 hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus:outline-none focus:ring-2 focus:ring-blue-500/50
"
    aria-label="Next question"
  >
    <img src="/Arrow_Right.svg" alt="" className="w-4 h-4" />
  </button>

  {/* Tooltip — показываем только на десктопе */}
  <div className="hidden md:block absolute top-full mt-2 px-2 py-[2px] text-xs bg-blue-600 text-white rounded shadow opacity-0 group-hover:opacity-100 transition-opacity z-[100] whitespace-nowrap">
    Next question
  </div>
</div>

  {/* Right: Ask this */}
  <button
    onClick={handleClick}
    className="inline-flex items-center gap-2 px-3.5 h-9 rounded-md text-white/70 hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
    aria-label="Ask this"
  >
    <img src="/Chat.svg" alt="" className="w-4 h-4 opacity-80" />
    <span className="text-sm">Ask this</span>
  </button>
</div>
    </div>
  );
}
