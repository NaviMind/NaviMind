"use client";

import { useContext, useState, useEffect, useRef } from "react";
import { UIContext } from "@/context/UIContext";
import { Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Регулируешь ширину сообщений здесь:
const USER_MESSAGE_WIDTH = "max-w-[70%]";
const ASSISTANT_MESSAGE_WIDTH = "w-fit max-w-full";

// Кнопка копирования с тултипом (позицию задаём через props)
function CopyButton({ copied, onCopy, className = "" }) {
  // Показываем тултип только на десктопе и когда не скопировано
  return (
    <div className={`flex mt-2 relative group w-fit ${className}`}>
      <button
        onClick={onCopy}
        className="text-gray-400 hover:text-white transition text-sm"
        aria-label={copied ? "Copied" : "Copy"}
        tabIndex={0}
        type="button"
      >
        {copied ? (
          <Check size={16} strokeWidth={2} className="text-green-400" />
        ) : (
          <Copy size={16} strokeWidth={2} />
        )}
      </button>
      {/* Tooltip: hidden на мобилке */}
      {!copied && (
        <div className="hidden sm:block absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 text-white text-xs px-3 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Copy
        </div>
      )}
    </div>
  );
}

// Компонент сообщения пользователя — кнопка копии справа
function UserMessage({ content, copied, onCopy }) {
  return (
    <div className="w-full flex justify-end mt-6">
      <div
        className={`
          p-3 rounded-xl
          text-[17px] sm:text-base font-normal
          leading-relaxed whitespace-pre-wrap shadow-md break-words
          ${USER_MESSAGE_WIDTH}
          bg-gray-700/40 backdrop-blur-md border border-white/5 text-white shadow-lg

        `}
      >
        {content}
        <CopyButton copied={copied} onCopy={onCopy} className="justify-end ml-auto" />
      </div>
    </div>
  );
}

function splitHighlight(text) {
  if (!text) return { main: text, highlight: null };

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { main: text, highlight: null };

  const lastLine = lines[lines.length - 1];

  const highlightTriggers = [
    /^if you want/i,
    /^in practice/i,
    /^a common mistake/i,
    /^focus first/i,
    /^what matters most/i,
  ];

  const isHighlight = highlightTriggers.some(r => r.test(lastLine));

  if (!isHighlight) {
    return { main: text, highlight: null };
  }

  return {
    main: lines.slice(0, -1).join("\n\n"),
    highlight: lastLine,
  };
}

// Компонент сообщения AI — кнопка копии слева
function AssistantMessage({ content, displayText, copied, onCopy }) {
  const text = String(displayText ?? content ?? "");

  // индикатор ожидания (placeholder)
  const isSyncing =
    text.trim() === "NaviMind syncing…" ||
    text.trim() === "NaviMind syncing..." ||
    text.toLowerCase().includes("syncing");

  if (isSyncing) {
    return (
      <div className="w-full flex justify-start mt-6">
        <div className="text-sm text-gray-400 flex items-center gap-2 select-none">
          <span className="inline-block h-2 w-2 rounded-full bg-gray-400 animate-pulse" />
          <span>NaviMind syncing…</span>
        </div>
      </div>
    );
  }

    const { main, highlight } = splitHighlight(text);

  return (
    <div className="w-full flex justify-start mt-6">
      <div className="max-w-full space-y-4">
        {/* Основной текст */}
        <div className="text-[17px] sm:text-base font-normal leading-relaxed break-words text-gray-200">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,

              h2: ({ children }) => (
                <h2 className="mt-6 mb-3 text-[18px] sm:text-lg font-semibold text-white">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mt-5 mb-2 text-[17px] sm:text-base font-semibold text-white/90">
                  {children}
                </h3>
              ),

              ul: ({ children }) => <ul className="mb-4 pl-5 list-disc">{children}</ul>,
              ol: ({ children }) => <ol className="mb-4 pl-5 list-decimal">{children}</ol>,
              li: ({ children }) => <li className="mb-2">{children}</li>,

              hr: () => <div className="my-6 h-px w-full bg-white/10" />,

              strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
            }}
          >
            {main}
          </ReactMarkdown>
        </div>

        {/* Highlight bubble (premium) */}
        {highlight && (
          <div className="relative bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-blue-400 select-none">💡</div>
              <div className="text-[15px] sm:text-base leading-relaxed text-gray-100">
                {highlight}
              </div>
            </div>
          </div>
        )}

        <CopyButton copied={copied} onCopy={onCopy} className="justify-start" />
      </div>
    </div>
  );
  }
  
export default function ChatMessage({ message }) {
  const { role, content } = message;
  const { language } = useContext(UIContext);

  const isUser = role === "user";
  const isAssistant = role === "assistant";

  const [copied, setCopied] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // UI typing (только локально, Firestore не трогаем)
  const [typedText, setTypedText] = useState("");
  const typingTimerRef = useRef(null);
  const hasTypedOnceRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Для определения момента: было "syncing…" -> стало реальным текстом
const prevContentRef = useRef(String(content || ""));

useEffect(() => {
  if (!isClient) return;
  if (role !== "assistant") return;

  const current = String(content || "");
  const prev = String(prevContentRef.current || "");

  const isSyncing = (t) => {
    const s = String(t || "");
    return (
      s.trim() === "NaviMind syncing…" ||
      s.trim() === "NaviMind syncing..." ||
      s.toLowerCase().includes("syncing")
    );
  };

  const prevWasSyncing = isSyncing(prev);
  const nowIsSyncing = isSyncing(current);

  // Если мы всё ещё ждём — ничего не печатаем, просто держим typedText синхронно
  if (nowIsSyncing) {
    setTypedText(current);
    prevContentRef.current = current;
    return;
  }

  // Ключевая логика:
  // Печатать начинаем ТОЛЬКО когда было "syncing…" и внезапно пришёл финальный текст
  if (prevWasSyncing && current) {
    // сброс и старт "печатания"
    hasTypedOnceRef.current = false;
    setTypedText("");

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    typingTimerRef.current = setInterval(() => {
      setTypedText((prevTyped) => {
        const nextLen = Math.min(prevTyped.length + 2, current.length);
        const next = current.slice(0, nextLen);

        if (nextLen >= current.length) {
          hasTypedOnceRef.current = true;
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
          return current;
        }

        return next;
      });
    }, 16);
  } else {
    // Обычный кейс: просто показываем как есть (история/перерендеры)
    setTypedText(current);
  }

  prevContentRef.current = current;
}, [content, role, isClient]);

  const handleCopy = () => {
    if (typeof window === "undefined") return;

    if (typeof content === "string" && navigator?.clipboard?.writeText) {
  navigator.clipboard.writeText(content)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => fallbackCopy(content));
    } else {
      fallbackCopy(content);
    }
  };

  function fallbackCopy(text) {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Copy не поддерживается этим браузером.");
    }
  }

  // Не рендерим ничего, пока не клиент (SSR-safe)
  if (!isClient) return null;

  if (isUser) {
    return (
      <UserMessage content={content} copied={copied} onCopy={handleCopy} />
    );
  }
  if (isAssistant) {
    return (
  <AssistantMessage
    content={content}
    displayText={typedText}
    copied={copied}
    onCopy={handleCopy}
  />
);
  }
  return null;
}
