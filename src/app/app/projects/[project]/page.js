"use client";

import { useContext, useRef, useState, useEffect, useCallback, createRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";
import { UIContext } from "@/context/UIContext";
import ChatOptionsDropdown from "@/components/app/ChatOptionsDropdown";
import ChatArea from "@/components/app/ChatArea";
import Icon from "@/components/common/Icon";
import { renameChatInFirestore, deleteChatFromFirestore, togglePinChat, updateTopicDescription } from "@/firebase/chatStore";
import { auth } from "@/firebase/config";
import { sendChatMessage } from "@/components/app/InputBar/sendChatMessage";
import TopicLibraryModal from "@/components/app/sidebar/TopicLibraryModal";

export default function DynamicProjectPage() {
  const { project } = useParams();
  const {
    activeProject,
    activeChatId,
    setActiveProject,
    setActiveChatId,
    openChatSession,
    renameChat,
    renameCustomProject,
    deleteChat,
    projectChatSessions,
    setProjectChatSessions,
    customProjects,
    messages,
    isLoadingMessages,
    setIsLoadingMessages,
    splitMode,
  } = useContext(ChatContext);
  const { theme, vesselProfileData } = useContext(UIContext);

  const hasChat = Boolean(activeChatId) && (messages?.length > 0 || isLoadingMessages);
  const toMs = (v) => typeof v === "number" ? v : v?.toMillis?.() ?? (v?.seconds ?? 0) * 1000;
  const chats = [...(projectChatSessions?.[project] || [])].sort((a, b) => {
    if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
    return toMs(b.createdAt) - toMs(a.createdAt);
  });

  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const anchorRefs = useRef({});

  const [instrModalOpen, setInstrModalOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [isInstrPresent, setIsInstrPresent] = useState(false);
  const [instrText, setInstrText] = useState("");
  const [kbHeight, setKbHeight] = useState(0);

  // Open modals inside the main work area (not over the sidebar).
  const [portalTarget, setPortalTarget] = useState(null);
  useEffect(() => {
    setPortalTarget(document.getElementById("nm-workarea") || document.body);
  }, []);

  // The Library / Instruction modals are opened from the top-bar gear
  // (TopicSettingsMenu) via window events.
  useEffect(() => {
    const onLib = () => setLibraryOpen(true);
    const onInstr = () => {
      setInstrText(customProjects?.[project]?.description || "");
      setInstrModalOpen(true);
    };
    window.addEventListener("nm-topic-library", onLib);
    window.addEventListener("nm-topic-instruction", onInstr);
    return () => {
      window.removeEventListener("nm-topic-library", onLib);
      window.removeEventListener("nm-topic-instruction", onInstr);
    };
  }, [project, customProjects]);
  const [isCompact, setIsCompact] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => { if (instrModalOpen) setIsInstrPresent(true); }, [instrModalOpen]);

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

  // Fetch AI-suggested questions for empty topics (cached per topic+instruction)
  useEffect(() => {
    if ((projectChatSessions?.[project] || []).length > 0) return;
    const name = customProjects?.[project]?.name;
    if (!name) return; // wait until Firebase loads the topic name
    const instruction = customProjects?.[project]?.description || "";
    const cacheKey = `topic-suggestions:v2:${project}:${instruction}`;

    // Reject any question that leaked the raw Firestore document id
    const isClean = (arr) =>
      Array.isArray(arr) && arr.length > 0 && !arr.some((q) => q.includes(project));

    // Show cached questions instantly if we already generated them
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const arr = JSON.parse(cached);
        if (isClean(arr)) {
          setSuggestedQuestions(arr);
          setIsLoadingQuestions(false);
          return;
        }
      }
    } catch { /* ignore */ }

    setIsLoadingQuestions(true);
    setSuggestedQuestions([]);
    fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicName: name, topicInstruction: instruction }),
    })
      .then((r) => r.json())
      .then(({ questions }) => {
        const arr = isClean(questions) ? questions : [];
        setSuggestedQuestions(arr);
        if (arr.length) {
          try { sessionStorage.setItem(cacheKey, JSON.stringify(arr)); } catch { /* ignore */ }
        }
      })
      .catch(() => setSuggestedQuestions([]))
      .finally(() => setIsLoadingQuestions(false));
  }, [
    project,
    customProjects?.[project]?.description,
    customProjects?.[project]?.name,
    (projectChatSessions?.[project] || []).length,
  ]);

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

  const startEditName = () => {
    setNameDraft(currentProjectName);
    setIsEditingName(true);
  };

  const commitEditName = () => {
    const v = nameDraft.trim();
    if (v && v !== currentProjectName) renameCustomProject(project, v);
    setIsEditingName(false);
  };

  const handleSendQuestion = (question) => {
    const user = auth.currentUser;
    if (!user) return;
    sendChatMessage({
      message: question,
      attachments: [],
      currentUser: user,
      activeChatId: null,
      topicIdFromURL: project,
      projectChatSessions,
      setProjectChatSessions,
      setActiveProject,
      setActiveChatId,
      setIsLoadingMessages,
      vesselProfile: vesselProfileData || null,
    });
  };

  // Topic Library / Instruction modals. Rendered in every branch (chat open,
  // empty topic, overview) so the top-bar gear works no matter what the left
  // pane is currently showing — otherwise opening a topic chat would swallow
  // the gear actions until you navigated back to the topic overview.
  const modals = (
    <>
      {libraryOpen && (
        <TopicLibraryModal
          topicId={project}
          topicName={customProjects?.[project]?.name || "Topic"}
          onClose={() => setLibraryOpen(false)}
        />
      )}

      {isInstrPresent && portalTarget && createPortal(
        <div
          className={`fixed left-0 top-0 z-[200] flex items-center justify-center overflow-hidden backdrop-blur-sm px-3 py-4 ${theme === "dark" ? "bg-black/60" : "bg-black/25"} transition-opacity duration-500 ${splitMode ? "right-0 [@media(hover:hover)]:right-1/2" : "right-0"}`}
          style={{ bottom: kbHeight, transition: "bottom 200ms, opacity 500ms", opacity: instrModalOpen ? 1 : 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) setInstrModalOpen(false); }}
        >
          <AnimatePresence onExitComplete={() => { if (!instrModalOpen) setIsInstrPresent(false); }}>
            {instrModalOpen && (
              <motion.div
                key="instr-modal"
                variants={{ initial: { y: "100%", opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: "100%", opacity: 0 } }}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white/90 dark:bg-gray-800/40 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-2xl flex flex-col items-stretch"
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
                  className="w-full px-3 py-2 mb-3 rounded-xl border text-base bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition resize-none custom-scroll min-h-[120px] sm:min-h-[260px]"
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        portalTarget
      )}
    </>
  );

  if (hasChat) {
    return (
      <>
        <ChatArea messages={messages} />
        {modals}
      </>
    );
  }

  // Empty topic — title + AI-suggested question pills, left-aligned as a block
  if (chats.length === 0) {
    return (
      <>
      <div className="w-full h-full flex flex-col items-center overflow-y-auto custom-scroll px-6" style={{ paddingTop: "13vh" }}>
        <div className="flex flex-col items-start w-full max-w-2xl">
          {/* Icon + topic name */}
          <div className="flex items-center gap-3 mb-7">
            <Icon name="folder-open" size={44} className="flex-shrink-0 text-gray-900 dark:text-white" />
            {isEditingName ? (
              <input
                type="text"
                value={nameDraft}
                autoFocus
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitEditName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitEditName(); }
                  else if (e.key === "Escape") setIsEditingName(false);
                }}
                className="bg-transparent border-b-2 border-blue-500 outline-none text-gray-900 dark:text-white font-semibold tracking-tight"
                style={{ fontSize: "clamp(1.75rem, 4.5vw, 3.25rem)", lineHeight: 1.15 }}
              />
            ) : (
              <h1
                className="font-semibold text-gray-900 dark:text-white tracking-tight cursor-text select-none"
                style={{ fontSize: "clamp(1.75rem, 4.5vw, 3.25rem)", lineHeight: 1.15 }}
                onClick={isCompact ? startEditName : undefined}
                onDoubleClick={startEditName}
              >
                {currentProjectName}
              </h1>
            )}
          </div>

          {/* Suggested question pills */}
          <div className="flex flex-col items-start gap-2 w-full">
            {isLoadingQuestions ? (
              [220, 180, 200].map((w, i) => (
                <div
                  key={i}
                  className="h-9 max-w-full rounded-full bg-gray-200 dark:bg-white/10 animate-pulse"
                  style={{ width: w }}
                />
              ))
            ) : (
              suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSendQuestion(q)}
                  className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-white/10
                    text-sm text-gray-700 dark:text-gray-200
                    bg-white dark:bg-white/5
                    hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10
                    transition-colors text-left max-w-full whitespace-normal"
                >
                  {q}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
      {modals}
      </>
    );
  }

  const lastActiveLabel = (() => {
    if (!chats.length) return null;
    let maxMs = 0;
    for (const c of chats) {
      const ms = typeof c.createdAt === "number" ? c.createdAt : c.createdAt?.toMillis?.() ?? (c.createdAt?.seconds ?? 0) * 1000;
      if (ms > maxMs) maxMs = ms;
    }
    if (!maxMs) return null;
    const d = new Date(maxMs);
    const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const dayDiff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
    if (dayDiff <= 0) return "today";
    if (dayDiff === 1) return "yesterday";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  })();

  return (
    <main className="w-full flex flex-col items-center py-6 px-4 overflow-y-auto custom-scroll">
      {/* Project header */}
      <div className="w-full max-w-4xl mb-6 flex flex-col items-start pl-[19px]">
        <div className="flex items-center w-full group relative">
          <Icon name="folder-open" size={28} className="mr-2 flex-shrink-0" />
          {isEditingName ? (
            <input
              type="text"
              value={nameDraft}
              autoFocus
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitEditName}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitEditName(); }
                else if (e.key === "Escape") setIsEditingName(false);
              }}
              className="block font-semibold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-500 outline-none whitespace-normal break-words"
              style={{ fontSize: "clamp(1rem, 4vw, 1.5rem)", maxWidth: "70vw", lineHeight: 1.2 }}
            />
          ) : (
            <>
              <span
                onClick={isCompact ? startEditName : undefined}
                onDoubleClick={startEditName}
                className="block font-semibold text-gray-900 dark:text-white whitespace-normal break-words cursor-text"
                style={{ fontSize: "clamp(1rem, 4vw, 1.5rem)", maxWidth: "70vw", lineHeight: 1.2 }}
              >
                {currentProjectName}
              </span>
              {/* Rename pencil — desktop only, reveals on hovering the header area */}
              <span className="relative hidden md:inline-flex flex-col items-center ml-1.5 flex-shrink-0
                opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={startEditName}
                  aria-label="Rename topic"
                  className="peer p-2 rounded-lg text-gray-500 dark:text-gray-400
                    hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5
                    focus:outline-none focus:ring-2 focus:ring-blue-500/40
                    transition-colors duration-200"
                >
                  <Icon name="edit" size={20} />
                </button>
                <span className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2 py-[2px] text-xs bg-blue-600 text-white rounded shadow opacity-0 peer-hover:opacity-100 transition-opacity z-[100] whitespace-nowrap">
                  Rename
                </span>
              </span>
            </>
          )}
        </div>
        {lastActiveLabel && (
          <div className="flex items-center gap-1.5 mt-1 ml-8 text-[12px] text-gray-500 select-none">
            <span>last active {lastActiveLabel}</span>
          </div>
        )}
      </div>

      {/* Chat list */}
      <div className="w-full max-w-4xl mb-6">
        {!expanded ? null : chats.length === 0 ? null : (
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

            <ul className="divide-y divide-gray-100 dark:divide-white/[0.06]">
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
                    className={`group relative flex items-center justify-between px-3 py-2 rounded-lg transition-all
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
                        className="flex-1 w-full bg-transparent border-b-2 border-blue-500 px-1 py-0.5 text-[15px] text-gray-900 dark:text-gray-100 outline-none"
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
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const user = auth.currentUser;
                          if (!user) return;
                          const newState = await togglePinChat(user.uid, c.chatId, project);
                          setProjectChatSessions((prev) => ({
                            ...prev,
                            [project]: (prev[project] || []).map((chat) =>
                              chat.chatId === c.chatId ? { ...chat, isPinned: newState } : chat
                            ),
                          }));
                        }}
                        className="group/pin flex-shrink-0 mx-1 flex items-center justify-center transition-all duration-150"
                        aria-label="Unpin chat"
                        type="button"
                      >
                        <Icon name="pin" size={16} className="opacity-70 drop-shadow-[0_0_2px_rgba(255,255,255,0.3)] group-hover/pin:hidden" />
                        <Icon name="unpin" size={16} className="hidden group-hover/pin:block text-blue-400 dark:text-blue-300 drop-shadow-[0_0_5px_rgba(59,130,246,0.55)]" />
                      </button>
                    )}

                    {!isBeingRenamed && !isSelectMode && (
                      <button
                        ref={anchorRef}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenu({ chatId: c.chatId, anchorRef, currentTitle: c.title });
                        }}
                        className="peer flex-shrink-0 p-1.5 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
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

      {modals}
    </main>
  );
}
