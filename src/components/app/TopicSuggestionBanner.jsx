"use client";

import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";
import { UIContext } from "@/context/UIContext";
import { auth } from "@/firebase/config";
import { migrateChatToTopic, setChatTopicSuggestion } from "@/firebase/chatStore";
import { Sparkles, X } from "lucide-react";

// Proactive nudge: when a regular chat has clearly become one sustained topic,
// the assistant offers a few name options — picking one migrates the chat, its
// messages and its files into a new Topic (no re-upload).
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

  const [busyName, setBusyName] = useState(null); // which option is being created
  const router = useRouter();

  if (activeProject || !activeChatId) return null;

  const chat = (projectChatSessions?.global || []).find((c) => c.chatId === activeChatId);
  const names = chat?.topicSuggestion?.names || [];
  if (!chat || chat.topicSuggestionState !== "suggested" || names.length === 0) {
    return null;
  }

  const description = chat.topicSuggestion?.description || "";
  const uid = auth.currentUser?.uid;
  const busy = busyName !== null;

  const onLater = async () => {
    if (!uid || busy) return;
    await setChatTopicSuggestion(uid, activeChatId, {
      state: "dismissed",
      suggestion: chat.topicSuggestion,
      atCount: chat.topicSuggestionAtCount || 0,
    });
  };

  const onPick = async (name) => {
    if (!uid || busy) return;
    setBusyName(name);
    try {
      const { topicId } = await migrateChatToTopic({
        uid,
        chatId: activeChatId,
        name,
        description,
      });
      setIsLoadingMessages?.(true);
      setActiveProject(topicId);
      setActiveChatId(activeChatId);
      window.dispatchEvent(
        new CustomEvent("navimind-toast", { detail: { message: `Topic created: ${name}` } })
      );
      router.push(`/app/projects/${topicId}`);
    } catch (e) {
      console.error("Topic migration failed:", e);
      setBusyName(null);
    }
  };

  return (
    <div className="w-full flex justify-center px-3 pb-2 animate-slide-up">
      <div
        className={`flex items-center justify-between gap-3 w-full sm:w-[540px] px-4 py-2.5 rounded-2xl
          backdrop-blur-xl shadow-lg border
          ${theme === "dark" ? "border-white/10 text-white" : "border-blue-200 text-gray-800"}`}
        style={{
          background:
            theme === "dark"
              ? "linear-gradient(90deg, rgba(11,18,32,0.7) 0%, rgba(13,27,58,0.6) 50%, rgba(18,63,124,0.7) 100%)"
              : "linear-gradient(90deg, rgba(239,246,255,1) 0%, rgba(219,234,254,0.95) 50%, rgba(191,219,254,0.85) 100%)",
        }}
      >
        {/* Left: message + name options */}
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <span className="mt-[2px] text-blue-500 dark:text-blue-300 shrink-0">
            <Sparkles size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] sm:text-sm font-medium leading-snug">
              Looks like one focused topic — move it to a Topic?
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {names.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onPick(name)}
                  disabled={busy}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium active:scale-[0.97] transition-all duration-200 disabled:opacity-60
                    ${theme === "dark"
                      ? "border border-blue-400/40 bg-blue-500/15 hover:bg-blue-500/25 text-white"
                      : "border border-blue-300 bg-white/70 hover:bg-blue-100 text-blue-700"}`}
                >
                  {busyName === name && (
                    <span className="w-3 h-3 rounded-full border-2 border-current/40 border-t-current animate-spin" />
                  )}
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: dismiss */}
        <button
          type="button"
          onClick={onLater}
          disabled={busy}
          aria-label="Later"
          className={`shrink-0 self-start p-1 rounded-lg transition-colors disabled:opacity-60
            ${theme === "dark" ? "text-white/50 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-200/60"}`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
