"use client";

import { subscribeToUserChats, subscribeToUserTopics, renameTopicInFirestore, getTopicData, getLibraryFiles, deleteLibraryFileRecords } from "@/firebase/chatStore";
import { createContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { db } from "@/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { doc, deleteDoc } from "firebase/firestore";
import { useChatWorkspace } from "./useChatWorkspace";

export const ChatContext = createContext();

/* ───────── provider ───────── */
export function ChatProvider({ children }) {
  // ── Shared sidebar data (one instance, used by all workspaces) ──
  const [projectChatSessions, setProjectChatSessions] = useState({});
  const [customProjects, setCustomProjects] = useState({});

  // ── Per-pane workspace (active chat/topic, messages, streaming, send, …) ──
  const ws = useChatWorkspace({ projectChatSessions, setProjectChatSessions });

  // ── Split screen: a second pane holding a fixed ("pinned") chat ──
  const [splitMode, setSplitMode] = useState(false);
  const [pinned, setPinned] = useState(null); // { chatId, topicId }
  const [isDraggingChat, setIsDraggingChat] = useState(false); // drag-to-pin
  const enableSplit = (chatId, topicId) => {
    if (!chatId) return;
    const wasSplit = splitMode;
    setPinned({ chatId, topicId: topicId && topicId !== "global" ? topicId : null });
    setSplitMode(true);
    // Free the left/main pane only when first entering split (so the two panes
    // aren't the same chat). When already split, just swap the pinned chat.
    if (!wasSplit) ws.setActiveChatId(null);
  };
  const disableSplit = () => {
    setSplitMode(false);
    setPinned(null);
  };

  // Persist split across reloads (the left pane starts at home; the right pane
  // restores its pinned chat).
  const splitRestoredRef = useRef(false);
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("splitState") || "null");
      if (s?.splitMode && s?.pinned?.chatId) {
        setPinned(s.pinned);
        setSplitMode(true);
      }
    } catch { /* ignore */ }
    splitRestoredRef.current = true;
  }, []);
  useEffect(() => {
    if (!splitRestoredRef.current) return;
    try {
      localStorage.setItem("splitState", JSON.stringify({ splitMode, pinned }));
    } catch { /* ignore */ }
  }, [splitMode, pinned]);

  const clearAllChats = () => {
    setProjectChatSessions({});
    setCustomProjects({});            // drop topics too, so no deleted topic lingers
    // Land on a fresh "New Chat" (same state the New Chat button produces),
    // not a blank pane stuck on a now-deleted topic.
    ws.setActiveProject("global");
    ws.setActiveChatId(null);
    ws.setMessages?.([]);
    setSplitMode(false);
    setPinned(null);
    localStorage.removeItem("chatSessions");
    localStorage.removeItem("customProjects");
    localStorage.removeItem("splitState");
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

  /* ───────── shared chat list control ───────── */
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

  /* ───────── context value ───────── */
  const value = {
    projectChatSessions,
    setProjectChatSessions,
    customProjects,
    setCustomProjects,
    addCustomProject,
    deleteCustomProject,
    renameCustomProject,
    renameChat,
    clearAllChats,
    // Split screen
    splitMode,
    pinned,
    enableSplit,
    disableSplit,
    isDraggingChat,
    setIsDraggingChat,
    // Per-pane workspace (single instance for now; split screen adds a second).
    ...ws,
  };

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
}
