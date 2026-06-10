"use client";

import { useContext, useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { UIContext } from "@/context/UIContext";

import { auth } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { ChatContext } from "@/context/ChatContext";
import Tooltip from "@/components/common/Tooltip";
import FilePreview from "./FilePreview";
import { sendChatMessage } from "./sendChatMessage";
import Icon from "@/components/common/Icon";
import { Maximize2, Minimize2 } from "lucide-react";

const FILES_LIMIT = 5;
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 30 * 1024 * 1024;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;
// Show expand button after ~3 lines
const EXPAND_SCROLL_THRESHOLD = 100;

export default function InputBar() {
  const { isSidebarOpen, inputText, setInputText, vesselProfileData } = useContext(UIContext);
  const pathname = usePathname();
  const topicIdFromURL =
    pathname && pathname.startsWith("/app/projects/")
      ? pathname.split("/app/projects/")[1]?.split("/")[0] || null
      : null;

  const {
    projectChatSessions,
    activeChatId,
    setProjectChatSessions,
    setActiveProject,
    setActiveChatId,
  } = useContext(ChatContext);

  const [inputValue, setInputValue] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileAlert, setFileAlert] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExpandBtn, setShowExpandBtn] = useState(false);

  const inputRef = useRef(null);
  const expandedInputRef = useRef(null);

  const { isFullscreen } = useContext(UIContext);

  /* ───────── USER AUTH ───────── */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  /* ───────── TEXTAREA AUTO-RESIZE ───────── */
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      const scrollH = inputRef.current.scrollHeight;
      inputRef.current.style.height = `${Math.min(scrollH, 168)}px`;
      setShowExpandBtn(scrollH >= EXPAND_SCROLL_THRESHOLD);
    }
  }, [inputValue]);

  /* ───────── FOCUS EXPANDED TEXTAREA ───────── */
  useEffect(() => {
    if (isExpanded && expandedInputRef.current) {
      const el = expandedInputRef.current;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [isExpanded]);

  /* ───────── INJECT TEXT FROM OUTSIDE ───────── */
  useEffect(() => {
    if (inputText) {
      setInputValue(inputText);
      setIsActive(true);
      setInputText("");
      if (inputRef.current) inputRef.current.focus();
    }
  }, [inputText]);

  /* ───────── MOBILE KEYBOARD FIX ───────── */
  useEffect(() => {
    const handleResize = () => {
      document.body.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ───────── HANDLERS ───────── */
  const handleSend = async () => {
    if (!inputValue.trim()) return;
    if (!currentUser?.uid) return;

    const message = inputValue;
    setInputValue("");
    setIsActive(false);
    setIsExpanded(false);
    setShowExpandBtn(false);

    const preparedAttachments = uploadedFiles;
    setUploadedFiles([]);

    await sendChatMessage({
      message,
      attachments: preparedAttachments,
      currentUser,
      activeChatId,
      topicIdFromURL,
      projectChatSessions,
      setProjectChatSessions,
      setActiveProject,
      setActiveChatId,
      vesselProfile: vesselProfileData || null,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    if (uploadedFiles.length + files.length > FILES_LIMIT) {
      setFileAlert(`You can upload up to ${FILES_LIMIT} files`);
      setTimeout(() => setFileAlert(""), 7000);
      return;
    }

    let totalSize = uploadedFiles.reduce((acc, file) => acc + file.size, 0);
    const validFiles = [];

    for (const file of files) {
      const isImage = file.type.startsWith("image/");

      if (isImage && file.size > MAX_IMAGE_SIZE) {
        setFileAlert(`Image "${file.name}" exceeds 15MB limit`);
        setTimeout(() => setFileAlert(""), 7000);
        continue;
      }

      if (!isImage && file.size > MAX_DOCUMENT_SIZE) {
        setFileAlert(`File "${file.name}" exceeds 30MB limit`);
        setTimeout(() => setFileAlert(""), 7000);
        continue;
      }

      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        setFileAlert(`Total upload limit is 100MB`);
        setTimeout(() => setFileAlert(""), 7000);
        break;
      }

      totalSize += file.size;
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...validFiles]);
    }

    e.target.value = "";
  };

  const removeFile = (filename) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== filename));
  };

  /* ───────── RENDER ───────── */
  return (
    <>
      {/* ── Expanded fullscreen editor (mobile only) ── */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[200] flex flex-col md:hidden"
          style={{ background: "#0b1220" }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
            <button
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition py-1 px-2 rounded-lg hover:bg-white/5"
              type="button"
              aria-label="Collapse editor"
            >
              <Minimize2 size={18} />
            </button>

            <span className="text-xs text-gray-500 select-none">
              {inputValue.length > 0 ? `${inputValue.length} chars` : ""}
            </span>

            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white transition"
              type="button"
              aria-label="Send"
            >
              <Icon name="arrow-send" size={20} />
            </button>
          </div>

          {/* Full textarea */}
          <textarea
            ref={expandedInputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything in your language..."
            className="flex-1 bg-transparent outline-none text-base text-white placeholder-gray-500 p-4 resize-none overflow-y-auto custom-scroll leading-relaxed"
          />

          {/* Bottom safe-area spacer */}
          <div className="flex-shrink-0" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
        </div>
      )}

      {/* ── Normal Input Bar ── */}
      <div
        className={`w-full bg-transparent transition-all ${
          isFullscreen ? "px-4 sm:px-6 mb-9" : "px-1 sm:px-4 pb-1"
        }`}
      >
        <div className="w-full md:max-w-[896px] mx-auto">
          <div
            className={`rounded-2xl p-1 md:p-2 flex flex-col transition duration-500
              border border-white/10
              shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_6px_rgba(0,0,0,0.4)]
              backdrop-blur-sm
              ${isActive ? "border-blue-500 animate-glow" : ""}`}
          >
            {/* Uploaded Files Preview */}
            <FilePreview files={uploadedFiles} onRemove={removeFile} />

            {/* INPUT ROW */}
            <div className="flex items-end w-full gap-1 px-1">
              {/* 📎 Attach File */}
              <Tooltip content="Add photos & files" position="top">
                <label className="relative cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded min-w-[40px] min-h-[40px] flex items-center justify-center">
                  <Icon name="attach-file" size={20} />
                  <input type="file" multiple onChange={handleFileChange} className="sr-only" />
                </label>
              </Tooltip>

              {/* ✍️ Textarea */}
              <textarea
                ref={inputRef}
                rows={1}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (e.target.value.trim()) setIsActive(true);
                }}
                onFocus={() => setIsActive(true)}
                onBlur={() => { if (!inputValue.trim()) setIsActive(false); }}
                onKeyDown={handleKeyDown}
                className="flex-1 resize-none bg-transparent outline-none text-base placeholder-gray-400 dark:placeholder-gray-500 min-h-[40px] max-h-[168px] overflow-y-auto custom-scroll py-2.5 px-3"
                placeholder="Ask anything in your language..."
                style={{ minWidth: 0 }}
              />

              {/* Right column: expand (top) + send (bottom) */}
              <div className="flex flex-col items-center justify-between self-stretch py-0.5">
                {/* Expand — mobile only, top of column */}
                {showExpandBtn ? (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="md:hidden p-1.5 rounded text-gray-400 hover:text-white transition flex items-center justify-center"
                    type="button"
                    aria-label="Expand editor"
                  >
                    <Maximize2 size={15} />
                  </button>
                ) : (
                  <div />
                )}

                {/* Send — bottom of column */}
                <Tooltip content="Send" position="top">
                  <button
                    onClick={handleSend}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded min-w-[36px] min-h-[36px] flex items-center justify-center"
                    disabled={!inputValue.trim()}
                  >
                    <Icon name="arrow-send" size={20} />
                  </button>
                </Tooltip>
              </div>
            </div>

            {fileAlert && (
              <div className="mx-auto my-2 px-4 py-2 rounded-lg flex items-center gap-2 bg-red-600 text-white shadow font-medium w-fit min-w-[160px] max-w-full animate-fade-in">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="flex-1">{fileAlert}</span>
                <button
                  onClick={() => setFileAlert("")}
                  className="ml-2 flex items-center justify-center text-white hover:text-gray-200 transition"
                  tabIndex={0}
                  aria-label="Close alert"
                  type="button"
                  style={{ lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer — desktop only */}
      <div className="w-full px-1 sm:px-4 pb-2 max-w-full overflow-x-hidden hidden md:block">
        <div className="w-full max-w-full md:max-w-[896px] mx-auto text-center">
          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 leading-tight px-1 break-words text-center">
            <span className="inline-block">Powered by advanced AI</span>{" "}
            <span className="inline-block">
              — enhanced with verified maritime sources such as IMO, SOLAS, and ISM.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
