"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, Link } from "lucide-react";
import { useState, useRef, useEffect } from "react";

// ─── Table wrapper с умными фейдами ──────────────────────────────────────────
function TableWrapper({ children }) {
  const scrollRef = useRef(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setScrollState({
      left: el.scrollLeft > 4,
      right: el.scrollLeft < maxScroll - 4,
    });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setScrollState({ left: false, right: maxScroll > 4 });
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative my-12">
      <div
        ref={scrollRef}
        className="relative w-full overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-gray-50 dark:bg-[#0d1424] custom-scroll"
        style={{ scrollbarWidth: "none" }}
      >
        <table className="w-full text-[13.5px] text-left border-collapse">
          {children}
        </table>
      </div>

      <div
        className="pointer-events-none absolute top-0 left-0 h-full w-10 transition-opacity duration-300 md:hidden rounded-l-2xl"
        style={{
          background: "linear-gradient(to right, var(--bg-app, #0b1220) 60%, transparent)",
          opacity: scrollState.left ? 1 : 0,
        }}
      />

      <div
        className="pointer-events-none absolute top-0 right-0 h-full w-10 transition-opacity duration-300 md:hidden rounded-r-2xl"
        style={{
          background: "linear-gradient(to left, var(--bg-app, #0b1220) 60%, transparent)",
          opacity: scrollState.right ? 1 : 0,
        }}
      />
    </div>
  );
}

// ─── Code block ───────────────────────────────────────────────────────────────
function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);
  const codeText = String(children).replace(/\n$/, "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Copy is not supported on this device.");
    }
  };

  return (
    <div className="relative group mt-5 mb-7 rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-200 dark:border-white/[0.05] bg-gray-100 dark:bg-white/[0.02]">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-white/10" />
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-white/10" />
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-white/10" />
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center text-gray-400 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/70 transition-colors duration-150 select-none"
        >
          {copied ? (
            <Check size={18} strokeWidth={2.5} />
          ) : (
            <Copy size={18} strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Code content */}
      <pre className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words overflow-x-auto">
        <code>{codeText}</code>
      </pre>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => {
  const cleaned = React.Children.map(children, (child) => {
    if (typeof child === "string") {
      return child.replace(/\s*\(\s*$/, "").replace(/^\s*\)\s*/, "");
    }
    return child;
  });

  return (
    <p className="mb-5 last:mb-0 leading-relaxed">
      {cleaned}
    </p>
  );
},

        h2: ({ children }) => (
          <h2 className="mt-8 mb-3 text-[18px] sm:text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
            {children}
          </h2>
        ),

        h3: ({ children }) => (
          <h3 className="mt-6 mb-2 text-[16px] sm:text-base font-semibold text-gray-800 dark:text-white/90 tracking-tight">
            {children}
          </h3>
        ),

        ul: ({ children }) => (
          <ul className="mb-5 pl-6 list-disc space-y-2">{children}</ul>
        ),

        ol: ({ children }) => (
          <ol className="mb-5 pl-6 list-decimal space-y-2">{children}</ol>
        ),

        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),

        hr: () => <div className="my-8 h-px w-full bg-gray-200 dark:bg-white/10" />,

        blockquote: ({ children }) => (
          <blockquote className="my-5 pl-4 pr-5 py-4 rounded-xl border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03] border-l-2 border-l-gray-400 dark:border-l-white/30 text-gray-600 dark:text-white/75 leading-relaxed">
            {children}
          </blockquote>
        ),

        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>
        ),
        
       a: ({ href, children }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="
        inline-flex items-center gap-1.5
        px-2.5 py-1
        rounded-full
        text-xs
        bg-gray-100 dark:bg-white/[0.04]
        border border-gray-200 dark:border-white/[0.08]
        text-gray-600 dark:text-white/70
        hover:bg-gray-200 dark:hover:bg-white/[0.08]
        hover:text-gray-900 dark:hover:text-white
        transition-all duration-200
      "
   >
  <Link size={11} className="opacity-50 shrink-0" />
    <span className="truncate max-w-[140px]">
      {typeof children === "string"
        ? children.replace(/^\(|\)$/g, "")
        : children}
    </span>
  </a>
  );
},

        code({ inline, children }) {
          if (inline) {
            return (
              <code className="bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-sm text-blue-600 dark:text-blue-300">
                {children}
              </code>
            );
          }
          return <CodeBlock>{children}</CodeBlock>;
        },

        table: ({ children }) => <TableWrapper>{children}</TableWrapper>,

        thead: ({ children }) => (
          <thead className="border-b border-white/[0.06]">{children}</thead>
        ),

        tbody: ({ children }) => (
          <tbody className="divide-y divide-white/[0.035]">{children}</tbody>
        ),

        tr: ({ children }) => (
          <tr className="transition-colors duration-150 hover:bg-white/[0.025]">
            {children}
          </tr>
        ),

        th: ({ children }) => (
          <th className="px-5 py-3.5 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-gray-500 dark:text-white/30 whitespace-nowrap first:pl-6 last:pr-6">
            {children}
          </th>
        ),

        td: ({ children, index }) => (
          <td
            className={`px-5 py-4 align-top leading-relaxed first:pl-6 last:pr-6 ${
              index === 0
                ? "text-gray-800 dark:text-white/90 font-medium whitespace-nowrap"
                : "text-gray-600 dark:text-white/50"
            }`}
          >
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}