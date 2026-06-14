"use client";

import { useContext, useState, createRef, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";
import ChatOptionsDropdown from "@/components/app/ChatOptionsDropdown";
import ChatItem from "./ChatItem";
import Icon from "@/components/common/Icon";
import { togglePinTopic, deleteChatFromFirestore } from "@/firebase/chatStore";
import { auth } from "@/firebase/config";

export default function MyTopicsSection({ onSidebarItemClick }) {
  const {
    projectChatSessions,
    customProjects,
    setActiveProject,
    setActiveChatId,
    renameCustomProject,
    deleteCustomProject,
    setProjectChatSessions,
    activeProject,
  } = useContext(ChatContext);

  const [expandedProjects, setExpandedProjects] = useState({});
  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [showAllTopics, setShowAllTopics] = useState(false);

  const TOPIC_LIMIT = 5;

  // ── Topic-folder select mode ──
  const [topicSelectMode, setTopicSelectMode] = useState(false);
  const [selectedTopicIds, setSelectedTopicIds] = useState(new Set());
  const [isDeletingTopics, setIsDeletingTopics] = useState(false);

  // ── Topic-chat select mode (one topic at a time) ──
  const [chatSelect, setChatSelect] = useState(null); // { topicId, selectedIds: Set }
  const [isDeletingChats, setIsDeletingChats] = useState(false);

  const anchorRefs = useRef({});
  const router = useRouter();

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const toMs = (v) => typeof v === "number" ? v : v?.toMillis?.() ?? (v?.seconds ?? 0) * 1000;

  const handleExpand = (projId) =>
    setExpandedProjects((prev) => ({ ...prev, [projId]: !prev[projId] }));

  const handleDeleteCustomProject = (projId) => {
    deleteCustomProject(projId);
    setProjectChatSessions((prev) => {
      const updated = { ...prev };
      delete updated[projId];
      return updated;
    });
  };

  // ─── Topic-folder select handlers ───────────────────────────────────────────

  const enterTopicSelectMode = useCallback((projId) => {
    setTopicSelectMode(true);
    setSelectedTopicIds(new Set([projId]));
    setChatSelect(null); // exit chat select if open
  }, []);

  const toggleTopicSelect = useCallback((projId) => {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      next.has(projId) ? next.delete(projId) : next.add(projId);
      return next;
    });
  }, []);

  const cancelTopicSelect = useCallback(() => {
    setTopicSelectMode(false);
    setSelectedTopicIds(new Set());
  }, []);

  const bulkDeleteTopics = useCallback(async (sortedTopicIds) => {
    if (selectedTopicIds.size === 0 || isDeletingTopics) return;
    setIsDeletingTopics(true);
    for (const projId of selectedTopicIds) {
      handleDeleteCustomProject(projId);
    }
    setTopicSelectMode(false);
    setSelectedTopicIds(new Set());
    setIsDeletingTopics(false);
  }, [selectedTopicIds, isDeletingTopics]);

  // ─── Topic-chat select handlers ──────────────────────────────────────────────

  const enterChatSelectMode = useCallback((topicId, chatId) => {
    setChatSelect({ topicId, selectedIds: new Set([chatId]) });
    setTopicSelectMode(false); // exit topic select if open
  }, []);

  const toggleChatSelect = useCallback((chatId) => {
    setChatSelect((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.selectedIds);
      next.has(chatId) ? next.delete(chatId) : next.add(chatId);
      return { ...prev, selectedIds: next };
    });
  }, []);

  const cancelChatSelect = useCallback(() => setChatSelect(null), []);

  const bulkDeleteChats = useCallback(async (topicId, allChats) => {
    if (!chatSelect || chatSelect.selectedIds.size === 0 || isDeletingChats) return;
    setIsDeletingChats(true);

    const user = auth.currentUser;
    if (user) {
      await Promise.all(
        [...chatSelect.selectedIds].map((chatId) =>
          deleteChatFromFirestore(user.uid, chatId, topicId).catch(() => {})
        )
      );
    }

    setProjectChatSessions((prev) => ({
      ...prev,
      [topicId]: (prev[topicId] || []).filter(
        (c) => !chatSelect.selectedIds.has(c.chatId)
      ),
    }));

    setChatSelect(null);
    setIsDeletingChats(false);
  }, [chatSelect, isDeletingChats]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!Object.keys(customProjects).length) return null;

  const sortedTopics = Object.entries(customProjects).sort(([, a], [, b]) => {
    if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
    return toMs(b.createdAt) - toMs(a.createdAt);
  });

  const allTopicsSelected = selectedTopicIds.size === sortedTopics.length;

  // Show max TOPIC_LIMIT topics; rest hidden behind a "Show more" toggle.
  // In select mode we always show everything so selection stays consistent.
  const hasOverflow = sortedTopics.length > TOPIC_LIMIT;
  const visibleTopics =
    showAllTopics || topicSelectMode
      ? sortedTopics
      : sortedTopics.slice(0, TOPIC_LIMIT);

  return (
    <>
      {/* ── Topic select bar (replaces nothing — appears above list) ── */}
      {topicSelectMode && (
        <div className="px-3 py-2 mt-1 flex items-center gap-2 text-[13px]">
          <span className="text-gray-600 dark:text-gray-300 font-medium min-w-[70px]">
            {selectedTopicIds.size} selected
          </span>
          <button
            onClick={() =>
              allTopicsSelected
                ? setSelectedTopicIds(new Set())
                : setSelectedTopicIds(new Set(sortedTopics.map(([id]) => id)))
            }
            className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition ml-auto"
          >
            {allTopicsSelected ? "Deselect all" : "Select all"}
          </button>
          <button
            onClick={cancelTopicSelect}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition px-1"
          >
            Cancel
          </button>
          <button
            onClick={() => bulkDeleteTopics(sortedTopics)}
            disabled={selectedTopicIds.size === 0 || isDeletingTopics}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              selectedTopicIds.size > 0 && !isDeletingTopics
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-red-900/30 text-red-400/50 cursor-not-allowed"
            }`}
          >
            {isDeletingTopics ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}

      {visibleTopics.map(([projId, proj]) => {
        const isActive = projId === activeProject;
        const isExpanded = expandedProjects[projId] || false;
        const rawChats = projectChatSessions[projId] || [];
        const chats = [...rawChats].sort((a, b) => {
          if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
          return toMs(b.createdAt) - toMs(a.createdAt);
        });
        const limitedChats = chats.slice(0, 5);

        if (!anchorRefs.current[projId]) anchorRefs.current[projId] = createRef();
        const anchorRef = anchorRefs.current[projId];
        const isDropdownOpen = openMenu?.projectId === projId;
        const isBeingRenamed = renamingId === projId;

        const isTopicSelected = selectedTopicIds.has(projId);
        const chatSelectActive = chatSelect?.topicId === projId;
        const allChatsSelected =
          chatSelectActive && chatSelect.selectedIds.size === chats.length;

        return (
          <div key={projId}>
            {/* ── Topic folder row ── */}
            <div
              className={`
                group relative flex items-center px-2.5 py-0.5 mx-1.5 my-px rounded-lg transition-all duration-200
                ${topicSelectMode && isTopicSelected ? "bg-blue-50 dark:bg-white/10" : ""}
                ${!topicSelectMode && isActive ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white" : ""}
                ${!topicSelectMode && !isActive ? "hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200" : ""}
                ${topicSelectMode ? "cursor-pointer" : ""}
              `}
              style={{ minHeight: 34 }}
              onClick={topicSelectMode ? () => toggleTopicSelect(projId) : undefined}
            >
              {/* Checkbox in topic select mode */}
              {topicSelectMode && (
                <div className="flex-shrink-0 mr-2 flex items-center justify-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isTopicSelected ? "bg-blue-500 border-blue-500" : "border-gray-500"
                  }`}>
                    {isTopicSelected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
              )}

              {/* Folder icon (hidden in select mode) */}
              {!topicSelectMode && (
                <div className="relative inline-flex flex-col items-center mr-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleExpand(projId); }}
                    className="peer p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    {isExpanded ? (
                      <Icon name="folder-open" size={20} />
                    ) : (
                      <Icon name="folder-close" size={20} />
                    )}
                  </button>
                  <div className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-[2px] text-xs bg-blue-600 text-white rounded shadow opacity-0 peer-hover:opacity-100 transition-opacity z-[200] whitespace-nowrap hidden sm:block">
                    {isExpanded ? "Close Chats" : "Open Chats"}
                  </div>
                </div>
              )}

              {/* Topic name / rename input */}
              <button
                onClick={topicSelectMode ? undefined : () => {
                  setActiveProject(projId);
                  setActiveChatId(null);
                  router.push(`/app/projects/${projId}`);
                  onSidebarItemClick?.();
                }}
                className="flex-1 text-left truncate"
                tabIndex={topicSelectMode ? -1 : 0}
              >
                {isBeingRenamed ? (
                  <input
                    id={"rename-input-" + projId}
                    type="text"
                    value={renameText ?? ""}
                    onChange={(e) => setRenameText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && renameText.trim()) {
                        renameCustomProject(projId, renameText.trim());
                        setRenamingId(null);
                      } else if (e.key === "Escape") {
                        setRenamingId(null);
                      }
                    }}
                    className="w-full bg-transparent border-b-2 border-blue-500 px-1 py-0.5 text-[15px] text-gray-900 dark:text-gray-100 outline-none"
                    autoFocus
                  />
                ) : (
                  <span className="block w-full whitespace-nowrap overflow-hidden text-ellipsis text-[15px]">
                    {proj.name}
                  </span>
                )}
              </button>

              {proj.isPinned && !isBeingRenamed && !topicSelectMode && (
                <Icon name="pin" size={16} className="flex-shrink-0 mx-1 opacity-70 drop-shadow-[0_0_2px_rgba(255,255,255,0.3)]" />
              )}

              {!isBeingRenamed && !topicSelectMode && (
                <button
                  ref={anchorRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu({ projectId: projId, anchorRef });
                  }}
                  className="peer ml-2 p-2 rounded-full bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100 flex items-center justify-center"
                  aria-label="Show menu"
                  type="button"
                >
                  <Icon name="more-vert" size={16} />
                </button>
              )}

              <style jsx>{`
                .group:hover:has(.peer:hover) { background-color: transparent !important; }
              `}</style>

              {!topicSelectMode && (
                <ChatOptionsDropdown
                  chatId={projId}
                  currentTitle={proj.name}
                  targetRef={anchorRef}
                  isOpen={isDropdownOpen}
                  initialIsPinned={!!proj.isPinned}
                  onEnterSelectMode={() => {
                    enterTopicSelectMode(projId);
                    setOpenMenu(null);
                  }}
                  onPin={async () => {
                    const user = auth.currentUser;
                    if (!user) return !!proj.isPinned;
                    return await togglePinTopic(user.uid, projId);
                  }}
                  onShare={() => setOpenMenu(null)}
                  onRename={() => {
                    setRenameText(proj.name);
                    setRenamingId(projId);
                    setOpenMenu(null);
                  }}
                  onDelete={() => {
                    handleDeleteCustomProject(projId);
                    setOpenMenu(null);
                  }}
                  onClose={() => setOpenMenu(null)}
                />
              )}
            </div>

            {/* ── Expanded topic chats ── */}
            {isExpanded && (
              <div className="ml-5">
                {/* Chat select bar for this topic */}
                {chatSelectActive && (
                  <div className="px-2 py-1 mb-1 flex items-center gap-2 text-[12px]">
                    <span className="text-gray-300 font-medium">
                      {chatSelect.selectedIds.size} selected
                    </span>
                    <button
                      onClick={() =>
                        allChatsSelected
                          ? setChatSelect((p) => ({ ...p, selectedIds: new Set() }))
                          : setChatSelect((p) => ({ ...p, selectedIds: new Set(chats.map((c) => c.chatId)) }))
                      }
                      className="text-blue-400 hover:text-blue-300 transition ml-auto text-[11px]"
                    >
                      {allChatsSelected ? "Deselect all" : "Select all"}
                    </button>
                    <button
                      onClick={cancelChatSelect}
                      className="text-gray-400 hover:text-gray-200 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => bulkDeleteChats(projId, chats)}
                      disabled={chatSelect.selectedIds.size === 0 || isDeletingChats}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                        chatSelect.selectedIds.size > 0 && !isDeletingChats
                          ? "bg-red-600 hover:bg-red-500 text-white"
                          : "bg-red-900/30 text-red-400/50 cursor-not-allowed"
                      }`}
                    >
                      {isDeletingChats ? "…" : "Delete"}
                    </button>
                  </div>
                )}

                {limitedChats.map((chat) => (
                  <ChatItem
                    key={chat.chatId}
                    chat={chat}
                    projId={projId}
                    route={`/projects/${projId}`}
                    onSidebarItemClick={onSidebarItemClick}
                    nested
                    isSelectMode={chatSelectActive}
                    isSelected={chatSelectActive && chatSelect.selectedIds.has(chat.chatId)}
                    onToggleSelect={toggleChatSelect}
                    onEnterSelectMode={(chatId) => enterChatSelectMode(projId, chatId)}
                  />
                ))}

                {chats.length > 5 && !chatSelectActive && (
                  <button
                    onClick={() => {
                      setActiveProject(projId);
                      setActiveChatId(null);
                      router.push(`/app/projects/${projId}`);
                      onSidebarItemClick?.();
                    }}
                    className="mt-1 pl-[23px] text-[15px] font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                  >
                    See All
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Show more / less toggle ── */}
      {hasOverflow && !topicSelectMode && (
        <button
          onClick={() => setShowAllTopics((v) => !v)}
          className="mt-0.5 mx-1.5 px-2.5 py-1 text-[13px] text-blue-400/70 dark:text-blue-400/60 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
        >
          {showAllTopics ? "Show less" : "Show more"}
        </button>
      )}
    </>
  );
}
