"use client";

import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";
import { UIContext } from "@/context/UIContext";
import { auth } from "@/firebase/config";
import { migrateChatToTopic, setChatTopicSuggestion } from "@/firebase/chatStore";
import { Sparkles } from "lucide-react";

// Proactive nudge: when a regular chat has clearly become one sustained topic,
// the assistant offers a few name options. The user PICKS a name, then confirms
// with "Create" — picking one migrates the chat, its messages and its files
// into a new Topic (no re-upload). "Later" snoozes; it re-appears as the chat
// keeps growing on the same theme.
export default function TopicSuggestionBanner() {
  const {
    projectChatSessions,
    activeProject,
    activeChatId,
    setActiveProject,
    setActiveChatId,
    setIsLoadingMessages,
  } = useContext(ChatContext);
  const { theme } = useContext(UIContext);

  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  if (activeProject || !activeChatId) return null;

  const chat = (projectChatSessions?.global || []).find((c) => c.chatId === activeChatId);
  const names = chat?.topicSuggestion?.names || [];
  if (!chat || chat.topicSuggestionState !== "suggested" || names.length === 0) {
    return null;
  }

  const description = chat.topicSuggestion?.description || "";
  const uid = auth.currentUser?.uid;

  const onLater = async () => {
    if (!uid || busy) return;
    await setChatTopicSuggestion(uid, activeChatId, {
      state: "dismissed",
      suggestion: chat.topicSuggestion,
      atCount: chat.topicSuggestionAtCount || 0,
    });
  };

  const onCreate = async () => {
    if (!uid || busy || !selected) return;
    setBusy(true);
    try {
      const { topicId } = await migrateChatToTopic({
        uid,
        chatId: activeChatId,
        name: selected,
        description,
      });
      setIsLoadingMessages?.(true);
      setActiveProject(topicId);
      setActiveChatId(activeChatId);
      router.push(`/app/projects/${topicId}`);
    } catch (e) {
      console.error("Topic migration failed:", e);
      setBusy(false);
    }
  };

  return (
    <div className="w-full flex justify-center px-3 pb-2 animate-slide-up">
      <div
        className={`flex flex-col gap-2.5 w-full sm:w-[620px] px-4 py-3 rounded-2xl
          backdrop-blur-xl shadow-lg border
          ${theme === "dark" ? "border-white/10 text-white" : "border-blue-200 text-gray-800"}`}
        style={{
          background:
            theme === "dark"
              ? "linear-gradient(90deg, rgba(11,18,32,0.7) 0%, rgba(13,27,58,0.6) 50%, rgba(18,63,124,0.7) 100%)"
              : "linear-gradient(90deg, rgba(239,246,255,1) 0%, rgba(219,234,254,0.95) 50%, rgba(191,219,254,0.85) 100%)",
        }}
      >
        {/* Message */}
        <div className="flex items-center gap-2.5">
          <span className="text-blue-500 dark:text-blue-300 shrink-0">
            <Sparkles size={17} />
          </span>
          <p className="text-[13px] sm:text-sm font-medium leading-snug">
            Looks like one focused topic — pick a name to move it to a Topic:
          </p>
        </div>

        {/* Name options */}
        <div className="flex flex-wrap gap-1.5">
          {names.map((name) => {
            const active = selected === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setSelected(name)}
                disabled={busy}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium active:scale-[0.97] transition-all duration-150 disabled:opacity-60
                  ${active
                    ? "bg-blue-600 text-white border border-blue-600 shadow-sm"
                    : theme === "dark"
                      ? "border border-blue-400/40 bg-blue-500/10 hover:bg-blue-500/20 text-white"
                      : "border border-blue-300 bg-white/70 hover:bg-blue-100 text-blue-700"}`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {/* Actions — right aligned (house style) */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onLater}
            disabled={busy}
            className={`px-3 py-[5px] text-xs sm:text-sm font-medium rounded-lg active:scale-[0.97] transition-all duration-200 disabled:opacity-60
              ${theme === "dark"
                ? "border border-white/15 hover:bg-white/10 text-white/70"
                : "border border-gray-300 hover:bg-gray-100 text-gray-500"}`}
          >
            Later
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={busy || !selected}
            className="flex items-center gap-1.5 px-3.5 py-[5px] text-xs sm:text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-default text-white active:scale-[0.97] transition-all duration-200"
          >
            {busy && (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            )}
            {busy ? "Moving…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
