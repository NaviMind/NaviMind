"use client";

import { subscribeToMessages, subscribeToUserChats, subscribeToUserTopics } from "@/firebase/chatStore";
import { createContext, useEffect, useState } from "react";
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
  snap.forEach((docSnap) => {
    const d = docSnap.data();
    topics[docSnap.id] = { name: d?.name || d?.title || "Untitled Topic" };
  });
  setCustomProjects(topics);
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

setProjectChatSessions({ global: chats });
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
        setProjectChatSessions({ global: chats });
      });

      // 🔁 Подписка на топики (нормализуем в словарь)
      unsubscribeTopics = subscribeToUserTopics(user.uid, (topicsArr) => {
        const map = {};
        topicsArr.forEach((t) => {
          map[t.topicId] = { name: t?.name || t?.title || "Untitled Topic" };
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
  useEffect(() => {
    if (!activeChatId || !auth.currentUser) return;

    const unsubscribe = subscribeToMessages(
      auth.currentUser.uid,
      activeChatId,
      (msgs) => {
        setMessages(msgs);
        console.log("🧠 Загруженные сообщения:", msgs);
      }
    );

    return () => unsubscribe();
  }, [activeChatId]);

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
    setCustomProjects((prev) => ({
      ...prev,
      [id]: { ...prev[id], name: newName },
    }));
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
    createNewChat,
    sendMessage,
  };

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
}