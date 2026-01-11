import { useContext, useState, createRef, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";
import ChatOptionsDropdown from "@/components/app/ChatOptionsDropdown";
import ChatItem from "./ChatItem";
import SidebarSectionTitle from "./SidebarSectionTitle";

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

  const anchorRefs = useRef({});
  const router = useRouter();

  const handleExpand = (projId) =>
    setExpandedProjects((prev) => ({
      ...prev,
      [projId]: !prev[projId],
    }));

  const handleDeleteCustomProject = (projId) => {
    deleteCustomProject(projId);
    setProjectChatSessions((prev) => {
      const updated = { ...prev };
      delete updated[projId];
      return updated;
    });
  };

  if (!Object.keys(customProjects).length) return null;

  return (
    <>
      {Object.entries(customProjects).map(([projId, proj], idx) => {
        const isActive = projId === activeProject;
        const isExpanded = expandedProjects[projId] || false;
        const chats = projectChatSessions[projId] || [];
        const limitedChats = chats.slice(0, 5);

        if (!anchorRefs.current[projId]) {
          anchorRefs.current[projId] = createRef();
        }
        const anchorRef = anchorRefs.current[projId];
        const isDropdownOpen = openMenu?.projectId === projId;
        const isBeingRenamed = renamingId === projId;

        return (
         <div key={projId}>
         <div
  className={`
    group relative flex items-center px-2 py-1 rounded-md transition-all duration-200
    ${isActive
      ? "bg-white/10 text-white"
      : "hover:bg-white/5 hover:text-gray-200"}
  `}
  style={{ minHeight: 36 }}
>
  {/* --- SVG Папка с тултипом --- */}
  <div className="relative group/topic flex flex-col items-center mr-2">
    <button
      onClick={() => handleExpand(projId)}
      className="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
    >
      {isExpanded ? (
        <img src="/folder-open.svg" alt="Open Folder" className="w-5 h-5" draggable="false" />
      ) : (
        <img src="/folder-close.svg" alt="Closed Folder" className="w-5 h-5" draggable="false" />
      )}
    </button>
    <div className="absolute top-full mt-2 px-2 py-[2px] text-xs bg-blue-600 text-white rounded shadow opacity-0 group-hover/topic:opacity-100 transition-opacity z-[100] whitespace-nowrap translate-x-[26px] hidden sm:block">
      {isExpanded ? "Close Chats" : "Open Chats"}
    </div>
  </div>

  {/* --- Название топика --- */}
  <button
    onClick={() => {
      setActiveProject(projId);
      setActiveChatId(null);
      router.push(`/app/projects/${projId}`);
      onSidebarItemClick?.();
    }}
    className="flex-1 text-left truncate"
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
        className="w-full bg-white dark:bg-gray-800 px-2 py-1 rounded text-sm text-gray-900 dark:text-gray-100 outline-none"
        autoFocus
      />
    ) : (
      <span className="block w-full whitespace-nowrap overflow-hidden text-ellipsis text-[15px]">
        {proj.name}
      </span>
    )}
  </button>

  {/* --- ТРИ ТОЧКИ Options (dropdown) --- */}
  {!isBeingRenamed && (
    <button
      ref={anchorRef}
      onClick={(e) => {
        e.stopPropagation();
        setOpenMenu({ projectId: projId, anchorRef });
      }}
      className={`
        peer ml-2 p-2 rounded-full
        bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700
        transition-opacity
        opacity-100 md:opacity-0 md:group-hover:opacity-100
        flex items-center justify-center
      `}
      aria-label="Show menu"
      type="button"
    >
      <img src="/More_Vert.svg" alt="More" className="w-4 h-4" draggable="false" />
    </button>
  )}

  {/* ⬇️ Hack: если ховер на peer, то фон у всего ряда отключается */}
  <style jsx>{`
    .group:hover:has(.peer:hover) {
      background-color: transparent !important;
    }
  `}</style>

  <ChatOptionsDropdown
    chatId={projId}
    currentTitle={proj.name}
    targetRef={anchorRef}
    isOpen={isDropdownOpen}
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
</div>
            {/* --- Чаты топика (без изменений) --- */}
            {isExpanded && (
              <div className="ml-5">
                {limitedChats.map((chat) => (
                  <ChatItem
                    key={chat.chatId}
                    chat={chat}
                    projId={projId}
                    route={`/projects/${projId}`}
                    onSidebarItemClick={onSidebarItemClick}
                     nested
                  />
                ))}
                {chats.length > 5 && (
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
    </>
  );
}