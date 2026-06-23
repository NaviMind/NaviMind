"use client";

import { useEffect, useRef, useState } from "react";
import { auth } from "@/firebase/config";
import {
  subscribeToMessages,
  subscribeToTopicMessages,
  subscribeToTopicChats,
} from "@/firebase/chatStore";

const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const makeTitle = (txt) => {
  const words = txt.trim().split(/\s+/).slice(0, 5).join(" ");
  return words.length > 30 ? words.slice(0, 30) + "…" : words;
};

// One independent chat "workspace": the per-pane state (active chat/topic, its
// messages, streaming overlay, optimistic send, generation control) plus the
// subscriptions and actions scoped to it. Shared sidebar data
// (projectChatSessions) is passed in so multiple workspaces can run side by side
// (split screen) over the same chat lists.
export function useChatWorkspace({ projectChatSessions, setProjectChatSessions }) {
  const [activeProject, setActiveProject] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Optimistic outgoing message (shown instantly while attachments upload).
  const [pendingSend, setPendingSend] = useState(null);

  // Live-streaming overlay: assistant messageId → text streamed so far.
  const [streamingMessages, setStreamingMessages] = useState({});
  const setStreamingMessage = (id, text) =>
    setStreamingMessages((prev) => (prev[id] === text ? prev : { ...prev, [id]: text }));
  const clearStreamingMessage = (id) =>
    setStreamingMessages((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });

  // Generation control (Stop button + abort).
  const generationAbortRef = useRef(null);
  const [generatingChatId, setGeneratingChatId] = useState(null);
  const beginGeneration = (controller, chatId) => {
    generationAbortRef.current = controller;
    setGeneratingChatId(chatId ?? true);
  };
  const endGeneration = () => {
    generationAbortRef.current = null;
    setGeneratingChatId(null);
  };
  const stopGeneration = () => {
    try { generationAbortRef.current?.abort(); } catch { /* noop */ }
  };

  // Real-time chats of the active topic.
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !activeProject || activeProject === "global") return;

    const unsubscribe = subscribeToTopicChats(uid, activeProject, (chats) => {
      setProjectChatSessions((prev) => ({ ...prev, [activeProject]: chats }));
    });

    return () => unsubscribe();
  }, [activeProject]); // eslint-disable-line react-hooks/exhaustive-deps

  // Messages of the active chat (topic-aware).
  useEffect(() => {
    if (!activeChatId || !auth.currentUser) {
      setIsLoadingMessages(false);
      return;
    }

    setMessages([]);
    setIsLoadingMessages(true);

    const uid = auth.currentUser.uid;
    const topicId = activeProject && activeProject !== "global" ? activeProject : null;

    const onMessages = (msgs) => {
      setMessages(msgs);
      setIsLoadingMessages(false);
    };

    const unsubscribe = topicId
      ? subscribeToTopicMessages(uid, topicId, activeChatId, onMessages)
      : subscribeToMessages(uid, activeChatId, onMessages);

    return () => unsubscribe();
  }, [activeChatId, activeProject]);

  const createNewChat = (projId = "global") => {
    const newChat = {
      chatId: genId(),
      createdAt: Date.now(),
      title: "Untitled Chat",
      messages: [],
    };
    setProjectChatSessions((prev) => {
      const list = prev[projId] ? [...prev[projId]] : [];
      return { ...prev, [projId]: [newChat, ...list] };
    });
    setActiveProject(projId);
    setActiveChatId(newChat.chatId);
  };

  const sendMessage = (content, projId = activeProject || "global") => {
    let targetChatId = activeChatId;

    setProjectChatSessions((prev) => {
      const next = { ...prev };
      if (!next[projId]) next[projId] = [];

      const chats = [...next[projId]];
      let idx = chats.findIndex((c) => c.chatId === activeChatId);

      if (idx === -1) {
        const newChat = {
          chatId: genId(),
          createdAt: Date.now(),
          title: makeTitle(content),
          messages: [{ role: "user", content }],
        };
        chats.unshift(newChat);
        idx = 0;
        targetChatId = newChat.chatId;
      } else {
        const chat = { ...chats[idx] };
        chat.messages = [...chat.messages, { role: "user", content }];
        if (!chat.title) chat.title = makeTitle(content);
        chats[idx] = chat;
        targetChatId = chat.chatId;
      }

      next[projId] = chats;
      return next;
    });

    setActiveProject(projId);
    setActiveChatId(targetChatId);
  };

  const deleteChat = (chatId) => {
    setProjectChatSessions((prev) => {
      const next = {};
      Object.entries(prev).forEach(([projKey, chats]) => {
        next[projKey] = chats.filter((c) => c.chatId !== chatId);
      });
      return next;
    });
    if (activeChatId === chatId) setActiveChatId(null);
  };

  const openChatSession = (chatId, projId) => {
    setActiveProject(projId);
    setActiveChatId(chatId);
  };

  const getActiveChatSession = () => {
    if (!activeProject || !activeChatId) return null;
    const list = projectChatSessions?.[activeProject] || [];
    return list.find((c) => c.chatId === activeChatId) || null;
  };

  return {
    activeProject,
    setActiveProject,
    activeChatId,
    setActiveChatId,
    messages,
    setMessages,
    isLoadingMessages,
    setIsLoadingMessages,
    pendingSend,
    setPendingSend,
    streamingMessages,
    setStreamingMessage,
    clearStreamingMessage,
    generatingChatId,
    beginGeneration,
    endGeneration,
    stopGeneration,
    createNewChat,
    sendMessage,
    deleteChat,
    openChatSession,
    getActiveChatSession,
  };
}
