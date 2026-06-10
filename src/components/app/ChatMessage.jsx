"use client";

import { useContext, useState, useEffect, useRef } from "react";
import { UIContext } from "@/context/UIContext";
import { Check, Copy, Link, Share2 } from "lucide-react";
import MessageAttachments from "./MessageAttachments";
import MarkdownRenderer from "@/components/app/chat/MarkdownRenderer";

const USER_MESSAGE_WIDTH = "max-w-[70%]";

function stripMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g, "").trim())
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/\*(.+?)\*/gs, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function CopyButton({ copied, onCopy, className = "" }) {
  return (
    <div className={`flex relative w-fit ${className}`}>
      <button
        onClick={onCopy}
        className="peer text-gray-400 hover:text-white transition"
        aria-label={copied ? "Copied" : "Copy"}
        type="button"
      >
        {copied ? <Check size={18} strokeWidth={2} /> : <Copy size={16} strokeWidth={2} />}
      </button>
      {!copied && (
        <div className="hidden sm:block absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 text-white text-xs px-2 py-1 rounded shadow opacity-0 pointer-events-none peer-hover:opacity-100 transition-opacity whitespace-nowrap">
          Copy
        </div>
      )}
    </div>
  );
}

function ShareButton({ onShare, className = "" }) {
  const [shared, setShared] = useState(false);

  const handleClick = async () => {
    await onShare();
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <div className={`flex relative w-fit ${className}`}>
      <button
        onClick={handleClick}
        className="peer text-gray-400 hover:text-white transition"
        aria-label="Share"
        type="button"
      >
        {shared ? <Check size={18} strokeWidth={2} /> : <Share2 size={16} strokeWidth={2} />}
      </button>
      {!shared && (
        <div className="hidden sm:block absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 text-white text-xs px-2 py-1 rounded shadow opacity-0 pointer-events-none peer-hover:opacity-100 transition-opacity whitespace-nowrap">
          Share
        </div>
      )}
    </div>
  );
}

// User message — Copy button lives BELOW the bubble
function UserMessage({ content, attachments = [], copied, onCopy }) {
  return (
    <div className="w-full flex justify-end mt-6">
      <div className={`flex flex-col items-end gap-1 ${USER_MESSAGE_WIDTH}`}>
        {attachments?.length > 0 && <MessageAttachments attachments={attachments} />}

        {/* group is on the outer wrapper so hover covers bubble + button area */}
        <div className={`group flex flex-col items-end w-full`}>
          <div
            className={`
              p-3 rounded-xl
              text-[17px] sm:text-base font-normal
              leading-relaxed whitespace-pre-wrap shadow-md break-words
              w-full
              bg-gray-700/40 backdrop-blur-md border border-white/5 text-white
            `}
          >
            {content}
          </div>

          {/* Copy below the bubble — always visible on mobile, hover on desktop */}
          <CopyButton
            copied={copied}
            onCopy={onCopy}
            className="mt-1 mr-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150"
          />
        </div>
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
    /^if you want/i, /^in practice/i, /^a common mistake/i,
    /^focus first/i, /^what matters most/i,
  ];
  if (!highlightTriggers.some(r => r.test(lastLine))) return { main: text, highlight: null };
  return { main: lines.slice(0, -1).join("\n\n"), highlight: lastLine };
}

// Assistant message — Copy + Share appear only after typing is done
function AssistantMessage({ content, displayText, copied, onCopy, onShare, showActions, sources = [] }) {
  const text = String(displayText ?? content ?? "");

  const isSyncing =
    text.trim() === "NaviMind syncing…" ||
    text.trim() === "NaviMind syncing..." ||
    text.toLowerCase().includes("syncing");

  if (isSyncing) {
    return (
      <div className="w-full flex justify-start mt-6">
        <div className="flex items-center gap-2 select-none">
          <img src="/compass.png" alt="NaviMind analyzing" className="w-12 h-12 compass-sway" />
        </div>
      </div>
    );
  }

  const { main, highlight } = splitHighlight(text);

  return (
    <div className="w-full flex justify-start mt-6">
      <div className="max-w-full space-y-4">
        <div className="max-w-[72ch]" />
        <div className="text-[17px] sm:text-base font-normal leading-relaxed break-words text-gray-200">
          <MarkdownRenderer content={main} />
        </div>

        {highlight && (
          <div className="relative bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-blue-400 select-none">💡</div>
              <div className="text-[15px] sm:text-base leading-relaxed text-gray-100">{highlight}</div>
            </div>
          </div>
        )}

        {sources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {sources.map((s, i) => {
              let domain = "";
              try { domain = new URL(s.url).hostname.replace("www.", ""); }
              catch { domain = "source"; }
              return (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white transition-all duration-200"
                >
                  <Link size={9} className="opacity-60 shrink-0" />
                  <span className="truncate max-w-[120px]">{domain}</span>
                </a>
              );
            })}
          </div>
        )}

        {/* Copy + Share — only after typing finishes */}
        {showActions && (
          <div className="flex items-center gap-4 pt-1">
            <CopyButton copied={copied} onCopy={onCopy} />
            <ShareButton onShare={onShare} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatMessage({ message }) {
  const { role, content, attachments = [], sources = [] } = message;
  useContext(UIContext);

  const isUser = role === "user";
  const isAssistant = role === "assistant";

  const [copied, setCopied] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [typingDone, setTypingDone] = useState(false);

  const typingTimerRef = useRef(null);
  const prevContentRef = useRef(String(content || ""));

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (!isClient || role !== "assistant") return;

    const current = String(content || "");
    const prev = String(prevContentRef.current || "");

    const checkSyncing = (t) => {
      const s = String(t || "");
      return (
        s.trim() === "NaviMind syncing…" ||
        s.trim() === "NaviMind syncing..." ||
        s.toLowerCase().includes("syncing")
      );
    };

    const prevWasSyncing = checkSyncing(prev);
    const nowIsSyncing = checkSyncing(current);

    if (nowIsSyncing) {
      setTypedText(current);
      setTypingDone(false);
      prevContentRef.current = current;
      return;
    }

    if (prevWasSyncing && current) {
      // New response arrived — start typing animation
      setTypingDone(false);
      setTypedText("");
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);

      let typed = 0;
      typingTimerRef.current = setInterval(() => {
        typed = Math.min(typed + 2, current.length);
        setTypedText(current.slice(0, typed));
        if (typed >= current.length) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
          setTypingDone(true);
        }
      }, 16);
    } else {
      // Historical message — show immediately
      setTypedText(current);
      setTypingDone(true);
    }

    prevContentRef.current = current;
  }, [content, role, isClient]);

  const handleCopy = () => {
    if (typeof window === "undefined") return;
    // User messages copy as-is; assistant messages strip markdown symbols
    const text = isUser ? String(content || "") : stripMarkdown(String(content || ""));
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const handleShare = async () => {
    const plainText = stripMarkdown(String(content || ""));
    if (navigator?.share) {
      try {
        await navigator.share({ title: "NaviMind", text: plainText });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    }
    navigator?.clipboard?.writeText(plainText).catch(() => {});
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
      /* silent */
    }
  }

  if (!isClient) return null;

  if (isUser) {
    return (
      <UserMessage
        content={content}
        attachments={attachments}
        copied={copied}
        onCopy={handleCopy}
      />
    );
  }

  if (isAssistant) {
    return (
      <AssistantMessage
        content={content}
        displayText={typedText}
        copied={copied}
        onCopy={handleCopy}
        onShare={handleShare}
        showActions={typingDone}
        sources={sources}
      />
    );
  }

  return null;
}
