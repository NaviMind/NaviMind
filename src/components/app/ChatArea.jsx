"use client";

import { useRef, useState, useEffect, useLayoutEffect, useContext } from "react";
import { ChatContext } from "@/context/ChatContext";
import ChatMessage from "@/components/app/ChatMessage";
import Icon from "@/components/common/Icon";

export default function ChatArea({ messages, children }) {
  const { activeChatId, streamingMessages, pendingSend, generatingChatId } = useContext(ChatContext);
  const messagesEndRef = useRef(null);
  const mainRef = useRef(null);
  const prevChatIdRef = useRef(null);
  const prevLastUserIdRef = useRef(null);
  const lastUserRef = useRef(null);     // DOM node of the most recent user message
  const switchingRef = useRef(false);   // keep scrolling instant while a switched chat loads
  const [scrolledUp, setScrolledUp] = useState(false);

  const baseMessages = Array.isArray(messages) ? messages : [];

  // Optimistic outgoing message: show the user's text + file previews and a
  // "thinking" bubble instantly while attachments upload, unless the real
  // message has already been persisted (then Firestore drives it).
  const showOptimistic =
    pendingSend &&
    pendingSend.chatId === activeChatId &&
    !baseMessages.some((m) => m.role === "user" && m.content === pendingSend.message);

  const displayMessages = showOptimistic
    ? [
        ...baseMessages,
        { id: "__pending_user__", role: "user", content: pendingSend.message, attachments: pendingSend.attachments || [] },
        { id: "__pending_ai__", role: "assistant", content: "NaviMind syncing…" },
      ]
    : baseMessages;

  const hasMessages = displayMessages.length > 0;

  // Index + id of the most recent user message (used to anchor on send).
  let lastUserIndex = -1;
  for (let i = displayMessages.length - 1; i >= 0; i--) {
    if (displayMessages[i].role === "user") { lastUserIndex = i; break; }
  }
  const lastUserId = lastUserIndex >= 0 ? (displayMessages[lastUserIndex].id ?? lastUserIndex) : null;

  const isGenerating =
    generatingChatId != null &&
    (generatingChatId === activeChatId || generatingChatId === true);

  const jumpToBottom = () => {
    const el = mainRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  // Bring the latest question to the top of the viewport so the answer reads
  // from the top — the user scrolls down themselves, no auto-follow.
  const scrollQuestionToTop = () => {
    const el = lastUserRef.current;
    const c = mainRef.current;
    if (!el || !c) return;
    requestAnimationFrame(() => {
      const top = c.scrollTop + (el.getBoundingClientRect().top - c.getBoundingClientRect().top) - 12;
      c.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  };

  // Position on chat switch / new message. Runs before paint to avoid a visible
  // jump.
  useLayoutEffect(() => {
    if (!hasMessages) return;

    const switched = prevChatIdRef.current !== activeChatId;
    if (switched) {
      prevChatIdRef.current = activeChatId;
      prevLastUserIdRef.current = lastUserId; // don't treat the load as a new send
      jumpToBottom();
      // Keep it pinned to the bottom (instantly) while the rest of the messages
      // stream in from Firestore right after the switch.
      switchingRef.current = true;
      const t = setTimeout(() => { switchingRef.current = false; }, 400);
      return () => clearTimeout(t);
    }

    if (switchingRef.current) {
      jumpToBottom();
      return;
    }

    // Same chat: a brand-new question → anchor it to the top.
    if (lastUserId && lastUserId !== prevLastUserIdRef.current) {
      prevLastUserIdRef.current = lastUserId;
      scrollQuestionToTop();
    }
    // Any other update (e.g. the assistant streaming) → do nothing.
  }, [messages, activeChatId, showOptimistic, lastUserId, hasMessages]);

  // Sticky bottom ONLY when the user is already at the very bottom — so a live
  // answer keeps in view if they scrolled down, but we never yank them down
  // while they read from the top.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 80) el.scrollTop = el.scrollHeight;
  }, [streamingMessages]);

  // Track whether the user has scrolled away from the bottom (for the
  // scroll-down button / "responding" indicator).
  useEffect(() => {
    const ref = mainRef.current;
    if (!ref) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = ref;
      setScrolledUp(scrollHeight - scrollTop - clientHeight > 200);
    };
    ref.addEventListener("scroll", handleScroll);
    return () => ref.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      <main
        ref={mainRef}
        className={`
          w-full flex flex-col items-center
          ${hasMessages
            ? "flex-1 pt-2 px-4 pb-14 overflow-y-auto custom-scroll"
            : "px-4 overflow-hidden"}
        `}
      >
        {hasMessages ? (
          <div className="w-full max-w-4xl flex flex-col gap-2">
            {displayMessages.map((msg, idx) => (
              <div key={msg.id ?? idx} ref={idx === lastUserIndex ? lastUserRef : null}>
                <ChatMessage message={msg} isLast={idx === displayMessages.length - 1} />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          children
        )}
      </main>

      {/* Bottom-center control: "responding" while generating + scrolled up,
          else a plain scroll-to-bottom button. */}
      {scrolledUp && (
        <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 z-40">
          {isGenerating ? (
            <button
              onClick={scrollToBottom}
              className="flex items-center gap-2 pl-2.5 pr-3.5 py-1.5 rounded-full bg-blue-600 text-white text-xs font-medium shadow-lg hover:bg-blue-500 transition"
            >
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              NaviMind is responding…
            </button>
          ) : (
            <button
              onClick={scrollToBottom}
              className="p-2 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 transition rounded-full backdrop-blur shadow-sm"
            >
              <Icon name="scroll-bottom" size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
