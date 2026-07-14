/* NaviMind — Firebase Cloud Messaging service worker.
 *
 * Shows an OS-level "Answer ready" notification when the app is backgrounded or
 * fully closed on this device, and opens the right chat when the user taps it.
 *
 * A service worker can't read env vars, so it fetches the (public) web config
 * from our own origin and initialises Firebase with it. If messaging isn't
 * configured (no VAPID key registered), no push is ever sent, so this stays
 * dormant and harmless.
 */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

async function initMessaging() {
  try {
    const res = await fetch("/api/fcm-config");
    if (!res.ok) return;
    const cfg = await res.json();
    if (!cfg || !cfg.apiKey || !cfg.messagingSenderId) return;

    firebase.initializeApp(cfg);
    const messaging = firebase.messaging();

    // Data-only messages land here whenever the page isn't focused. We render
    // the notification ourselves so we control the title/body/click target.
    messaging.onBackgroundMessage((payload) => {
      const d = (payload && payload.data) || {};
      const title = d.title || "NaviMind";
      self.registration.showNotification(title, {
        body: d.body || "",
        icon: "/compass.png",
        badge: "/compass.png",
        tag: d.chatId || "navimind-answer",
        data: { chatId: d.chatId || "", projId: d.projId || "global" },
      });
    });
  } catch {
    /* messaging not configured / offline — stay dormant */
  }
}
initMessaging();

// Tapping the notification focuses an open NaviMind tab (and tells it which chat
// to open) or launches the app deep-linked to that chat.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const chatId = d.chatId || "";
  const projId = d.projId || "global";
  const deepLink = `/app${chatId ? `?chat=${encodeURIComponent(chatId)}&proj=${encodeURIComponent(projId)}` : ""}`;

  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientsArr) {
        if (client.url.includes("/app")) {
          await client.focus();
          client.postMessage({ type: "navimind-open-chat", chatId, projId });
          return;
        }
      }
      await self.clients.openWindow(deepLink);
    })()
  );
});
