"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export default function CustomSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [coords, setCoords] = useState(null);
  const [mounted, setMounted] = useState(false);

  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  // Sync displayed value when external value changes and dropdown is closed
  useEffect(() => {
    if (!open) setSearch(value || "");
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click, restore value if nothing was selected
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      const inWrapper = wrapperRef.current?.contains(e.target);
      const inList = listRef.current?.contains(e.target);
      if (!inWrapper && !inList) {
        setSearch(value || "");
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open, value]);

  const calculateCoords = () => {
    if (!wrapperRef.current) return null;
    const rect = wrapperRef.current.getBoundingClientRect();
    const maxH = 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < maxH + 8;
    return {
      left: rect.left,
      width: rect.width,
      top: openUp ? undefined : rect.bottom + 4,
      bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
    };
  };

  const openDropdown = () => {
    setCoords(calculateCoords());
    setSearch("");          // clear so all options show
    setHighlightedIndex(-1);
    setOpen(true);
  };

  const closeDropdown = (restore = true) => {
    if (restore) setSearch(value || "");
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const handleSelect = (option) => {
    onChange(option);
    setSearch(option);
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const filteredOptions = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") openDropdown();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((p) => (p < filteredOptions.length - 1 ? p + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((p) => (p > 0 ? p - 1 : filteredOptions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0) handleSelect(filteredOptions[highlightedIndex]);
    } else if (e.key === "Escape") {
      closeDropdown(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={search}
        placeholder={open ? (value || placeholder) : (value ? "" : placeholder)}
        onFocus={openDropdown}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!open) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="input-style pr-10"
        autoComplete="off"
      />

      {/* Selected value label when closed */}
      {!open && value && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white pointer-events-none truncate pr-8">
          {value}
        </span>
      )}

      {/* Arrow */}
      <button
        type="button"
        onClick={() => open ? closeDropdown(true) : openDropdown()}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition"
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown via portal — no double scroll, no clipping */}
      {mounted && open && coords && (
        createPortal(
          <div
            ref={listRef}
            style={{
              position: "fixed",
              left: coords.left,
              width: coords.width,
              top: coords.top,
              bottom: coords.bottom,
              zIndex: 9999,
              maxHeight: 240,
            }}
            className="bg-gray-900/95 backdrop-blur-md border border-gray-600/60 rounded-xl shadow-2xl overflow-y-auto custom-scroll"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // keep input focused
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-3 py-2 text-sm transition ${
                    index === highlightedIndex
                      ? "bg-blue-600 text-white"
                      : "text-gray-100 hover:bg-gray-700"
                  }`}
                >
                  {option}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-gray-500">No results</p>
            )}
          </div>,
          document.body
        )
      )}
    </div>
  );
}
