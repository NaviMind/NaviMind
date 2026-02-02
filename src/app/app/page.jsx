"use client";

import { useContext, useEffect, useState } from "react";
import { UIContext } from "@/context/UIContext";
import { ChatContext } from "@/context/ChatContext";
import ChatArea from "@/components/app/ChatArea";
import { quickChecks } from "@/data/quickChecks";
import QuickCheckCard from "@/components/app/QuickCheckCard";
import { AnimatePresence, motion } from "framer-motion";
import InstallPrompt from "@/components/common/InstallPrompt";

export default function HomePage() {
  const { messages } = useContext(ChatContext);

  const [index, setIndex] = useState(null);

  // Получить случайный индекс
  const pickRandomIndex = () => {
    const len = quickChecks?.length || 0;
    if (!len) return null;
    return Math.floor(Math.random() * len);
  };

  // 1) Первый случайный вопрос после монтирования
  useEffect(() => {
    const rnd = pickRandomIndex();
    if (rnd !== null) setIndex(rnd);
  }, []);

  // 2) Авто-обновление — всегда работает (каждые 15 сек, случайный)
  useEffect(() => {
    if (!quickChecks || quickChecks.length === 0) return;
    const id = setInterval(() => {
      const rnd = pickRandomIndex();
      if (rnd !== null) setIndex(rnd);
    }, 15000);
    return () => clearInterval(id);
  }, []);

  // 3) Глобалка для NewChatButton — тоже случайный выбор
  useEffect(() => {
    // снести возможную старую версию после HMR
    if (typeof window !== "undefined" && window.nextPrompt) delete window.nextPrompt;

    if (typeof window !== "undefined") {
      window.nextPrompt = () => {
        const rnd = pickRandomIndex();
        if (rnd !== null) setIndex(rnd);
      };
    }
    return () => {
      if (typeof window !== "undefined" && window.nextPrompt) delete window.nextPrompt;
    };
  }, []);

  const current =
    index !== null && quickChecks.length > 0 ? quickChecks[index] : null;

  return (
    <>
      {/* Карточка показывается, как и раньше, пока нет сообщений */}
     {messages.length === 0 && current && (
  <div className="flex flex-col items-center justify-center mt-6 px-4 animate-fade-in">
    <div className="w-full max-w-xl flex flex-col items-center space-y-6">
      {/* Баннер установки PWA */}
      <InstallPrompt />

      {/* Quick Check */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.text}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
        >
          <QuickCheckCard
            question={current}
            onNext={() => {
              const rnd = pickRandomIndex();
              if (rnd !== null) setIndex(rnd);
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  </div>
)}

      <ChatArea messages={messages} />
    </>
  );
}
