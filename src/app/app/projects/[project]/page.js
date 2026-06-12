"use client";

import { useContext, useRef, useState, useEffect, useCallback, createRef } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";
import ChatOptionsDropdown from "@/components/app/ChatOptionsDropdown";
import ChatArea from "@/components/app/ChatArea";
import Icon from "@/components/common/Icon";
import { renameChatInFirestore, deleteChatFromFirestore, togglePinChat, updateTopicDescription } from "@/firebase/chatStore";
import { auth } from "@/firebase/config";

export default function DynamicProjectPage() {
  const { project } = useParams();
  const {
    activeProject,
    activeChatId,
    setActiveProject,
    setActiveChatId,
    openChatSession,
    renameChat,
    deleteChat,
    projectChatSessions,
    setProjectChatSessions,
    customProjects,
    messages,
  } = useContext(ChatContext);

  const hasChat = Boolean(activeChatId) && messages && messages.length > 0;
  const toMs = (v) => typeof v === "number" ? v : v?.toMillis?.() ?? (v?.seconds ?? 0) * 1000;
  const chats = [...(projectChatSessions?.[project] || [])].sort((a, b) => {
    if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
    return toMs(b.createdAt) - toMs(a.createdAt);
  });

  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const anchorRefs = useRef({});

  const [instrModalOpen, setInstrModalOpen] = useState(false);
  const [instrText, setInstrText] = useState("");
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setKbHeight(Math.max(0, window.innerHeight - vv.height));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  // ── Multi-select state ──
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const cancel = (e) => {
      if (renamingId) {
        const input = document.getElementById("rename-input-" + renamingId);
        if (input && !input.contains(e.target)) setRenamingId(null);
      }
    };
    document.addEventListener("mousedown", cancel);
    return () => document.removeEventListener("mousedown", cancel);
  }, [renamingId]);

  useEffect(() => {
    setActiveProject(project);
  }, [project]);

  const handleDeleteChat = (chatId) => {
    deleteChat(chatId);
    if (activeChatId === chatId) setActiveChatId(null);
    setOpenMenu(null);
  };

  // ── Select handlers ──
  const enterSelectMode = useCallback((chatId) => {
    setIsSelectMode(true);
    setSelectedIds(new Set([chatId]));
    setOpenMenu(null);
  }, []);

  const toggleSelect = useCallback((chatId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(chatId) ? next.delete(chatId) : next.add(chatId);
      return next;
    });
  }, []);

  const cancelSelect = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const bulkDelete = useCallback(async () => {
    if (selectedIds.size === 0 || isDeleting) return;
    setIsDeleting(true);

    const user = auth.currentUser;
    if (user) {
      await Promise.all(
        [...selectedIds].map((chatId) =>
          deleteChatFromFirestore(user.uid, chatId, project).catch(() => {})
        )
      );
    }

    setProjectChatSessions((prev) => ({
      ...prev,
      [project]: (prev[project] || []).filter((c) => !selectedIds.has(c.chatId)),
    }));

    if (selectedIds.has(activeChatId)) setActiveChatId(null);

    setIsSelectMode(false);
    setSelectedIds(new Set());
    setIsDeleting(false);
  }, [selectedIds, isDeleting, project, activeChatId]);

  const allSelected = selectedIds.size === chats.length && chats.length > 0;

  const fullTitle = (t = "") => {
    const words = t.trim().split(/\s+/).slice(0, 20).join(" ");
    return words.length > 160 ? words.slice(0, 160) + "…" : words || "Untitled Chat";
  };

  const currentProjectName =
    customProjects?.[project]?.name ||
    project.charAt(0).toUpperCase() + project.slice(1);

  if (hasChat) {
    return <ChatArea messages={messages} />;
  }

  const lastActiveLabel = (() => {
    if (!chats.length) return null;
    let maxMs = 0;
    for (const c of chats) {
      const ms = typeof c.createdAt === "number" ? c.createdAt : c.createdAt?.toMillis?.() ?? (c.createdAt?.seconds ?? 0) * 1000;
      if (ms > maxMs) maxMs = ms;
    }
    if (!maxMs) return null;
    return new Date(maxMs).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  })();

  return (
    <main className="w-full flex flex-col items-center py-6 px-4 overflow-y-auto custom-scroll">
      {/* Project header */}
      <div className="w-full max-w-4xl mb-6 flex flex-col items-start pl-[19px]">
        <div className="flex items-center w-full group relative">
          <Icon name="folder-open" size={28} className="mr-2 flex-shrink-0" />
          <span
            className="block font-semibold text-gray-900 dark:text-white whitespace-normal break-words"
            style={{ fontSize: "clamp(1rem, 4vw, 1.5rem)", maxWidth: "70vw", lineHeight: 1.2 }}
          >
            {currentProjectName}
          </span>
          <button
            onClick={() => {
              setInstrText(customProjects?.[project]?.description || "");
              setInstrModalOpen(true);
            }}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium
              border border-transparent text-gray-500 dark:text-gray-400
              hover:border-blue-500/50 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
              transition-colors duration-200 flex-shrink-0"
          >
            {customProjects?.[project]?.description ? "Edit instruction" : "+ Add instruction"}
          </button>
        </div>
        {(chats.length > 0 || lastActiveLabel) && (
          <div className="flex items-center gap-1.5 mt-1 ml-8 text-[12px] text-gray-500 select-none">
            {chats.length > 0 && (
              <span>{chats.length} {chats.length === 1 ? "chat" : "chats"}</span>
            )}
            {chats.length > 0 && lastActiveLabel && (
              <span className="text-gray-600">·</span>
            )}
            {lastActiveLabel && (
              <span>last active {lastActiveLabel}</span>
            )}
          </div>
        )}
      </div>

      {/* Chat list */}
      <div className="w-full max-w-4xl mb-6">
        {!expanded ? null : chats.length === 0 ? (
          <p className="italic mt-2 text-gray-500 dark:text-gray-400 text-sm sm:text-base pl-5">
            No chats yet. Start a new chat to begin your discussion about this topic.
          </p>
        ) : (
          <>
            {/* Select mode bar */}
            {isSelectMode && (
              <div className="flex items-center gap-2 text-[13px] mb-3 px-2">
                <span className="text-gray-600 dark:text-gray-300 font-medium min-w-[70px]">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() =>
                    allSelected
                      ? setSelectedIds(new Set())
                      : setSelectedIds(new Set(chats.map((c) => c.chatId)))
                  }
                  className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition ml-auto"
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
                <button
                  onClick={cancelSelect}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition px-1"
                >
                  Cancel
                </button>
                <button
                  onClick={bulkDelete}
                  disabled={selectedIds.size === 0 || isDeleting}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    selectedIds.size > 0 && !isDeleting
                      ? "bg-red-600 hover:bg-red-500 text-white"
                      : "bg-red-900/30 text-red-400/50 cursor-not-allowed"
                  }`}
                >
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            )}

            <ul className="space-y-2">
              {chats.map((c) => {
                if (!anchorRefs.current[c.chatId]) {
                  anchorRefs.current[c.chatId] = createRef();
                }
                const anchorRef = anchorRefs.current[c.chatId];
                const isDropdownOpen = openMenu?.chatId === c.chatId;
                const isBeingRenamed = renamingId === c.chatId;
                const isSelected = selectedIds.has(c.chatId);

                return (
                  <li
                    key={c.chatId}
                    className={`group relative flex items-center justify-between px-3 py-1 rounded-lg transition-all
                      ${isSelectMode && isSelected ? "bg-blue-50 dark:bg-gray-700/60" : ""}
                      ${!isSelectMode && (isDropdownOpen || isBeingRenamed) ? "bg-gray-100 dark:bg-gray-700/60" : ""}
                      ${!isSelectMode && !isDropdownOpen && !isBeingRenamed ? "hover:bg-gray-100 dark:hover:bg-white/5" : ""}
                      ${isSelectMode ? "cursor-pointer" : ""}
                    `}
                    style={{ minHeight: 36 }}
                    onClick={isSelectMode ? () => toggleSelect(c.chatId) : undefined}
                  >
                    {/* Checkbox in select mode */}
                    {isSelectMode && (
                      <div className="flex-shrink-0 mr-3 flex items-center justify-center">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? "bg-blue-500 border-blue-500" : "border-gray-500"
                        }`}>
                          {isSelected && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    )}

                    {isBeingRenamed ? (
                      <input
                        id={"rename-input-" + c.chatId}
                        type="text"
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && renameText.trim()) {
                            if (auth.currentUser) {
                              await renameChatInFirestore(auth.currentUser.uid, c.chatId, renameText.trim(), project);
                            }
                            renameChat(c.chatId, renameText.trim());
                            setRenamingId(null);
                          } else if (e.key === "Escape") {
                            setRenamingId(null);
                          }
                        }}
                        autoFocus
                        className="flex-1 w-full bg-white dark:bg-gray-800 px-2 py-1 rounded text-sm text-gray-900 dark:text-gray-100 outline-none"
                      />
                    ) : (
                      <button
                        onClick={isSelectMode ? undefined : () => openChatSession(c.chatId, project)}
                        className="flex-1 min-w-0 text-left px-2 py-1 text-[15px] sm:text-base leading-snug"
                        style={{ lineHeight: 1.25 }}
                        tabIndex={isSelectMode ? -1 : 0}
                      >
                        {fullTitle(c.title)}
                      </button>
                    )}

                    {c.isPinned && !isBeingRenamed && !isSelectMode && (
                      <Icon name="pin" size={16} className="flex-shrink-0 mx-1 opacity-70 drop-shadow-[0_0_2px_rgba(255,255,255,0.3)]" />
                    )}

                    {!isBeingRenamed && !isSelectMode && (
                      <button
                        ref={anchorRef}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenu({ chatId: c.chatId, anchorRef, currentTitle: c.title });
                        }}
                        className="peer flex-shrink-0 p-2 rounded-full flex items-center justify-center bg-transparent hover:bg-gray-300 dark:hover:bg-gray-600 transition opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        aria-label="Chat options"
                      >
                        <Icon name="more-vert" size={16} />
                      </button>
                    )}

                    <style jsx>{`
                      li:hover:has(.peer:hover) { background-color: transparent !important; }
                    `}</style>

                    {!isSelectMode && (
                      <ChatOptionsDropdown
                        chatId={c.chatId}
                        topicId={project}
                        currentTitle={c.title}
                        targetRef={anchorRef}
                        isOpen={isDropdownOpen}
                        initialIsPinned={!!c.isPinned}
                        onPin={async () => {
                          const user = auth.currentUser;
                          if (!user) return !!c.isPinned;
                          const newState = await togglePinChat(user.uid, c.chatId, project);
                          setProjectChatSessions((prev) => ({
                            ...prev,
                            [project]: (prev[project] || []).map((chat) =>
                              chat.chatId === c.chatId ? { ...chat, isPinned: newState } : chat
                            ),
                          }));
                          return newState;
                        }}
                        onEnterSelectMode={() => enterSelectMode(c.chatId)}
                        onShare={() => setOpenMenu(null)}
                        onRename={() => {
                          setRenameText(c.title);
                          setRenamingId(c.chatId);
                          setOpenMenu(null);
                        }}
                        onDelete={() => handleDeleteChat(c.chatId)}
                        onClose={() => setOpenMenu(null)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      {instrModalOpen && createPortal(
        <div
          className="fixed left-0 top-0 right-0 z-[200] flex items-center justify-center bg-black/60 px-3 py-4"
          style={{ bottom: kbHeight, transition: "bottom 200ms" }}
          onClick={(e) => { if (e.target === e.currentTarget) setInstrModalOpen(false); }}
        >
          <div
            className="bg-white/90 dark:bg-gray-800/90 p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-2xl flex flex-col items-stretch"
            onKeyDown={(e) => { if (e.key === "Escape") setInstrModalOpen(false); }}
          >
            <h2 className="text-lg font-bold tracking-wide text-center text-gray-900 dark:text-white mb-4">
              {customProjects?.[project]?.description ? "Edit Instruction" : "Add Instruction"}
            </h2>
            <textarea
              value={instrText}
              onChange={(e) => setInstrText(e.target.value)}
              placeholder="e.g. PSC inspection prep for Hamburg, Aug 2025. Focus on SOLAS II-2 and MARPOL Annex V."
              autoFocus
              className="w-full px-3 py-2 mb-3 rounded-lg border text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition resize-none custom-scroll min-h-[120px] sm:min-h-[260px]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setInstrModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-xl font-medium text-base transition bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const user = auth.currentUser;
                  if (user) await updateTopicDescription(user.uid, project, instrText.trim());
                  setInstrModalOpen(false);
                }}
                className="flex-1 px-4 py-2 rounded-xl font-medium text-base transition bg-blue-600 hover:bg-blue-700 text-white shadow"
              >
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
