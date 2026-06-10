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
      className={`p-2 rounded flex items-center justify-center text-blue-400 hover:text-blue-300 transition ${className}`}
    >
      <Icon name="stop-circle" size={26} />
    </button>
  );
}

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
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

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
  const handleSend = async () => {
    if (!inputValue.trim()) return;
    if (!currentUser?.uid) return;

    const message = inputValue;
    setInputValue("");
    setIsActive(false);
    setIsExpanded(false);
    setShowExpandBtn(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);

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
                    className="p-2 rounded flex items-center justify-center text-gray-400 hover:text-white transition"
                  >
                    <Icon name="mic" size={26} />
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
            placeholder="Ask in any language..."
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
              {/* 📎 Attach File — replaced by stop button while recording */}
              {speechSupported && isListening ? (
                <Tooltip content="Stop recording" position="top">
                  <StopBtn onClick={toggleListening} className="min-w-[40px] min-h-[40px]" />
                </Tooltip>
              ) : (
                <Tooltip content="Add photos & files" position="top">
                  <label className="relative cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded min-w-[40px] min-h-[40px] flex items-center justify-center">
                    <Icon name="attach-file" size={20} />
                    <input type="file" multiple onChange={handleFileChange} className="sr-only" />
                  </label>
                </Tooltip>
              )}

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
                placeholder="Ask in any language..."
                style={{ minWidth: 0 }}
              />

              {/* Right column: top slot + bottom row */}
              <div className="flex flex-col items-center justify-between self-stretch py-0.5">
                {/* Top slot: waveform (recording) → expand btn (long text) → spacer */}
                {isListening ? (
                  <div className="flex items-center justify-center min-h-[24px]">
                    <Waveform />
                  </div>
                ) : showExpandBtn ? (
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

                {/* Bottom row: mic (hidden while recording) + send */}
                <div className="flex items-center">
                  {speechSupported && !isListening && (
                    <Tooltip content="Voice input" position="top">
                      <button
                        onClick={toggleListening}
                        type="button"
                        aria-label="Start voice input"
                        className="p-2 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      >
                        <Icon name="mic" size={26} />
                      </button>
                    </Tooltip>
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
