"use client";

import { useContext, useState, createRef, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";
import ChatOptionsDropdown from "@/components/app/ChatOptionsDropdown";
import TopicLibraryModal from "./TopicLibraryModal";
import ChatItem from "./ChatItem";
import Icon from "@/components/common/Icon";
import { togglePinTopic, deleteChatFromFirestore, updateTopicDescription } from "@/firebase/chatStore";
import { auth } from "@/firebase/config";

export default function MyTopicsSection({ onSidebarItemClick, collapsedMode = false }) {
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

  // ── Topic instructions modal ──
  const [instrTopic, setInstrTopic] = useState(null);
  const [instrText, setInstrText] = useState("");
  const [savingInstr, setSavingInstr] = useState(false);

  // ── Topic library modal ──
  const [libraryTopic, setLibraryTopic] = useState(null);

  const openInstructions = (projId) => {
    setInstrText(customProjects?.[projId]?.description || "");
    setInstrTopic(projId);
  };

  const saveInstructions = async () => {
    const user = auth.currentUser;
    if (!user || !instrTopic) return;
    setSavingInstr(true);
    try {
      await updateTopicDescription(user.uid, instrTopic, instrText.trim());
    } catch (e) {
      console.error("Failed to save topic instructions:", e);
    } finally {
      setSavingInstr(false);
      setInstrTopic(null);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const toMs = (v) => typeof v === "number" ? v : v?.toMillis?.() ?? (v?.seconds ?? 0) * 1000;

  const handleExpand = (projId) =>
    setExpandedProjects((prev) => ({ ...prev, [projId]: !prev[projId] }));

  const handleTogglePinTopic = async (projId) => {
    const user = auth.currentUser;
    if (!user) return;
    await togglePinTopic(user.uid, projId);
  };

  const handleDeleteCustomProject = (projId) => {
    deleteCustomProject(projId);
    setProjectChatSessions((prev) => {
      const updated = { ...prev };
      delete updated[projId];
      return updated;
    });
    // If the deleted topic is currently open, go back to the home screen
    if (activeProject === projId) {
      setActiveProject(null);
      setActiveChatId(null);
      router.push("/app");
    }
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

  // Collapsed mode: only show pinned topics (max TOPIC_LIMIT). No Show more.
  // Expanded mode: show up to TOPIC_LIMIT with Show more/less toggle.
  const pinnedTopics = sortedTopics.filter(([, proj]) => proj.isPinned);

  const hasOverflow = !collapsedMode && sortedTopics.length > TOPIC_LIMIT;
  const visibleTopics = collapsedMode
    ? pinnedTopics.slice(0, TOPIC_LIMIT)
    : showAllTopics || topicSelectMode
      ? sortedTopics
      : sortedTopics.slice(0, TOPIC_LIMIT);

  // Nothing to show when collapsed with no pinned topics
  if (collapsedMode && pinnedTopics.length === 0) return null;

  return (
    <>
      {/* ── Topic select bar (replaces nothing — appears above list) ── */}
      {topicSelectMode && !collapsedMode && (
        <div className="px-2 py-2 mt-1 flex items-center gap-1.5">
          <button
            onClick={() =>
              allTopicsSelected
                ? setSelectedTopicIds(new Set())
                : setSelectedTopicIds(new Set(sortedTopics.map(([id]) => id)))
            }
            className="px-3 py-1 rounded-full text-[12px] font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition"
          >
            {allTopicsSelected ? "Deselect all" : "Select all"}
          </button>
          <button
            onClick={cancelTopicSelect}
            className="px-3 py-1 rounded-full text-[12px] font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => bulkDeleteTopics(sortedTopics)}
            disabled={selectedTopicIds.size === 0 || isDeletingTopics}
            className={`ml-auto px-3 py-1 rounded-full text-[12px] font-medium transition ${
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
                group relative flex items-center px-1.5 py-0.5 my-px rounded-lg transition-all duration-200
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
                <div className="relative inline-flex flex-col items-center -ml-1 mr-2">
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
                  <div className="pointer-events-none absolute top-full mt-2 left-0 px-2 py-[2px] text-xs bg-blue-600 text-white rounded shadow opacity-0 peer-hover:opacity-100 transition-opacity z-[200] whitespace-nowrap hidden sm:block">
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

              {!isBeingRenamed && !topicSelectMode && (
                <div
                  className={`
                    flex items-center flex-shrink-0 transition-all duration-200
                    ${isDropdownOpen
                      ? "max-w-[72px] opacity-100"
                      : "[@media(hover:hover)]:max-w-0 [@media(hover:hover)]:overflow-hidden [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:max-w-[72px] [@media(hover:hover)]:group-hover:opacity-100"}
                  `}
                >
                  {proj.isPinned && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePinTopic(projId);
                      }}
                      className="group/pin flex-shrink-0 mx-1 flex items-center justify-center transition-all duration-150"
                      aria-label="Unpin topic"
                      type="button"
                    >
                      {/* Pinned (default) */}
                      <Icon
                        name="pin"
                        size={16}
                        className="opacity-70 drop-shadow-[0_0_2px_rgba(255,255,255,0.3)] group-hover/pin:hidden"
                      />
                      {/* Unpin (on hover) — soft glow, no hover box */}
                      <Icon
                        name="unpin"
                        size={16}
                        className="hidden group-hover/pin:block text-blue-400 dark:text-blue-300 drop-shadow-[0_0_5px_rgba(59,130,246,0.55)]"
                      />
                    </button>
                  )}

                  <button
                    ref={anchorRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenu({ projectId: projId, anchorRef });
                    }}
                    className="peer ml-1 p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all flex items-center justify-center"
                    aria-label="Show menu"
                    type="button"
                  >
                    <Icon name="more-vert" size={16} />
                  </button>
                </div>
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
                  isTopic
                  initialIsPinned={!!proj.isPinned}
                  onEditInstructions={() => {
                    openInstructions(projId);
                    setOpenMenu(null);
                  }}
                  onOpenLibrary={() => {
                    setLibraryTopic(projId);
                    setOpenMenu(null);
                  }}
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
                  <div className="px-1 py-1 mb-1 flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        allChatsSelected
                          ? setChatSelect((p) => ({ ...p, selectedIds: new Set() }))
                          : setChatSelect((p) => ({ ...p, selectedIds: new Set(chats.map((c) => c.chatId)) }))
                      }
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition"
                    >
                      {allChatsSelected ? "Deselect all" : "Select all"}
                    </button>
                    <button
                      onClick={cancelChatSelect}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => bulkDeleteChats(projId, chats)}
                      disabled={chatSelect.selectedIds.size === 0 || isDeletingChats}
                      className={`ml-auto px-2.5 py-0.5 rounded-full text-[11px] font-medium transition ${
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
          className="mt-0.5 px-1.5 py-1 text-[13px] text-blue-400/70 dark:text-blue-400/60 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
        >
          {showAllTopics ? "Show less" : "Show more"}
        </button>
      )}

      {/* ── Topic instructions modal ── */}
      {instrTopic && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget && !savingInstr) setInstrTopic(null); }}
          >
            <div className="w-full max-w-md bg-white dark:bg-[#1a2235] rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-5 flex flex-col gap-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Topic instructions
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                Context the assistant applies to every chat in “{customProjects?.[instrTopic]?.name || "this topic"}”.
              </p>
              <textarea
                value={instrText}
                onChange={(e) => setInstrText(e.target.value)}
                rows={6}
                autoFocus
                placeholder="e.g. We're a Panama-flagged LPG carrier preparing for a SIRE 2.0 inspection. Focus on cargo ops and respond in Russian."
                className="w-full resize-none rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-400 dark:focus:border-blue-500 custom-scroll"
              />
              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setInstrTopic(null)}
                  disabled={savingInstr}
                  className="px-3.5 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveInstructions}
                  disabled={savingInstr}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60 transition-colors"
                >
                  {savingInstr && (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  Save
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Topic library modal ── */}
      {libraryTopic && (
        <TopicLibraryModal
          topicId={libraryTopic}
          topicName={customProjects?.[libraryTopic]?.name || "Topic"}
          onClose={() => setLibraryTopic(null)}
        />
      )}
    </>
  );
}
