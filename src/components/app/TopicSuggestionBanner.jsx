"use client";

import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";
import { auth } from "@/firebase/config";
import { migrateChatToTopic, setChatTopicSuggestion } from "@/firebase/chatStore";
import { Sparkles, X } from "lucide-react";

// Proactive nudge: when a regular chat has clearly become one sustained topic,
// offer to graduate it into a Topic (auto-named by the assistant) — one click
// migrates the chat, its messages and its files.
export default function TopicSuggestionBanner() {
  const {
    projectChatSessions,
    activeProject,
    activeChatId,
    setActiveProject,
    setActiveChatId,
    setIsLoadingMessages,
  } = useContext(ChatContext);

  const [busy, setBusy] = useState(false);
  const router = useRouter();

  // Only for regular (non-topic) chats.
  if (activeProject || !activeChatId) return null;

  const chat = (projectChatSessions?.global || []).find((c) => c.chatId === activeChatId);
  if (!chat || chat.topicSuggestionState !== "suggested" || !chat.topicSuggestion?.name) {
    return null;
  }

  const { name, description } = chat.topicSuggestion;
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
    if (!uid || busy) return;
    setBusy(true);
    try {
      const { topicId } = await migrateChatToTopic({
        uid,
        chatId: activeChatId,
        name,
        description,
      });
      // Jump into the freshly created topic.
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
    <div className="w-full px-1 sm:px-4 pb-1">
      <div className="w-full md:max-w-[896px] mx-auto">
        <div className="relative flex items-start gap-3 rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/80 dark:bg-blue-500/10 px-4 py-3 shadow-sm">
          <div className="mt-0.5 text-blue-500 dark:text-blue-400 shrink-0">
            <Sparkles size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-800 dark:text-white/90 leading-snug">
              This chat looks like an ongoing topic:{" "}
              <span className="font-semibold">{name}</span>. Move it to a Topic to
              keep its files and memory together?
            </p>

            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                onClick={onCreate}
                disabled={busy}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium transition-colors"
              >
                {busy ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Moving…
                  </>
                ) : (
                  <>Create topic</>
                )}
              </button>
              <button
                type="button"
                onClick={onLater}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-white/10 disabled:opacity-60 transition-colors"
              >
                Later
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onLater}
            disabled={busy}
            aria-label="Dismiss"
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
