"use client";

import { useEffect, useRef } from "react";

export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // ⭐ звезды
    const particles = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.2 + 0.3,
        dx: (Math.random() - 0.5) * 0.2,
        dy: (Math.random() - 0.5) * 0.2,
        alpha: Math.random(),
        da: (Math.random() - 0.5) * 0.015,
      });
    }

    // ☄️ кометы
    const meteors = [];
    let meteorIndex = 0;
    const meteorSequence = [0, 1, 0, 1, 0, 1]; 

    function spawnMeteor(type) {
      let x, y, dx, dy;
      if (type === 0) {
        x = -50;
        y = Math.random() * canvas.height * 0.7;
        dx = 5;
        dy = 1.5;
      } else if (type === 1) {
        x = canvas.width + 50;
        y = Math.random() * canvas.height * 0.7;
        dx = -5;
        dy = 1.5;
      }
      meteors.push({ x, y, dx, dy, type });
    }

    function runMeteorCycle() {
      if (meteorIndex < meteorSequence.length) {
        spawnMeteor(meteorSequence[meteorIndex]);
        meteorIndex++;
        const delay = 15000 + Math.random() * 5000;
        setTimeout(runMeteorCycle, delay);
      } else {
        meteorIndex = 0;
        const delay = 20000 + Math.random() * 10000;
        setTimeout(runMeteorCycle, delay);
      }
    }
    runMeteorCycle();

    // 🎥 функция анимации
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ⭐ рисуем звезды
      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        p.alpha += p.da;

        if (p.alpha <= 0 || p.alpha >= 1) p.da *= -1;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

        ctx.shadowColor = "rgba(255,255,255,0.8)";
        ctx.shadowBlur = 6;

        ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        ctx.fill();

        ctx.shadowBlur = 0;
      });

     // ☄️ рисуем кометы
meteors.forEach((m, i) => {
  m.x += m.dx;
  m.y += m.dy;

  // хвост
  const grad = ctx.createLinearGradient(
    m.x,
    m.y,
    m.x - m.dx * 10,
    m.y - m.dy * 10
  );
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");

  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(m.x, m.y);
  ctx.lineTo(m.x - m.dx * 10, m.y - m.dy * 10);
  ctx.stroke();

  // удаляем комету, если ушла за экран
  if (
    m.x < -100 ||
    m.x > canvas.width + 100 ||
    m.y > canvas.height + 100
  ) {
    meteors.splice(i, 1);
  }
});

      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
  <canvas
    ref={canvasRef}
    className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none"
  />
);
}
