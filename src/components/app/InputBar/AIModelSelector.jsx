"use client";

import { useState, useEffect, useRef } from "react";

const MODEL_LABELS = {
  gpt: "ChatGPT 5",
  gemini: "Gemini 2.5",
};

export default function AIModelSelector({ onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt");
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("navimind-model");
    if (saved) setSelectedModel(saved);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !buttonRef.current?.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (model) => {
    setSelectedModel(model);
    localStorage.setItem("navimind-model", model);
    if (onChange) onChange(model);
    setIsOpen(false);
  };

  return (
    <div className="relative text-sm ml-2 w-[fit-content]">
      {/* Кнопка выбора модели */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-transparent text-white text-[13px] sm:text-[13.5px] border border-white/10 hover:border-blue-500 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        AI: {MODEL_LABELS[selectedModel]}
      </button>

      {/* Выпадающее меню */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-full mb-2 right-0 bg-gray-900 border border-white/10 text-white rounded-xl shadow-lg z-[1000] select-none w-full p-1"
        >
          {Object.entries(MODEL_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className={`flex w-full items-center px-2.5 py-[6px] text-[13px] text-left font-normal rounded-md transition ${
                selectedModel === key
                  ? "bg-white/10 font-semibold"
                  : "hover:bg-white/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
