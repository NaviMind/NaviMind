
import { useState, useEffect } from "react";

export default function useTypewriter(text, speed = 40, restartKey = null) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    let stepTimer;
    let startTimer;

    setDisplayed("");

    const tick = () => {
      setDisplayed(text.slice(0, i + 1)); // гарантирует 1-ю букву
      i += 1;
      if (i < text.length) {
        stepTimer = setTimeout(tick, speed);
      }
    };

    // можно задать стартовую паузу, если нужно: 0 мс — мгновенно
    startTimer = setTimeout(tick, 0);

    return () => {
      clearTimeout(stepTimer);
      clearTimeout(startTimer);
    };
    // важно: учитываем speed и restartKey
  }, [text, speed, restartKey]);

  return displayed;
}
