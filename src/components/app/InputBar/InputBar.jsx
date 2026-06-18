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
// Pasting more than this many characters turns the text into a .txt attachment
// instead of dumping a wall of text into the input (useful for long threads).
const PASTE_TO_FILE_THRESHOLD = 1500;
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 30 * 1024 * 1024;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;
const EXPAND_SCROLL_THRESHOLD = 100;

function Waveform() {
  return (
    <div className="flex items-center gap-[3px] px-1">
      {[0, 0.12, 0.24, 0.36].map((delay, i) => (
        <span
          key={i}
          className="block w-[3px] rounded-full bg-blue-400"
          style={{ animation: `waveform 0.7s ease-in-out ${delay}s infinite`, height: "3px" }}
        />
      ))}
    </div>
  );
}

function StopBtn({ onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      type="button"
      aria-label="Stop recording"
      className={`p-2 rounded flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white dark:hover:bg-gray-700 hover:bg-gray-100 transition ${className}`}
    >
      <Icon name="stop-circle" size={20} />
    </button>
  );
}

export default function InputBar() {
  const { isSidebarOpen, inputText, setInputText, pendingPrompt, setPendingPrompt, vesselProfileData } = useContext(UIContext);
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
    setIsLoadingMessages,
  } = useContext(ChatContext);

  const [inputValue, setInputValue] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileAlert, setFileAlert] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExpandBtn, setShowExpandBtn] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragDepthRef = useRef(0);
  const inputRef = useRef(null);
  const expandedInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechBaseRef = useRef("");

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

  /* ───────── SPEECH RECOGNITION SUPPORT CHECK ───────── */
  useEffect(() => {
    setSpeechSupported(
      typeof window !== "undefined" &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }, []);

  /* ───────── RESPONSIVE PLACEHOLDER ───────── */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 850);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ───────── DRAG & DROP FILES (desktop) ───────── */
  useEffect(() => {
    const hasFiles = (e) =>
      Array.from(e.dataTransfer?.types || []).includes("Files");

    const onDragEnter = (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current += 1;
      setIsDragging(true);
    };
    const onDragOver = (e) => {
      if (hasFiles(e)) e.preventDefault(); // allow drop
    };
    const onDragLeave = (e) => {
      if (!hasFiles(e)) return;
      dragDepthRef.current -= 1;
      if (dragDepthRef.current <= 0) {
        dragDepthRef.current = 0;
        setIsDragging(false);
      }
    };
    const onDrop = (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer?.files || []);
      if (dropped.length) addFiles(dropped);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFiles]);

  /* ───────── SPEECH TOGGLE ───────── */
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    speechBaseRef.current = inputValue;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const base = speechBaseRef.current;
      const sep = base && !base.endsWith(" ") && !base.endsWith("\n") ? " " : "";
      setInputValue(base + sep + transcript);
      setIsActive(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (e) => {
      if (e.error !== "aborted") setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  /* ───────── HANDLERS ───────── */
  // override — необязательный текст для прямой отправки (клик по followup).
  // Когда вызывается как onClick кнопки, override приходит как событие — поэтому
  // проверяем именно строку.
  const handleSend = async (override) => {
    const isOverride = typeof override === "string" && override.trim().length > 0;
    const message = isOverride ? override.trim() : inputValue;
    if (!message.trim()) return;
    if (!currentUser?.uid) return;

    let preparedAttachments = [];
    if (!isOverride) {
      setInputValue("");
      setIsActive(false);
      setIsExpanded(false);
      setShowExpandBtn(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsListening(false);
      preparedAttachments = uploadedFiles;
      setUploadedFiles([]);
    }

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
      setIsLoadingMessages,
      vesselProfile: vesselProfileData || null,
    });
  };

  /* ───────── SEND-NOW FROM FOLLOWUP CLICK ───────── */
  useEffect(() => {
    if (!pendingPrompt || !pendingPrompt.trim()) return;
    if (!currentUser?.uid) return;
    const prompt = pendingPrompt;
    setPendingPrompt("");
    handleSend(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt, currentUser]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Long pastes (e.g. an entire email thread) become a .txt attachment so the
  // input stays clean and the assistant processes it as a document.
  const handlePaste = (e) => {
    const text = e.clipboardData?.getData("text") ?? "";
    if (text.length <= PASTE_TO_FILE_THRESHOLD) return; // normal paste

    e.preventDefault();

    if (uploadedFiles.length >= FILES_LIMIT) {
      setFileAlert(`You can upload up to ${FILES_LIMIT} files`);
      setTimeout(() => setFileAlert(""), 7000);
      return;
    }

    const stamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace(/[:T]/g, "-");
    const file = new File([text], `pasted-message-${stamp}.txt`, {
      type: "text/plain",
    });

    setUploadedFiles((prev) => [...prev, file]);
  };

  // Shared validation/add used by both the file picker and drag-and-drop.
  const addFiles = (files) => {
    if (!files?.length) return;

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
  };

  const handleFileChange = (e) => {
    addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeFile = (filename) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== filename));
  };

  /* ───────── RENDER ───────── */
  return (
    <>
      {/* ── Drag & drop overlay (desktop) ── */}
      {isDragging && !isMobile && (
        <div className="fixed inset-0 z-[300] pointer-events-none flex items-center justify-center bg-blue-950/40 backdrop-blur-[2px]">
          <div className="m-6 px-10 py-12 rounded-3xl border-2 border-dashed border-blue-400/80 bg-white/90 dark:bg-gray-900/90 shadow-2xl flex flex-col items-center gap-3 text-center">
            <Icon name="attach-file" size={32} />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Drop files to attach
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Images, PDF, Word — up to {FILES_LIMIT} files
            </p>
          </div>
        </div>
      )}

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
              className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition py-1 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
              type="button"
              aria-label="Collapse editor"
            >
              <Minimize2 size={18} />
            </button>

            {/* Center: waveform while recording, else char count */}
            <div className="flex items-center justify-center min-w-[60px]">
              {isListening ? (
                <Waveform />
              ) : (
                <span className="text-xs text-gray-500 select-none">
                  {inputValue.length > 0 ? `${inputValue.length} chars` : ""}
                </span>
              )}
            </div>

            {/* Right: mic/stop + send */}
            <div className="flex items-center gap-1">
              {speechSupported && (
                isListening ? (
                  <StopBtn onClick={toggleListening} />
                ) : (
                  <button
                    onClick={toggleListening}
                    type="button"
                    aria-label="Start voice input"
                    className="p-2 rounded flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
                  >
                    <Icon name="mic" size={20} />
                  </button>
                )
              )}
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
          </div>

          {/* Full textarea */}
          <textarea
            ref={expandedInputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isMobile ? "Ask NaviMind..." : "Ask NaviMind in your language..."}
            className="flex-1 bg-transparent outline-none text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 p-4 resize-none overflow-y-auto custom-scroll leading-relaxed"
          />

          {/* Bottom safe-area spacer */}
          <div className="flex-shrink-0" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
        </div>
      )}

      {/* ── Normal Input Bar ── */}
      <div
        className={`w-full bg-[var(--bg-app)] transition-all ${
          isFullscreen ? "px-4 sm:px-6 mb-9" : "px-1 sm:px-4 pb-1"
        }`}
      >
        <div className="w-full md:max-w-[896px] mx-auto">
          <div
            className={`rounded-2xl p-1 md:p-2 flex flex-col transition duration-500
              border border-gray-200 dark:border-white/10
              shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_6px_rgba(0,0,0,0.4)]
              bg-white dark:bg-transparent
              backdrop-blur-sm
              ${isActive ? "border-blue-400 dark:border-blue-500 animate-glow" : ""}`}
          >
            {/* Uploaded Files Preview */}
            <FilePreview files={uploadedFiles} onRemove={removeFile} />

            {/* INPUT ROW */}
            <div className="flex items-end w-full gap-1 px-1">
              {/* 📎 Attach File */}
              <Tooltip content="Add photos & files" position="top">
                <label className="relative cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded min-w-[40px] min-h-[40px] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
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
                onPaste={handlePaste}
                className="flex-1 resize-none bg-transparent outline-none text-base placeholder-gray-400 dark:placeholder-gray-500 min-h-[40px] max-h-[168px] overflow-y-auto custom-scroll py-2.5 px-3"
                placeholder={isMobile ? "Ask NaviMind..." : "Ask NaviMind in your language..."}
                style={{ minWidth: 0 }}
              />

              {/* Right column: top slot + bottom row */}
              <div className="flex flex-col items-center self-stretch py-0.5">
                {/* Top slot: waveform (recording) → expand btn (long text) → spacer */}
                <div className="flex-1 flex items-start justify-center pt-0.5">
                  {isListening ? (
                    <div className="flex items-center justify-center min-h-[24px]">
                      <Waveform />
                    </div>
                  ) : showExpandBtn ? (
                    <button
                      onClick={() => setIsExpanded(true)}
                      className="md:hidden p-1.5 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition flex items-center justify-center"
                      type="button"
                      aria-label="Expand editor"
                    >
                      <Maximize2 size={15} />
                    </button>
                  ) : null}
                </div>

                {/* Bottom row: mic↔stop toggle + send */}
                <div className="flex items-center">
                  {speechSupported && (
                    isListening ? (
                      <StopBtn onClick={toggleListening} />
                    ) : (
                      <Tooltip content="Voice input" position="top">
                        <button
                          onClick={toggleListening}
                          type="button"
                          aria-label="Start voice input"
                          className="p-2 rounded flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <Icon name="mic" size={20} />
                        </button>
                      </Tooltip>
                    )
                  )}
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
