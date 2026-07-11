"use client";

import { useRef, useState, useEffect, useLayoutEffect, useContext } from "react";
import { ChatContext } from "@/context/ChatContext";
import ChatMessage from "@/components/app/ChatMessage";
import Icon from "@/components/common/Icon";

export default function ChatArea({ messages, children }) {
  const { activeChatId, streamingMessages, pendingSend } = useContext(ChatContext);
  const messagesEndRef = useRef(null);
  const mainRef = useRef(null);
  const prevChatIdRef = useRef(null);
  const pinTimerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const baseMessages = Array.isArray(messages) ? messages : [];

  // Optimistic outgoing message: show the user's text + file previews and a
  // "thinking" bubble instantly while attachments upload.
  //
  // Hand off to the persisted messages ONLY once the real assistant bubble is
  // actually present (user turn + an assistant turn as the last two messages).
  // The user message and the assistant placeholder often arrive in SEPARATE
  // Firestore snapshots — hiding the optimistic bubble as soon as just the user
  // message lands leaves a one-frame gap with no assistant bubble, so the compass
  // vanishes and then reappears ("starts thinking again"). Waiting for both
  // removes that flicker.
  // The user message and the assistant placeholder often arrive in SEPARATE
  // Firestore snapshots. Track them independently so we can retire each half of
  // the optimistic bubble as soon as its real counterpart lands:
  //   • drop the optimistic USER bubble the moment the real user message lands
  //     (otherwise the real + optimistic user messages BOTH show → duplicate);
  //   • keep the optimistic ASSISTANT compass until the real assistant bubble
  //     lands (otherwise the compass blinks out for a frame).
  const n = baseMessages.length;
  const isForThisSend = pendingSend && pendingSend.chatId === activeChatId;

  const userLanded =
    isForThisSend &&
    ((baseMessages[n - 1]?.role === "user" && baseMessages[n - 1]?.content === pendingSend.message) ||
     (baseMessages[n - 2]?.role === "user" && baseMessages[n - 2]?.content === pendingSend.message));
  const assistantLanded = n >= 1 && baseMessages[n - 1]?.role === "assistant";

  let displayMessages = baseMessages;
  if (isForThisSend && (!userLanded || !assistantLanded)) {
    const extra = [];
    if (!userLanded) {
      extra.push({ id: "__pending_user__", role: "user", content: pendingSend.message, attachments: pendingSend.attachments || [] });
    }
    if (!assistantLanded) {
      extra.push({ id: "__pending_ai__", role: "assistant", content: "NaviMind syncing…" });
    }
    displayMessages = [...baseMessages, ...extra];
  }

  const hasMessages = displayMessages.length > 0;

  const lastMessage = hasMessages ? messages[messages.length - 1] : null;
  const isAssistantTyping = lastMessage?.role === "assistant" && lastMessage?.isStreaming === true;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Мгновенный переход в самый низ (двумя способами — какой сработает).
  const pinBottom = () => {
    const el = mainRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  };

  // Держим низ мгновенно ~800мс: контент (markdown/картинки/код) дорисовывается
  // асинхронно и наращивает высоту уже после первого прыжка. Таймер живёт в ref,
  // поэтому ре-рендеры/смена сообщений его НЕ убивают.
  const startPinning = (durationMs = 800) => {
    if (pinTimerRef.current) clearInterval(pinTimerRef.current);
    pinBottom();
    const start = Date.now();
    pinTimerRef.current = setInterval(() => {
      pinBottom();
      if (Date.now() - start > durationMs) {
        clearInterval(pinTimerRef.current);
        pinTimerRef.current = null;
      }
    }, 50);
  };

  useEffect(() => () => { if (pinTimerRef.current) clearInterval(pinTimerRef.current); }, []);

  // useLayoutEffect ставит позицию ДО отрисовки кадра.
  useLayoutEffect(() => {
    if (!hasMessages) return;

    const isChatSwitch = prevChatIdRef.current !== activeChatId;

    if (isChatSwitch) {
      // Открыли/сменили чат → пиним низ мгновенно, пока контент досчитается.
      prevChatIdRef.current = activeChatId;
      startPinning(800);
      return;
    }

    if (pinTimerRef.current) {
      // Тот же только что открытый чат догружает сообщения → остаёмся внизу.
      pinBottom();
      return;
    }

    // Новое сообщение в текущем чате → плавный скролл вниз.
    setTimeout(scrollToBottom, 50);
  }, [messages, activeChatId, isForThisSend]);

  // Follow the live-streaming answer: keep pinned to the bottom as tokens
  // arrive, but only if the user is already near the bottom (don't yank them
  // back down if they scrolled up to read).
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 300) el.scrollTop = el.scrollHeight;
  }, [streamingMessages]);

  useEffect(() => {
    const ref = mainRef.current;
    if (!ref) return;

    const handleScroll = () => {
  if (isAssistantTyping) return;

  const { scrollTop, scrollHeight, clientHeight } = ref;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
  setShowScrollButton(distanceFromBottom > 200);
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
    <ChatMessage key={msg.id ?? idx} message={msg} isLast={idx === displayMessages.length - 1} />
  ))}
  <div ref={messagesEndRef} />
</div>
        ) : (
          children
        )}
      </main>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          {/* Desktop */}
          <div className="hidden sm:block relative group pointer-events-auto">
            <button
              onClick={scrollToBottom}
              className="p-2 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 transition rounded-full backdrop-blur shadow-sm"
            >
              <Icon name="scroll-bottom" size={20} />
            </button>
            </div>
          {/* Mobile */}
          <div className="block sm:hidden pointer-events-auto">
            <button
              onClick={scrollToBottom}
              className="p-2 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 transition rounded-full backdrop-blur shadow-sm"
            >
              <Icon name="scroll-bottom-mobile" size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
