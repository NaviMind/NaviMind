self.addEventListener("install", (event) => {
  console.log("🧩 [SW] Service Worker installed");
  self.skipWaiting(); // сразу активируем
});

self.addEventListener("activate", (event) => {
  console.log("✅ [SW] Service Worker activated");
  return self.clients.claim(); // берём под контроль все вкладки
});

// базовый оффлайн-обработчик (по желанию, для теста)
self.addEventListener("fetch", (event) => {
  // можно логировать запросы, просто для проверки
  // console.log("Fetching:", event.request.url);
});
