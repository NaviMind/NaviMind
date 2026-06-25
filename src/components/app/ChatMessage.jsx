"use client";

import { useContext, useState, useEffect } from "react";
import { UIContext } from "@/context/UIContext";
import { ChatContext } from "@/context/ChatContext";
import { Check, Copy, Share2 } from "lucide-react";
import MessageAttachments, { getViewerSrc, getFileUrl, DocViewerModal } from "./MessageAttachments";
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
        className="peer text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
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
        className="peer text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
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
  const hasText = String(content ?? "").trim().length > 0;
  return (
    <div className="w-full flex flex-col items-end mt-6 gap-1">
      {/* Attachment row — independently sized */}
      {attachments?.length > 0 && (
        <div className={USER_MESSAGE_WIDTH}>
          <MessageAttachments attachments={attachments} />
        </div>
      )}

      {/* Text bubble — only when there's actually text (file-only sends show
          just the attachment, no empty bubble) */}
      {hasText && (
        <div className={`group flex flex-col items-end ${USER_MESSAGE_WIDTH}`}>
          <div
            className={`
              p-3 rounded-xl
              text-[17px] sm:text-base font-normal
              leading-relaxed whitespace-pre-wrap shadow-md break-words
              w-fit max-w-full
              bg-gray-100 dark:bg-gray-700/40 backdrop-blur-md border border-gray-200 dark:border-white/5 text-gray-900 dark:text-white
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
      )}
    </div>
  );
}

// Extract a trailing ```followups ... ``` block into clickable suggestions.
// Returns the body without the block plus the parsed option strings.
function splitFollowups(text) {
  if (!text) return { body: text, followups: [] };
  // Tolerant: accept followups / follow-ups / suggestions / next steps, optional
  // closing fence (model may omit it at the very end).
  const re = /```(?:followups|follow-ups|suggestions|next[-\s]?steps)\b[ \t]*\n?([\s\S]*?)(?:```|$)/i;
  const m = text.match(re);
  if (!m) return { body: text, followups: [] };
  const followups = m[1]
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((l) => l && l !== "`" && !l.startsWith("```"))
    .slice(0, 4);
  const body = text.replace(m[0], "").trim();
  return { body, followups };
}

function FollowupChips({ options, onPick }) {
  if (!options?.length) return null;
  return (
    <div className="flex flex-col items-start gap-2 pt-2">
      {options.map((opt, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(opt)}
          className="
            group flex items-center gap-2 text-left max-w-full
            px-4 py-2 rounded-2xl
            text-sm leading-snug whitespace-normal
            border border-gray-200 dark:border-white/10
            bg-white dark:bg-white/5
            text-gray-700 dark:text-gray-200
            hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-300
            hover:bg-blue-50 dark:hover:bg-blue-500/10
            transition-colors
          "
        >
          <span className="text-blue-500 dark:text-blue-400 shrink-0 select-none">+</span>
          <span className="break-words">{opt}</span>
        </button>
      ))}
    </div>
  );
}

// Convert inline "[[cite:filename]]" markers into markdown links the renderer
// turns into source pills. Returns the rewritten text + the ordered list of
// cited files (resolved to metadata). Unresolved markers are dropped so raw
// "[[cite:...]]" never leaks into the visible answer. Pills only add value when
// the answer draws on MORE THAN ONE file — with a single source they're just
// noise, so we strip them.
function buildCitations(text, fileSources) {
  const list = Array.isArray(fileSources) ? fileSources : [];
  if (!text) return { text: "", citations: [] };

  const resolve = (n) => {
    // Extracted text is indexed as "name.ext.txt"; normalise back to the
    // original filename so the citation resolves to the openable file.
    const low = n.toLowerCase().replace(/(\.[a-z0-9]+)\.txt$/i, "$1");
    return (
      list.find((d) => d.name?.toLowerCase() === low) ||
      list.find(
        (d) =>
          d.name?.toLowerCase().endsWith(low) || low.endsWith(d.name?.toLowerCase())
      )
    );
  };

  const CITE_RE = /\[\[\s*cite:\s*([^\]]+?)\s*\]\]/gi;

  // Count how many DISTINCT files are actually cited. With 0–1, drop all markers
  // (a single obvious source needs no pills).
  const distinct = new Set();
  let m;
  while ((m = CITE_RE.exec(text)) !== null) {
    const meta = resolve(m[1].trim());
    if (meta?.url) distinct.add(meta.url);
  }
  if (distinct.size < 2) {
    return { text: text.replace(CITE_RE, ""), citations: [] };
  }

  const citations = [];
  const indexByUrl = new Map();
  // Only surface a pill when the source CHANGES from the previous one — avoids a
  // pill after every single line when consecutive claims share a source.
  let lastUrl = null;
  const out = text.replace(CITE_RE, (_full, name) => {
    const meta = resolve(name.trim());
    if (!meta) return "";
    if (meta.url === lastUrl) return ""; // same source as previous → skip
    lastUrl = meta.url;
    let idx = indexByUrl.get(meta.url);
    if (idx === undefined) {
      idx = citations.length;
      citations.push(meta);
      indexByUrl.set(meta.url, idx);
    }
    return `[${idx}](#navimind-cite-${idx})`;
  });

  return { text: out, citations };
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

// Assistant message — Copy + Share appear only after the answer is complete
function AssistantMessage({ content, copied, onCopy, onShare, showActions, followups = [], onFollowup, showFollowups, citations = [], onCite, isWaiting = false }) {
  const text = String(content ?? "");

  const isSyncing =
    text.trim() === "NaviMind syncing…" ||
    text.trim() === "NaviMind syncing..." ||
    text.toLowerCase().includes("syncing");

  // Waiting for the first streamed token, or still on the placeholder.
  if (isWaiting || isSyncing) {
    return (
      <div className="w-full flex justify-start mt-6">
        <div className="flex items-center gap-3 select-none">
          <img src="/compass.png" alt="NaviMind analyzing" className="w-10 h-10 compass-sway flex-shrink-0" />
          <span className="text-[14px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
            Preparing an answer
            <span className="flex items-end gap-[3px] ml-0.5 pb-[1px]">
              <span className="inline-block w-[4px] h-[4px] rounded-full bg-gray-400 dark:bg-gray-500 dot-1" />
              <span className="inline-block w-[4px] h-[4px] rounded-full bg-gray-400 dark:bg-gray-500 dot-2" />
              <span className="inline-block w-[4px] h-[4px] rounded-full bg-gray-400 dark:bg-gray-500 dot-3" />
            </span>
          </span>
        </div>
      </div>
    );
  }

  const { main, highlight } = splitHighlight(text);

  return (
    <div className="w-full flex justify-start mt-6">
      <div className="max-w-full space-y-4">
        <div className="max-w-[72ch]" />
        <div className="text-[17px] sm:text-base font-normal leading-relaxed break-words text-gray-800 dark:text-gray-200">
          <MarkdownRenderer content={main} citations={citations} onCite={onCite} />
        </div>

        {highlight && (
          <div className="relative bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-blue-400 select-none">💡</div>
              <div className="text-[15px] sm:text-base leading-relaxed text-gray-700 dark:text-gray-100">{highlight}</div>
            </div>
          </div>
        )}

        {/* Copy + Share — only after typing finishes */}
        {showActions && (
          <div className="flex items-center gap-4 pt-1">
            <CopyButton copied={copied} onCopy={onCopy} />
            <ShareButton onShare={onShare} />
          </div>
        )}

        {/* Follow-up suggestions — only under the last message, after typing */}
        {showFollowups && (
          <FollowupChips options={followups} onPick={onFollowup} />
        )}
      </div>
    </div>
  );
}

export default function ChatMessage({ message, isLast = false }) {
  const { role, content, attachments = [], sources = [], fileSources = [] } = message;
  const { setPendingPrompt } = useContext(UIContext);
  const { streamingMessages } = useContext(ChatContext);

  const isUser = role === "user";
  const isAssistant = role === "assistant";

  // While this assistant message is streaming, render the live overlay text
  // (tokens as they arrive) instead of the persisted Firestore content.
  const liveText = isAssistant ? streamingMessages?.[message.id] : undefined;
  const isStreaming = liveText !== undefined;
  const sourceText = isStreaming ? String(liveText || "") : String(content || "");

  // Pull follow-up suggestions out of the assistant text so the ```followups```
  // block is rendered as clickable chips, not as raw text / a code block.
  const { body, followups } = isAssistant
    ? splitFollowups(sourceText)
    : { body: sourceText, followups: [] };

  // "Done" = not actively streaming. Actions / follow-ups appear once complete.
  const done = isAssistant && !isStreaming;
  const isWaiting = isStreaming && body.trim() === "";

  // Rewrite inline [[cite:...]] markers into source pills; keep a marker-free
  // version for copy / share / highlight.
  const { text: renderBody, citations } = isAssistant
    ? buildCitations(body, fileSources)
    : { text: body, citations: [] };
  const cleanBody = isAssistant
    ? body.replace(/\[\[\s*cite:[^\]]*\]\]/gi, "").trim()
    : body;

  const [copied, setCopied] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);

  useEffect(() => { setIsClient(true); }, []);

  const handleCite = (idx) => {
    const meta = citations[idx];
    if (!meta) return;
    const src = getViewerSrc(meta);
    if (src) setActiveDoc({ src, url: getFileUrl(meta), name: meta.name });
  };

  const handleCopy = () => {
    if (typeof window === "undefined") return;
    // User messages copy as-is; assistant messages strip markdown symbols
    const text = isUser ? String(content || "") : stripMarkdown(cleanBody);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const handleShare = async () => {
    const plainText = stripMarkdown(cleanBody);
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
      <>
        <AssistantMessage
          content={renderBody}
          copied={copied}
          onCopy={handleCopy}
          onShare={handleShare}
          showActions={done}
          followups={followups}
          onFollowup={(text) => setPendingPrompt(text)}
          showFollowups={isLast && done && followups.length > 0}
          citations={citations}
          onCite={handleCite}
          isWaiting={isWaiting}
        />
        <DocViewerModal doc={activeDoc} onClose={() => setActiveDoc(null)} />
      </>
    );
  }

  return null;
}
