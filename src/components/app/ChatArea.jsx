"use client";

import { useRef, useState, useEffect } from "react";
import ChatMessage from "@/components/app/ChatMessage";

export default function ChatArea({ messages, children }) {
  const messagesEndRef = useRef(null);
  const mainRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const hasMessages = Array.isArray(messages) && messages.length > 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
  if (hasMessages) {
    setTimeout(scrollToBottom, 50);
  }
}, [messages]);

  useEffect(() => {
    const ref = mainRef.current;
    if (!ref) return;

    const handleScroll = () => {
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
  {messages.map((msg, idx) => (
    <ChatMessage key={idx} message={msg} />
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
              className="p-2 bg-white/10 text-white hover:bg-white/20 transition rounded-full backdrop-blur"
            >
              <img src="/Scroll To Bottom.svg" alt="Scroll to bottom" className="w-5 h-5" />
            </button>
            </div>
          {/* Mobile */}
          <div className="block sm:hidden pointer-events-auto">
            <button
              onClick={scrollToBottom}
              className="p-2 bg-white/10 text-white hover:bg-white/20 transition rounded-full backdrop-blur"
            >
              <img src="/Scroll to Bottom Mobile.svg" alt="Scroll to bottom" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
