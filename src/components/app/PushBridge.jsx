"use client";

// Glue between push notifications and the (state-based) chat navigation:
//   • When the app opens deep-linked from a notification tap (/app?chat=…&proj=…),
//     open that chat and clean the URL.
//   • When a NaviMind tab is focused by the service worker after a tap, it posts
//     { type: "navimind-open-chat" } — open that chat.
//   • On load, if notification permission is already granted, silently refresh
//     this device's push token so it stays current (no prompt).
//
// Mounted once inside the ChatProvider. Renders nothing.

import { useEffect, useContext } from "react";
import { ChatContext } from "@/context/ChatContext";
import { auth } from "@/firebase/config";
import { refreshPushIfGranted } from "@/lib/push/client";

export default function PushBridge() {
  const { openChatSession } = useContext(ChatContext);

  // Deep-link on first load: /app?chat=<id>&proj=<projId>
  useEffect(() => {
    if (typeof window === "undefined" || !openChatSession) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const chatId = params.get("chat");
      const projId = params.get("proj") || "global";
      if (chatId) {
        openChatSession(chatId, projId);
        // Strip the params so a refresh doesn't re-trigger navigation.
        const clean = window.location.pathname;
        window.history.replaceState({}, "", clean);
      }
    } catch { /* ignore */ }
  }, [openChatSession]);

  // Service-worker → page messages (notification tap on an already-open tab).
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    const onMsg = (event) => {
      const d = event.data || {};
      if (d.type === "navimind-open-chat" && d.chatId && openChatSession) {
        openChatSession(d.chatId, d.projId || "global");
      }
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [openChatSession]);

  // Keep this device's token fresh when permission is already granted.
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) refreshPushIfGranted(uid);
  }, []);

  return null;
}
