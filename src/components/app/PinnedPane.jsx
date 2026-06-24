"use client";

import { useContext, useEffect, useRef } from "react";
import { ChatContext } from "@/context/ChatContext";
import { useChatWorkspace } from "@/context/useChatWorkspace";
import ChatArea from "@/components/app/ChatArea";
import InputBar from "@/components/app/InputBar/InputBar";
import MaskIcon from "@/components/common/MaskIcon";
import SplitDragHint from "@/components/app/SplitDragHint";
import HoverTip from "@/components/common/Tooltip";

// Right-hand split pane: a fixed ("pinned") chat with its own independent
// workspace (messages, streaming, send) running over the shared chat lists. You
// can keep talking here, but you can't switch which chat it shows — that's the
// left/free pane's job.
export default function PinnedPane() {
  const shared = useContext(ChatContext);
  const { pinned, disableSplit, projectChatSessions, setProjectChatSessions } = shared;
  const ws = useChatWorkspace({ projectChatSessions, setProjectChatSessions });
  const paneRef = useRef(null);

  // Lock this pane onto the pinned chat.
  useEffect(() => {
    if (!pinned) return;
    ws.setActiveProject(pinned.topicId || null);
    ws.setActiveChatId(pinned.chatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned?.chatId, pinned?.topicId]);

  if (!pinned) return null;

  const list = projectChatSessions?.[pinned.topicId || "global"] || [];
  const title = list.find((c) => c.chatId === pinned.chatId)?.title || "Pinned chat";

  // Inside this provider, ChatArea/InputBar use the pinned workspace; shared
  // sidebar data still comes through.
  const value = { ...shared, ...ws };

  return (
    <ChatContext.Provider value={value}>
      <div ref={paneRef} className="relative flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 h-[60px] shrink-0">
          <MaskIcon src="/Split_scene_right.svg" size={17} className="text-blue-500 dark:text-blue-400 shrink-0" />
          <span className="text-sm font-medium text-gray-800 dark:text-white/90 truncate flex-1">
            {title}
          </span>
          <HoverTip content="Exit split screen" position="bottom" align="right">
            <button
              onClick={disableSplit}
              aria-label="Exit split screen"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white hover:bg-blue-500 transition-colors shrink-0"
            >
              <MaskIcon src="/Split_scene.svg" size={18} />
            </button>
          </HoverTip>
        </div>

        {/* Messages */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <ChatArea messages={ws.messages} />
        </div>

        {/* First-time hint, just above the input bar (house banner style) */}
        <SplitDragHint />

        {/* Input */}
        <InputBar respondToPendingPrompt={false} dropTargetRef={paneRef} />
      </div>
    </ChatContext.Provider>
  );
}
