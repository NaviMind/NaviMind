"use client";

import { useEffect, useRef, useState, useContext } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { UIContext } from "@/context/UIContext";
import { ChatContext } from "@/context/ChatContext";
import { deleteChatFromFirestore, moveChatToTopic } from "@/firebase/chatStore";
import { auth } from "@/firebase/config";
import { exportChatAsTxt } from "@/utils/exportChatAsTxt";
import { getChatMessages } from "@/firebase/chatStore";
import { togglePinChat } from "@/firebase/chatStore";
import Icon from "@/components/common/Icon";
import MaskIcon from "@/components/common/MaskIcon";
import { Folder, ChevronRight, Plus, FileText } from "lucide-react";


// Мобайл‑детектор
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export default function ChatOptionsDropdown({
  isOpen,
  onClose,
  targetRef,
  chatId,
  topicId = null,
  isTopic = false,
  currentTitle = "",
  initialIsPinned = false,
  onPin,
  onShare,
  onRename,
  onDelete,
  onEnterSelectMode,
  onNewChat,
  onEditInstructions,
  onOpenLibrary,
}) {
  const { theme } = useContext(UIContext);
  const {
    customProjects,
    setActiveProject,
    setActiveChatId,
  } = useContext(ChatContext);
  const router = useRouter();
  const menuRef = useRef(null);
  const isMobile = useIsMobile();
  const [coords, setCoords] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(initialIsPinned);

  // "Move to topic" flyout submenu state.
  const [submenuCoords, setSubmenuCoords] = useState(null);
  const [moving, setMoving] = useState(false);
  const moveRowRef = useRef(null);
  const submenuRef = useRef(null);
  const submenuTimer = useRef(null);

  // Topics the chat can be moved into (exclude the one it's already in).
  const topicEntries = Object.entries(customProjects || {})
    .filter(([id]) => id !== topicId)
    .map(([id, p]) => ({ id, name: p?.name || "Untitled topic" }));

  const openSubmenu = () => {
    clearTimeout(submenuTimer.current);
    const el = moveRowRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = 220;
    const maxH = Math.min(280, topicEntries.length * 40 + 16);
    let left = rect.right + 4;
    if (left + w > window.innerWidth) left = rect.left - w - 4;
    if (left < 8) left = 8;
    let top = rect.top;
    if (top + maxH > window.innerHeight) top = Math.max(8, window.innerHeight - maxH - 8);
    setSubmenuCoords({ top, left, width: w, maxH });
  };
  const scheduleCloseSubmenu = () => {
    clearTimeout(submenuTimer.current);
    submenuTimer.current = setTimeout(() => setSubmenuCoords(null), 220);
  };

  const handleMove = async (toTopicId) => {
    const user = auth.currentUser;
    if (!user || moving) return;
    setMoving(true);
    try {
      await moveChatToTopic({ uid: user.uid, chatId, fromTopicId: topicId, toTopicId });
      const name = (customProjects || {})[toTopicId]?.name || "topic";
      window.dispatchEvent(
        new CustomEvent("navimind-toast", { detail: { message: `Moved to topic: ${name}` } })
      );
      // Open the destination topic (its overview/chat list) — the moved chat
      // shows up there; we don't drop the user straight into the chat.
      setActiveProject(toTopicId);
      setActiveChatId(null);
      router.push(`/app/projects/${toTopicId}`);
      setSubmenuCoords(null);
      onClose();
    } catch (e) {
      console.error("Move chat to topic failed:", e);
      setMoving(false);
    }
  };

  useEffect(() => {
    if (!isOpen) { setCoords(null); return; }
    if (!targetRef?.current) return;

    const rect = targetRef.current.getBoundingClientRect();
    const menuHeight = 160;
    const menuWidth = isMobile ? 220 : 180;

    let top = rect.bottom + 8;
    let left = isMobile
      ? Math.max((window.innerWidth - menuWidth) / 2, 8)
      : rect.left + 8;

    if (top + menuHeight > window.innerHeight) {
      top = rect.top - menuHeight - 2;
      if (top < 8) top = 8;
    }

    if (!isMobile && left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth - 4;
      left = Math.max(left, 8);
    }

    setCoords({ top, left });
  }, [isOpen, targetRef, isMobile]);

  useEffect(() => {
    if (!isOpen && !confirmOpen) return;

    const click = (e) => {
      if (
        !menuRef.current?.contains(e.target) &&
        !targetRef?.current?.contains(e.target) &&
        !submenuRef.current?.contains(e.target) &&
        !confirmOpen
      ) {
        onClose();
      }
    };

    const key = (e) => {
      if (e.key === "Escape") {
        if (confirmOpen) setConfirmOpen(false);
        else onClose();
      }
    };

    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, [isOpen, confirmOpen]);

  const handleDelete = async () => {
    const user = auth.currentUser;
    if (!user) return;
    await deleteChatFromFirestore(user.uid, chatId, topicId);
    onDelete(chatId);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setConfirmOpen(false); 
      onClose();             
    }
  };

  useEffect(() => {
    setIsPinned(initialIsPinned);
  }, [initialIsPinned]);

  // Close the flyout whenever the menu closes.
  useEffect(() => {
    if (!isOpen) setSubmenuCoords(null);
  }, [isOpen]);

  return (
    <>
      {isOpen && !confirmOpen && coords &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              minWidth: isMobile ? 220 : 180,
              zIndex: 9999,
            }}
            className="bg-white/95 dark:bg-[#1a2235]/95 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-black/[0.06] dark:ring-white/[0.08] p-1 text-sm"
          >

{onNewChat && (
  <button
    onClick={() => { onNewChat(); onClose(); }}
    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-normal text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 transition"
  >
    <Plus size={19} className="opacity-80" />
    <span>New chat</span>
  </button>
)}

{onEditInstructions && (
  <button
    onClick={() => { onEditInstructions(); onClose(); }}
    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-normal text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 transition"
  >
    <FileText size={19} className="opacity-80" />
    <span>Instructions</span>
  </button>
)}

{onOpenLibrary && (
  <button
    onClick={() => { onOpenLibrary(); onClose(); }}
    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-normal text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 transition"
  >
    <MaskIcon src="/library_books.svg" size={19} className="opacity-80" />
    <span>Library</span>
  </button>
)}

<button
  onClick={async () => {
    const user = auth.currentUser;
    if (!user) return;
    const newState = onPin
      ? await onPin()
      : await togglePinChat(user.uid, chatId, topicId);
    setIsPinned(newState);
    onClose();
  }}
  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-normal text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 transition"
>
  <Icon name={isPinned ? "unpin" : "pin"} size={20} className="opacity-80" />
  <span>{isPinned ? "Unpin" : "Pin"}</span>
</button>

            {!isTopic && (
              <button
  onClick={async () => {
    const user = auth.currentUser;
    if (!user) return;

    const messages = await getChatMessages(user.uid, chatId, topicId);
    await exportChatAsTxt(messages, currentTitle);
    onClose();
  }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-normal text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 transition"
            >
              <Icon name="share" size={20} className="opacity-80" />
              <span>Share</span>
            </button>
            )}

            <button
              onClick={() => {
                onRename(chatId);
                onClose();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-normal text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 transition"
            >
              <Icon name="edit" size={20} className="opacity-80" />
              <span>Rename</span>
            </button>

            {!isTopic && topicEntries.length > 0 && (
              <button
                ref={moveRowRef}
                onMouseEnter={openSubmenu}
                onMouseLeave={scheduleCloseSubmenu}
                onClick={() => (submenuCoords ? setSubmenuCoords(null) : openSubmenu())}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-normal text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 transition"
              >
                <Folder size={19} className="opacity-80" />
                <span className="flex-1 text-left">Move to topic</span>
                <ChevronRight size={16} className="opacity-50" />
              </button>
            )}

            {onEnterSelectMode && (
              <button
                onClick={() => {
                  onEnterSelectMode();
                  onClose();
                }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-normal text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 transition"
              >
                <Icon name="select" size={20} className="opacity-80" />
                <span>Select</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                setTimeout(() => setConfirmOpen(true), 0);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-normal text-red-400 dark:text-red-350 hover:bg-red-500/10 dark:hover:bg-red-500/10 transition"
            >
              <Icon name="delete" size={20} className="opacity-80" />
              <span className="text-inherit">Delete</span>
            </button>
          </div>,
          document.body
        )}

      {/* "Move to topic" flyout — list of existing topics */}
      {isOpen && !confirmOpen && submenuCoords &&
        createPortal(
          <div
            ref={submenuRef}
            onMouseEnter={() => clearTimeout(submenuTimer.current)}
            onMouseLeave={scheduleCloseSubmenu}
            style={{
              position: "fixed",
              top: submenuCoords.top,
              left: submenuCoords.left,
              width: submenuCoords.width,
              maxHeight: submenuCoords.maxH,
              zIndex: 10000,
            }}
            className="overflow-y-auto custom-scroll bg-white/95 dark:bg-[#1a2235]/95 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-black/[0.06] dark:ring-white/[0.08] p-1 text-sm"
          >
            {topicEntries.map((t) => (
              <button
                key={t.id}
                onClick={() => handleMove(t.id)}
                disabled={moving}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 transition disabled:opacity-60"
              >
                <Folder size={16} className="opacity-70 shrink-0" />
                <span className="truncate text-left flex-1">{t.name}</span>
              </button>
            ))}
          </div>,
          document.body
        )}

      {confirmOpen &&
        createPortal(
          <>
            <div
  className={`fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-2 ${theme === "dark" ? "bg-black/60" : "bg-black/25"}`}
  onClick={handleBackdropClick}
>
  <form
    className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-md flex flex-col items-stretch"
    onSubmit={async (e) => {
      e.preventDefault();
      await handleDelete();
      setConfirmOpen(false);
      onClose();
    }}
    autoComplete="off"
    onKeyDown={(e) => {
      if (e.key === "Escape") onClose();
    }}
  >
    <h2 className="text-lg font-bold tracking-wide text-center text-gray-900 dark:text-white mb-4">
      Delete Chat
    </h2>
    <p className="text-sm text-gray-700 dark:text-gray-300 text-center mb-4">
      This will delete: <span className="font-medium">{currentTitle}</span>
    </p>
    <div className="flex justify-center gap-3 mt-2">
      <button
        type="button"
        className="px-4 py-[6px] text-sm rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
        onClick={() => { setConfirmOpen(false); onClose(); }}
      >
        Cancel
      </button>
      <button
        type="submit"
        className="px-4 py-[6px] text-sm rounded-xl bg-red-600 text-white hover:bg-red-500"
      >
        Delete
      </button>
    </div>
  </form>
</div>
          </>,
          document.body
        )}
    </>
  );
}