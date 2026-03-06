"use client";

import { useState, useRef, useEffect } from "react";

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [search, setSearch] = useState(value || "");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (option) => {
    onChange(option);
    setSearch(option);
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const handleFocus = () => {
    const rect = wrapperRef.current.getBoundingClientRect();
    const parent = wrapperRef.current.closest("form");
    const parentRect = parent.getBoundingClientRect();
    const spaceBelow = parentRect.bottom - rect.bottom;
    const dropdownHeight = 240;

    setOpenUpward(spaceBelow < dropdownHeight);
    setOpen(true);
  };

  const handleKeyDown = (e) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    }

    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={search}
        placeholder={placeholder}
        onFocus={handleFocus}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="input-style pr-10"
      />

      {/* Arrow */}
      <button
  type="button"
  onClick={() => {
  const rect = wrapperRef.current.getBoundingClientRect();
  const parent = wrapperRef.current.closest("form");
  const parentRect = parent.getBoundingClientRect();
  const spaceBelow = parentRect.bottom - rect.bottom;
  const dropdownHeight = 240;

  setOpenUpward(spaceBelow < dropdownHeight);
  setOpen((prev) => !prev);
}}
  className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
>
  <svg
    className={`w-4 h-4 transition-transform ${
      open ? "rotate-180" : ""
    }`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 9l-7 7-7-7"
    />
  </svg>
</button>

      {/* Dropdown */}
      {open && filteredOptions.length > 0 && (
        <div
          className={`absolute left-0 right-0 ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          } bg-gray-900/95 backdrop-blur-md border border-gray-600/60 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scroll`}
        >
          {filteredOptions.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => handleSelect(option)}
              className={`w-full text-left px-3 py-2 text-sm transition ${
                index === highlightedIndex
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-700"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}