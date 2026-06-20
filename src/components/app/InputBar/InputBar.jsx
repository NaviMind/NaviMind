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
import { Maximize2, Minimize2, Mic, Check, X } from "lucide-react";

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

// Clean round mic button to start voice input.
function MicButton({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Voice input"
      className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors
        text-gray-500 dark:text-gray-300
        hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white ${className}`}
    >
      <Mic size={19} strokeWidth={2} />
    </button>
  );
}

// Cancel-recording button (✕) — discards the recording, back to initial state.
function CancelRecordButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cancel recording"
      className="flex items-center justify-center w-10 h-10 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white transition-colors"
    >
      <X size={20} strokeWidth={2.2} />
    </button>
  );
}

// Confirm-recording button (✓) — stops recording and transcribes.
function ConfirmRecordButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Confirm voice input"
      className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
    >
      <Check size={19} strokeWidth={2.6} />
    </button>
  );
}

// Live voice indicator: neutral bars that react to the mic input level.
function LiveWaveform({ stream }) {
  const barsRef = useRef([]);
  const rafRef = useRef(null);
  const N = 48;

  useEffect(() => {
    if (!stream) return;
    let audioCtx, analyser, source, data;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
      audioCtx.resume?.();
      source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      data = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      return;
    }

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const bars = barsRef.current;
      const bins = data.length;
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        if (!bar) continue;
        const v = (data[Math.floor((i / bars.length) * bins)] || 0) / 255;
        const scale = Math.min(0.12 + v * 1.4, 1);
        bar.style.transform = `scaleY(${scale})`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(rafRef.current);
      try { source.disconnect(); analyser.disconnect(); } catch { /* noop */ }
      try { audioCtx.close(); } catch { /* noop */ }
    };
  }, [stream]);

  return (
    <div className="flex-1 flex items-center justify-between gap-[2px] h-10 px-2 overflow-hidden">
      {Array.from({ length: N }).map((_, i) => (
        <span
          key={i}
          ref={(el) => (barsRef.current[i] = el)}
          className="flex-1 rounded-full bg-gray-400 dark:bg-gray-400/80"
          style={{ height: "22px", transformOrigin: "center", transform: "scaleY(0.12)", transition: "transform 60ms linear" }}
        />
      ))}
    </div>
  );
}

// Small spinner shown while the recorded audio is being transcribed.
function TranscribingBtn() {
  return (
    <div className="p-2 flex items-center justify-center" aria-label="Transcribing">
      <span className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-white/20 border-t-blue-500 dark:border-t-blue-400 animate-spin" />
    </div>
  );
}

// Round Send button that lights up blue on hover; while the assistant is
// generating it turns into a solid-blue Stop button that aborts generation.
function SendStopButton({ generating, onSend, onStop, disabled }) {
  if (generating) {
    return (
      <button
        type="button"
        onClick={onStop}
        aria-label="Stop generating"
        className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
      >
        <span className="block w-3 h-3 rounded-[3px] bg-white" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onSend}
      disabled={disabled}
      aria-label="Send"
      className={`flex items-center justify-center w-9 h-9 rounded-full text-white transition-colors
        ${disabled
          ? "bg-blue-600/40 dark:bg-blue-500/40 cursor-default"
          : "bg-blue-600 hover:bg-blue-500"}`}
    >
      <Icon name="arrow-send" size={18} />
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
    setStreamingMessage,
    clearStreamingMessage,
    setPendingSend,
    generatingChatId,
    beginGeneration,
    endGeneration,
    stopGeneration,
  } = useContext(ChatContext);

  const isGenerating =
    generatingChatId != null &&
    (generatingChatId === activeChatId || generatingChatId === true);

  const [inputValue, setInputValue] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileAlert, setFileAlert] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExpandBtn, setShowExpandBtn] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingStream, setRecordingStream] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragDepthRef = useRef(0);
  const inputRef = useRef(null);
  const expandedInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const cancelledRef = useRef(false);
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

  /* ───────── VOICE INPUT SUPPORT CHECK (mic recording) ───────── */
  useEffect(() => {
    setSpeechSupported(
      typeof window !== "undefined" &&
      !!navigator?.mediaDevices?.getUserMedia &&
      typeof window.MediaRecorder !== "undefined"
    );
  }, []);

  /* ───────── STOP MIC ON UNMOUNT ───────── */
  useEffect(() => {
    return () => {
      try {
        mediaRecorderRef.current?.state !== "inactive" && mediaRecorderRef.current?.stop();
      } catch { /* noop */ }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
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

  /* ───────── VOICE INPUT (OpenAI transcription) ───────── */
  // Records mic audio, then sends it to /api/transcribe (OpenAI) and inserts the
  // returned text into the input — replaces the browser's Web Speech API.
  const startRecording = async () => {
    if (isTranscribing || isListening) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      cancelledRef.current = false;

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = handleRecordingStop;
      mediaRecorderRef.current = recorder;

      speechBaseRef.current = inputValue;
      recorder.start();
      setRecordingStream(stream);
      setIsListening(true);
    } catch (err) {
      // Permission denied / no mic — just reset.
      setIsListening(false);
      setRecordingStream(null);
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  // Confirm (✓): stop recording and transcribe.
  const confirmRecording = () => {
    cancelledRef.current = false;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    setIsListening(false);
    setRecordingStream(null);
  };

  // Cancel (✕): discard the recording and return to the initial state.
  const cancelRecording = () => {
    cancelledRef.current = true;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    setIsListening(false);
    setRecordingStream(null);
  };

  const handleRecordingStop = async () => {
    // Release the mic.
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;

    const chunks = audioChunksRef.current;
    audioChunksRef.current = [];
    const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
    mediaRecorderRef.current = null;

    // Cancelled → drop everything, no transcription.
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }

    if (!chunks.length) return;
    const blob = new Blob(chunks, { type: mimeType });
    if (blob.size === 0) return;

    setIsTranscribing(true);
    try {
      const ext = mimeType.includes("mp4") || mimeType.includes("mpeg") ? "mp4" : "webm";
      const fd = new FormData();
      fd.append("file", blob, `audio.${ext}`);

      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      const text = (data?.text || "").trim();

      if (text) {
        const base = speechBaseRef.current;
        const sep = base && !base.endsWith(" ") && !base.endsWith("\n") ? " " : "";
        const next = base + sep + text;
        setInputValue(next);
        speechBaseRef.current = next;
        setIsActive(true);
        inputRef.current?.focus();
      }
    } catch (err) {
      /* silent */
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) confirmRecording();
    else startRecording();
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
      setStreamingMessage,
      clearStreamingMessage,
      setPendingSend,
      beginGeneration,
      endGeneration,
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

  // Handles two special paste cases:
  //  1) Screenshots / images from the clipboard (Ctrl+V or right-click → Paste)
  //     are attached as image files — no need to save them first.
  //  2) Very long text pastes become a .txt attachment so the input stays clean.
  const handlePaste = (e) => {
    const cd = e.clipboardData;
    if (!cd) return;

    // ── 1) Image / screenshot paste ──
    const pastedImages = [];
    for (const item of Array.from(cd.items || [])) {
      if (item.kind === "file" && item.type?.startsWith("image/")) {
        const blob = item.getAsFile();
        if (blob) pastedImages.push(blob);
      }
    }

    if (pastedImages.length > 0) {
      e.preventDefault();
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const named = pastedImages.map((blob, i) => {
        const ext = (blob.type.split("/")[1] || "png").split("+")[0];
        // Clipboard screenshots usually arrive unnamed or as "image.png";
        // give them a unique, recognizable name so previews/uploads stay clean.
        const hasRealName = blob.name && blob.name !== "image.png";
        const name = hasRealName
          ? blob.name
          : `screenshot-${stamp}${pastedImages.length > 1 ? `-${i + 1}` : ""}.${ext}`;
        return new File([blob], name, { type: blob.type });
      });
      addFiles(named);
      return;
    }

    // ── 2) Long text paste → .txt attachment ──
    const text = cd.getData("text") ?? "";
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
                isTranscribing ? (
                  <TranscribingBtn />
                ) : isListening ? (
                  <StopBtn onClick={toggleListening} />
                ) : (
                  <MicButton onClick={toggleListening} />
                )
              )}
              <SendStopButton
                generating={isGenerating}
                onSend={handleSend}
                onStop={stopGeneration}
                disabled={!inputValue.trim()}
              />
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
              {/* Left: cancel-recording while recording, else 📎 attach */}
              {isListening ? (
                <CancelRecordButton onClick={cancelRecording} />
              ) : (
                <Tooltip content="Add photos & files" position="top">
                  <label className="relative cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
                    <Icon name="attach-file" size={20} />
                    <input type="file" multiple onChange={handleFileChange} className="sr-only" />
                  </label>
                </Tooltip>
              )}

              {/* Middle: live voice waveform while recording, else textarea */}
              {isListening ? (
                <LiveWaveform stream={recordingStream} />
              ) : (
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
              )}

              {/* Right cluster: mic (default) → mic + send (typed) → stop/spinner */}
              <div className="flex items-end gap-1 self-end pb-0.5">
                {/* Expand editor (mobile, long text) */}
                {!isListening && !isTranscribing && showExpandBtn && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="md:hidden p-1.5 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition flex items-center justify-center"
                    type="button"
                    aria-label="Expand editor"
                  >
                    <Maximize2 size={15} />
                  </button>
                )}

                {isGenerating ? (
                  <Tooltip content="Stop" position="top" align="right">
                    <SendStopButton generating onStop={stopGeneration} />
                  </Tooltip>
                ) : isListening ? (
                  <ConfirmRecordButton onClick={confirmRecording} />
                ) : isTranscribing ? (
                  <TranscribingBtn />
                ) : (
                  <>
                    {speechSupported && (
                      <Tooltip content="Voice input" position="top" align="right">
                        <MicButton onClick={startRecording} />
                      </Tooltip>
                    )}
                    {inputValue.trim() && (
                      <Tooltip content="Send" position="top" align="right">
                        <SendStopButton onSend={handleSend} disabled={false} />
                      </Tooltip>
                    )}
                  </>
                )}
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
