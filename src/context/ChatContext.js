"use client";

import { subscribeToMessages, subscribeToTopicMessages, subscribeToUserChats, subscribeToUserTopics, subscribeToTopicChats, renameTopicInFirestore, getTopicData, getLibraryFiles, deleteLibraryFileRecords } from "@/firebase/chatStore";
import { createContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { db } from "@/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { doc, deleteDoc } from "firebase/firestore";

export const ChatContext = createContext();

/* ───────── helpers ───────── */
const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const makeTitle = (txt) => {
  const words = txt.trim().split(/\s+/).slice(0, 5).join(" ");
  return words.length > 30 ? words.slice(0, 30) + "…" : words;
};

/* ───────── provider ───────── */
export function ChatProvider({ children }) {
  const [projectChatSessions, setProjectChatSessions] = useState({});
  const [customProjects, setCustomProjects] = useState({});
  const [activeProject, setActiveProject] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Optimistic outgoing message: shown instantly (with local file previews and
  // a "thinking" bubble) while attachments upload and the request is in flight,
  // so the chat never looks frozen. Cleared once the real message is persisted.
  // Shape: { chatId, message, attachments: [{ name, type, previewUrl }] }
  const [pendingSend, setPendingSend] = useState(null);

  // Live-streaming overlay: maps an assistant messageId → the text streamed so
  // far. The UI renders this live while tokens arrive; Firestore still gets a
  // single final write. Cleared once the final content is persisted.
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

  // Generation control: lets the UI show a Stop button and abort the in-flight
  // answer. generatingChatId marks which chat is currently generating.
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

  const clearAllChats = () => {
    setProjectChatSessions({});
    setActiveChatId(null);
    setActiveProject(null);
    localStorage.removeItem("chatSessions");
    localStorage.removeItem("customProjects");
  };

 const loadUserTopics = async (userId) => {
  const ref = collection(db, "users", userId, "topics");
  const snap = await getDocs(ref);
  const topics = {};
  const topicChats = {};

  await Promise.all(snap.docs.map(async (docSnap) => {
    const d = docSnap.data();
    topics[docSnap.id] = {
      name: d?.name || d?.title || "Untitled Topic",
      isPinned: !!d?.isPinned,
      createdAt: d?.createdAt,
      description: d?.description || "",
    };

    const chatsRef = collection(db, "users", userId, "topics", docSnap.id, "chats");
    const chatsSnap = await getDocs(chatsRef);
    topicChats[docSnap.id] = chatsSnap.docs.map(chatDoc => ({
      chatId: chatDoc.id,
      ...chatDoc.data(),
    }));
  }));

  setCustomProjects(topics);
  setProjectChatSessions(prev => ({ ...prev, ...topicChats }));
};

const loadUserChats = async (userId) => {
  const ref = collection(db, "users", userId, "chats");
  const snap = await getDocs(ref);
  const chats = [];

snap.forEach((doc) => {
  chats.push({
    chatId: doc.id,
    ...doc.data(),
  });
});

setProjectChatSessions(prev => ({ ...prev, global: chats }));
};

useEffect(() => {
  let unsubscribeChats = null;
  let unsubscribeTopics = null;

  const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    // Чистим старые подписки при смене пользователя
    unsubscribeChats?.();
    unsubscribeTopics?.();

    if (user?.uid) {
      await loadUserTopics(user.uid);
      await loadUserChats(user.uid);

      // 🔁 Подписка на чаты
      unsubscribeChats = subscribeToUserChats(user.uid, (chats) => {
        setProjectChatSessions(prev => ({ ...prev, global: chats }));
      });

      // 🔁 Подписка на топики (нормализуем в словарь)
      unsubscribeTopics = subscribeToUserTopics(user.uid, (topicsArr) => {
        const map = {};
        topicsArr.forEach((t) => {
          map[t.topicId] = {
            name: t?.name || t?.title || "Untitled Topic",
            isPinned: !!t?.isPinned,
            createdAt: t?.createdAt,
            description: t?.description || "",
          };
        });
        setCustomProjects(map);
      });
    } else {
      // логаут — очищаем стор
      setProjectChatSessions({});
      setCustomProjects({});
    }
  });

  // Общий cleanup эффекта
  return () => {
    unsubscribeAuth();
    unsubscribeChats?.();
    unsubscribeTopics?.();
  };
}, []);

  /* ───────── subscriptions ───────── */

  // Подписка на чаты активного топика (real-time обновление списка)
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !activeProject || activeProject === "global") return;

    const unsubscribe = subscribeToTopicChats(uid, activeProject, (chats) => {
      setProjectChatSessions(prev => ({ ...prev, [activeProject]: chats }));
    });

    return () => unsubscribe();
  }, [activeProject]);

  // Подписка на сообщения активного чата (учитывает topicId)
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

  /* ───────── persistence ───────── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("chatSessions");
      if (saved) {
        setProjectChatSessions(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Invalid JSON in chatSessions. Clearing...");
      localStorage.removeItem("chatSessions");
      setProjectChatSessions({});
    }

    try {
      const savedCustom = localStorage.getItem("customProjects");
      if (savedCustom) {
        setCustomProjects(JSON.parse(savedCustom));
      }
    } catch (e) {
      console.warn("Invalid JSON in customProjects. Clearing...");
      localStorage.removeItem("customProjects");
      setCustomProjects({});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chatSessions", JSON.stringify(projectChatSessions));
  }, [projectChatSessions]);

  useEffect(() => {
    localStorage.setItem("customProjects", JSON.stringify(customProjects));
  }, [customProjects]);

  /* ───────── customProjects control ───────── */
  const addCustomProject = (id, name) => {
    setCustomProjects((prev) => ({
      ...prev,
      [id]: { name },
    }));
  };

  const deleteCustomProject = async (id) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // 🧹 Tear down the topic's File Search documents in OpenAI first (the
    // vector store + every uploaded file), then drop the local records. Done
    // before deleting the topic doc so we can still read the ids.
    try {
      const [topicData, libFiles] = await Promise.all([
        getTopicData(user.uid, id),
        getLibraryFiles({ uid: user.uid, topicId: id }),
      ]);
      const vectorStoreId = topicData?.vectorStoreId || "";
      const fileIds = libFiles.map((f) => f.openaiFileId).filter(Boolean);

      if (vectorStoreId || fileIds.length > 0) {
        await fetch("/api/library", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vectorStoreId, fileIds }),
        }).catch(() => {});
        await deleteLibraryFileRecords({ uid: user.uid, topicId: id });
      }
    } catch (cleanupErr) {
      console.warn("Topic library cleanup failed:", cleanupErr);
    }

    // 🗑 Удаляем документ топика из Firestore
    await deleteDoc(doc(db, "users", user.uid, "topics", id));

    // 🧹 Потом чистим локальное состояние
    setCustomProjects((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    console.log(`✅ Топик ${id} удалён полностью.`);
  } catch (err) {
    console.error("Ошибка при удалении топика:", err);
  }
};

  const renameCustomProject = (id, newName) => {
    const name = (newName ?? "").trim();
    if (!name) return;
    setCustomProjects((prev) => ({
      ...prev,
      [id]: { ...prev[id], name },
    }));
    const uid = auth.currentUser?.uid;
    if (uid && id && id !== "global") {
      renameTopicInFirestore(uid, id, name).catch((e) =>
        console.error("❌ Failed to persist topic rename:", e)
      );
    }
  };

  /* ───────── chats control ───────── */
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

      if (!next[projId]) {
        next[projId] = [];
      }

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

  const renameChat = (chatId, newTitle) => {
    setProjectChatSessions((prev) => {
      const next = { ...prev };

      Object.keys(next).forEach((projId) => {
        next[projId] = next[projId].map((chat) =>
          chat.chatId === chatId ? { ...chat, title: newTitle } : chat
        );
      });

      return next;
    });
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

  /* ───────── context value ───────── */
  const value = {
    projectChatSessions,
    setProjectChatSessions,
    activeProject,
    activeChatId,
    setActiveProject,
    setActiveChatId,
    renameChat,
    deleteChat,
    getActiveChatSession,
    customProjects,
    setCustomProjects,
    addCustomProject,
    deleteCustomProject,
    renameCustomProject,
    openChatSession,
    clearAllChats,
    messages,
    setMessages,
    isLoadingMessages,
    setIsLoadingMessages,
    pendingSend,
    setPendingSend,
    generatingChatId,
    beginGeneration,
    endGeneration,
    stopGeneration,
    streamingMessages,
    setStreamingMessage,
    clearStreamingMessage,
    createNewChat,
    sendMessage,
  };

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
}