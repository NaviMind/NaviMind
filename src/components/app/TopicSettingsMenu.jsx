"use client";

import { useContext, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ChatContext } from "@/context/ChatContext";
import Tooltip from "@/components/common/Tooltip";
import Icon from "@/components/common/Icon";
import MaskIcon from "@/components/common/MaskIcon";
import { FileText } from "lucide-react";

// Topic settings gear — shown in the top bar only when inside a topic. Opens a
// dropdown with Library / Instruction; both dispatch a window event that the
// topic page listens for (so we reuse its existing modals, no duplication).
export default function TopicSettingsMenu() {
  const { customProjects } = useContext(ChatContext);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (!menuRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Bind to the actual topic route so the gear shows ONLY inside a topic.
  const topicId = pathname?.startsWith("/app/projects/")
    ? pathname.split("/app/projects/")[1]?.split("/")[0] || null
    : null;
  if (!topicId) return null;
  const hasInstr = !!customProjects?.[topicId]?.description;

  const toggle = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setCoords({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    setOpen((v) => !v);
  };
  const fire = (name) => {
    window.dispatchEvent(new CustomEvent(name));
    setOpen(false);
  };

  const itemCls =
    "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-normal text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 transition";

  return (
    <>
      <Tooltip content="Topic settings" position="bottom" align="right">
        <button
          ref={btnRef}
          onClick={toggle}
          aria-label="Topic settings"
          className="flex items-center justify-center w-9 h-9 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white transition-colors"
        >
          <Icon name="settings" size={20} />
        </button>
      </Tooltip>

      {open && coords &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: coords.top, right: coords.right, zIndex: 9999, minWidth: 184 }}
            className="bg-white/95 dark:bg-[#1a2235]/95 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-black/[0.06] dark:ring-white/[0.08] p-1 text-sm"
          >
            <button onClick={() => fire("nm-topic-library")} className={itemCls}>
              <MaskIcon src="/library_books.svg" size={19} className="opacity-80" />
              <span>Library</span>
            </button>
            <button onClick={() => fire("nm-topic-instruction")} className={itemCls}>
              <FileText size={19} className="opacity-80" />
              <span>{hasInstr ? "Edit instruction" : "Add instruction"}</span>
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
