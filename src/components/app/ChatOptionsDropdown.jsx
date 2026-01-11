"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { deleteChatFromFirestore } from "@/firebase/chatStore";
import { auth } from "@/firebase/config";
import { exportChatAsTxt } from "@/utils/exportChatAsTxt";
import { getChatMessages } from "@/firebase/chatStore";
import { togglePinChat } from "@/firebase/chatStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";


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
  currentTitle = "",
  onShare,
  onRename,
  onDelete,
}) {
  const menuRef = useRef(null);
  const isMobile = useIsMobile();
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    if (!isOpen || !targetRef?.current) return;

    const rect = targetRef.current.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    const menuHeight = 160;
    const menuWidth = isMobile ? 220 : 180;

    let top = rect.bottom + scrollY + 8;
    let left = isMobile
      ? Math.max((window.innerWidth - menuWidth) / 2, 8)
      : rect.left + scrollX + 8;

    const willOverflowBottom = top + menuHeight > window.innerHeight + scrollY;
    if (willOverflowBottom) {
      top = rect.top + scrollY - menuHeight - 2;
      if (top < scrollY + 8) top = scrollY + 8;
    }

    if (!isMobile && left + menuWidth > window.innerWidth + scrollX) {
      left = window.innerWidth + scrollX - menuWidth - 4;
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
    await deleteChatFromFirestore(user.uid, chatId);
    onDelete(chatId);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setConfirmOpen(false); 
      onClose();             
    }
  };

  useEffect(() => {
  const fetchPinState = async () => {
    const user = auth.currentUser;
    if (!user || !chatId) return;
    try {
      const chatRef = doc(db, "users", user.uid, "chats", chatId);
      const snap = await getDoc(chatRef);
      if (snap.exists()) {
        setIsPinned(!!snap.data().isPinned);
      }
    } catch (err) {
      console.error("Failed to load pin state:", err);
    }
  };

  if (isOpen) fetchPinState();
}, [isOpen, chatId]);

  return (
    <>
      {isOpen && !confirmOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "absolute",
              top: coords.top,
              left: coords.left,
              minWidth: isMobile ? 220 : 180,
              zIndex: 50,
            }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg ring-1 ring-slate-700 p-1 text-sm transition"
          >

<button
  onClick={async () => {
    const user = auth.currentUser;
    if (!user) return;
    const newState = await togglePinChat(user.uid, chatId);
    setIsPinned(newState);
    onClose();
  }}
  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-normal text-gray-900 dark:text-gray-100 hover:bg-slate-700/80 dark:hover:bg-slate-700 transition"
>
  <img
    src={isPinned ? "/Unpin.svg" : "/Pin.svg"}
    alt={isPinned ? "Unpin" : "Pin"}
    className="w-5 h-5 opacity-80"
  />
  <span>{isPinned ? "Unpin" : "Pin"}</span>
</button>

            <button
  onClick={async () => {
    const user = auth.currentUser;
    if (!user) return;

    const messages = await getChatMessages(user.uid, chatId); 
    await exportChatAsTxt(messages); 
    onClose();
  }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-normal text-gray-900 dark:text-gray-100 hover:bg-slate-700/80 dark:hover:bg-slate-700 transition"
            >
              <img src="/Share.svg" alt="Share" className="w-5 h-5 opacity-80" />
              <span>Share</span>
            </button>

            <button
              onClick={() => {
                onRename(chatId);
                onClose();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-normal text-gray-900 dark:text-gray-100 hover:bg-slate-700/80 dark:hover:bg-slate-700 transition"
            >
              <img src="/Edit.svg" alt="Rename" className="w-5 h-5 opacity-80" />
              <span>Rename</span>
            </button>

            <button
              onClick={() => {
                onClose();
                setTimeout(() => setConfirmOpen(true), 0);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-normal text-red-400 dark:text-red-350 hover:bg-red-500/10 dark:hover:bg-red-500/10 transition"
            >
              <img src="/Delete.svg" alt="Delete" className="w-5 h-5 opacity-80" />
              <span className="text-inherit">Delete</span>
            </button>
          </div>,
          document.body
        )}

      {confirmOpen &&
        createPortal(
          <>
            <div
  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2"
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
        onClick={onClose}
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