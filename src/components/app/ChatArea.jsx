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
  const switchingRef = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

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

  const lastMessage = hasMessages ? messages[messages.length - 1] : null;
  const isAssistantTyping = lastMessage?.role === "assistant" && lastMessage?.isStreaming === true;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Мгновенный переход вниз без анимации (при открытии/переключении чата)
  const jumpToBottom = () => {
    const el = mainRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // useLayoutEffect ставит позицию ДО отрисовки кадра, поэтому при смене чата
  // нет видимого рывка: контент сразу появляется внизу, а не прыгает туда.
  useLayoutEffect(() => {
    if (!hasMessages) return;

    const isChatSwitch = prevChatIdRef.current !== activeChatId;

    if (isChatSwitch) {
      // Сменили чат → держим низ мгновенно. Контент (markdown/картинки/код)
      // дорисовывается асинхронно и наращивает высоту уже после первого прыжка,
      // поэтому пиним низ каждый кадр ~600мс — без видимой анимации.
      prevChatIdRef.current = activeChatId;
      switchingRef.current = true;
      jumpToBottom();

      let raf;
      const start = performance.now();
      const loop = () => {
        jumpToBottom();
        if (performance.now() - start < 600) raf = requestAnimationFrame(loop);
        else switchingRef.current = false;
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }

    if (switchingRef.current) {
      // Тот же (только что открытый) чат догружает сообщения → остаёмся внизу.
      jumpToBottom();
      return;
    }

    // Новое сообщение в текущем чате → плавный скролл вниз.
    setTimeout(scrollToBottom, 50);
  }, [messages, activeChatId, showOptimistic]);

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
