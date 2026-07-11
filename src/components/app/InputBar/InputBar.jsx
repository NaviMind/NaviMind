"use client";

import { useContext, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { UIContext } from "@/context/UIContext";
import { useCurrentUserDoc } from "@/hooks/useCurrentUserDoc";

import { auth } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { ChatContext } from "@/context/ChatContext";
import Tooltip from "@/components/common/Tooltip";
import FilePreview from "./FilePreview";
import { sendChatMessage } from "./sendChatMessage";
import {
  uploadFileToStorage,
  indexDocuments,
  expireIndexedFile,
  hashFile,
  withRetry,
} from "./attachmentProcessing";
import {
  getTopicData,
  getUserLibraryStoreId,
  setTopicVectorStoreId,
  setUserLibraryStoreId,
  getLibraryFiles,
} from "@/firebase/chatStore";
import Icon from "@/components/common/Icon";
import { Maximize2, Minimize2, Mic, Check, X, Upload } from "lucide-react";

const FILES_LIMIT = 5;
// Custom drag type: a file already in the chat can be dragged BACK into the input
// bar to re-use it without re-uploading. Must match MessageAttachments.jsx.
const REUSE_MIME = "application/x-navimind-reuse";
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
    <Tooltip content="Dictate" position="top" align="right">
      <button
        type="button"
        onClick={onClick}
        aria-label="Dictate"
        className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors
          text-gray-500 dark:text-gray-300
          hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white ${className}`}
      >
        <Mic size={19} strokeWidth={2} />
      </button>
    </Tooltip>
  );
}

// Cancel-recording button (✕) — discards the recording, back to initial state.
function CancelRecordButton({ onClick }) {
  return (
    <Tooltip content="Cancel dictation" position="top" align="left">
      <button
        type="button"
        onClick={onClick}
        aria-label="Cancel dictation"
        className="flex items-center justify-center w-10 h-10 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white transition-colors"
      >
        <X size={20} strokeWidth={2.2} />
      </button>
    </Tooltip>
  );
}

// Confirm-recording button (✓) — stops recording and transcribes.
function ConfirmRecordButton({ onClick }) {
  return (
    <Tooltip content="Finish dictation" position="top" align="right">
      <button
        type="button"
        onClick={onClick}
        aria-label="Finish dictation"
        className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
      >
        <Check size={19} strokeWidth={2.6} />
      </button>
    </Tooltip>
  );
}

// Live recording track: a real voice-memo style waveform that scrolls right→
// left. Each tick samples the current mic loudness and pushes a new bar on the
// right while older bars move left, so the track "runs" as you speak.
function LiveWaveform({ stream }) {
  const barsRef = useRef([]);
  const levelsRef = useRef([]);
  const rafRef = useRef(null);
  const N = 60;
  const SAMPLE_MS = 60; // how fast the track scrolls

  useEffect(() => {
    levelsRef.current = new Array(N).fill(0);
    if (!stream) return;

    let audioCtx, analyser, source, data;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
      audioCtx.resume?.();
      source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      data = new Uint8Array(analyser.fftSize);
    } catch {
      return;
    }

    let lastSample = 0;
    const tick = (now) => {
      rafRef.current = requestAnimationFrame(tick);
      if (now - lastSample < SAMPLE_MS) return;
      lastSample = now;

      // Current loudness from the time-domain signal (peak deviation from 128).
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i++) {
        const d = Math.abs(data[i] - 128) / 128;
        if (d > peak) peak = d;
      }

      const levels = levelsRef.current;
      levels.push(Math.min(peak * 1.7, 1)); // newest sample on the right
      if (levels.length > N) levels.shift();

      const bars = barsRef.current;
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        if (!bar) continue;
        bar.style.transform = `scaleY(${Math.max(levels[i] ?? 0, 0.05)})`;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      try { source.disconnect(); analyser.disconnect(); } catch { /* noop */ }
      try { audioCtx.close(); } catch { /* noop */ }
    };
  }, [stream]);

  return (
    <div className="flex-1 flex items-center gap-[2px] h-10 px-2 overflow-hidden">
      {Array.from({ length: N }).map((_, i) => (
        <span
          key={i}
          ref={(el) => (barsRef.current[i] = el)}
          className="flex-1 rounded-full bg-gray-700 dark:bg-white/90"
          style={{ height: "26px", transformOrigin: "center", transform: "scaleY(0.05)", transition: "transform 90ms linear" }}
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
      <Tooltip content="Stop answering" position="top" align="right">
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop answering"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          <span className="block w-3 h-3 rounded-[3px] bg-white" />
        </button>
      </Tooltip>
    );
  }
  return (
    <Tooltip content="Send" position="top" align="right">
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
    </Tooltip>
  );
}

export default function InputBar({ respondToPendingPrompt = true, dropTargetRef = null }) {
  const { isSidebarOpen, inputText, setInputText, pendingPrompt, setPendingPrompt, vesselProfileData } = useContext(UIContext);
  const { data: userDoc } = useCurrentUserDoc();

  const {
    projectChatSessions,
    activeChatId,
    activeProject,
    setProjectChatSessions,
    setActiveProject,
    setActiveChatId,
    setIsLoadingMessages,
    setStreamingMessage,
    clearStreamingMessage,
    setStreamingSteps,
    clearStreamingSteps,
    setPendingSend,
    generatingChatId,
    beginGeneration,
    endGeneration,
    stopGeneration,
    splitMode,
  } = useContext(ChatContext);

  const isGenerating =
    generatingChatId != null &&
    (generatingChatId === activeChatId || generatingChatId === true);

  const [inputValue, setInputValue] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fireErrorToast = (message) =>
    window.dispatchEvent(new CustomEvent("navimind-toast", { detail: { message, type: "error" } }));
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
  // Attachment processing (upload + index on attach):
  //  - filesRef mirrors uploadedFiles as an authoritative list (avoids stale
  //    closures while async processing patches entry status).
  //  - storeIdRef caches the scope's vector store id so concurrent batches don't
  //    each create a duplicate store.
  //  - indexChainRef serializes batches so a later one sees the store created by
  //    an earlier one, and so send can await all in-flight processing.
  const filesRef = useRef([]);
  const storeIdRef = useRef("");
  const indexChainRef = useRef(Promise.resolve());
  // Latest reuse handler, so the mount-once event/drop listeners never call a
  // stale closure (they capture fresh currentUser / topicId through this).
  const reuseRef = useRef(null);
  const inputRef = useRef(null);
  const expandedInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const focusAfterTranscribeRef = useRef(false);
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
    const el = inputRef.current;
    if (!el) return;
    // Empty → force a clean single-line height and hide the expand button
    // (mobile can report an inflated scrollHeight for an empty textarea).
    if (!inputValue.trim()) {
      el.style.height = "auto";
      setShowExpandBtn(false);
      return;
    }
    el.style.height = "auto";
    const scrollH = el.scrollHeight;
    el.style.height = `${Math.min(scrollH, 168)}px`;
    setShowExpandBtn(scrollH >= EXPAND_SCROLL_THRESHOLD);
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
    // A file already in the chat, dragged back in to be re-used.
    const hasReuse = (e) =>
      Array.from(e.dataTransfer?.types || []).includes(REUSE_MIME);
    const isDrag = (e) => hasFiles(e) || hasReuse(e);

    const onDragEnter = (e) => {
      if (!isDrag(e)) return;
      e.preventDefault();
      dragDepthRef.current += 1;
      setIsDragging(true);
    };
    const onDragOver = (e) => {
      if (isDrag(e)) e.preventDefault(); // allow drop
    };
    const onDragLeave = (e) => {
      if (!isDrag(e)) return;
      dragDepthRef.current -= 1;
      if (dragDepthRef.current <= 0) {
        dragDepthRef.current = 0;
        setIsDragging(false);
      }
    };
    const onDrop = (e) => {
      if (!isDrag(e)) return;
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);
      // Re-used in-chat file (no re-upload) takes priority over a raw file drop.
      const reuseRaw = e.dataTransfer?.getData(REUSE_MIME);
      if (reuseRaw) {
        try { reuseRef.current?.(JSON.parse(reuseRaw)); } catch { /* ignore */ }
        return;
      }
      const dropped = Array.from(e.dataTransfer?.files || []);
      if (dropped.length) addFiles(dropped);
    };

    // Scope file drops to this pane's element when provided (split screen), so a
    // file dropped on the right pane doesn't also load into the left, and vice
    // versa. Falls back to window (single pane).
    const target = dropTargetRef?.current || window;
    target.addEventListener("dragenter", onDragEnter);
    target.addEventListener("dragover", onDragOver);
    target.addEventListener("dragleave", onDragLeave);
    target.addEventListener("drop", onDrop);
    return () => {
      target.removeEventListener("dragenter", onDragEnter);
      target.removeEventListener("dragover", onDragOver);
      target.removeEventListener("dragleave", onDragLeave);
      target.removeEventListener("drop", onDrop);
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
        // Focus AFTER the transcribing indicator is gone (handled by the effect
        // below) so the textarea is mounted — otherwise Enter wouldn't send.
        focusAfterTranscribeRef.current = true;
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

  // After transcription finishes, focus the textarea so Enter sends right away.
  useEffect(() => {
    if (!isTranscribing && focusAfterTranscribeRef.current) {
      focusAfterTranscribeRef.current = false;
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isTranscribing]);

  // While recording: Enter finishes & transcribes, Escape cancels.
  useEffect(() => {
    if (!isListening) return;
    const onKey = (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirmRecording(); }
      else if (e.key === "Escape") { e.preventDefault(); cancelRecording(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  /* ───────── ATTACHMENT PROCESSING (upload + index on attach) ───────── */
  // The topic comes from this pane's workspace (context), not the URL — so a
  // second (pinned) pane targets its own chat's topic correctly.
  const topicId = activeProject && activeProject !== "global" ? activeProject : null;
  const inTopic = Boolean(topicId);

  // Reset the cached store id when the scope (topic vs global) changes.
  useEffect(() => {
    storeIdRef.current = "";
  }, [topicId]);

  // Keep filesRef and the rendered state in lockstep.
  const commitFiles = (next) => {
    filesRef.current = next;
    setUploadedFiles(next);
  };
  const patchEntry = (id, patch) => {
    commitFiles(filesRef.current.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  // Resolve the scope's vector store id (cache → Firestore). Created lazily by
  // the indexing call itself if none exists yet.
  const resolveStoreId = async (uid) => {
    if (storeIdRef.current) return storeIdRef.current;
    let id = "";
    try {
      id = inTopic
        ? (await getTopicData(uid, topicId))?.vectorStoreId || ""
        : await getUserLibraryStoreId(uid);
    } catch { /* silent */ }
    if (id) storeIdRef.current = id;
    return id;
  };

  // Process a freshly added batch: upload every file to Storage, then index the
  // documents into the scope's vector store. Runs inside indexChainRef so
  // batches are serialized (store created once) and send() can await everything.
  const processBatch = (entries) => {
    indexChainRef.current = indexChainRef.current
      .then(() => runBatch(entries))
      .catch(() => {});
    return indexChainRef.current;
  };

  const runBatch = async (entries) => {
    const uid = currentUser?.uid;
    if (!uid) {
      entries.forEach((e) => patchEntry(e.id, { status: "error" }));
      return;
    }

    // 0) Dedup by content hash — if an identical file already lives in this
    //    scope's library, reuse it (no re-upload, no re-index, no re-OCR).
    let priorByHash = new Map();
    try {
      const prior = await getLibraryFiles({ uid, topicId });
      priorByHash = new Map(prior.filter((f) => f.hash).map((f) => [f.hash, f]));
    } catch { /* silent */ }

    await Promise.all(
      entries.map(async (e) => {
        e.hash = await hashFile(e.file);
        const dup = e.hash && priorByHash.get(e.hash);
        if (dup?.openaiFileId) {
          e.url = dup.url;
          e.openaiFileId = dup.openaiFileId;
          e.vectorStoreId = dup.vectorStoreId;
          e.visualRequired = dup.visualRequired;
          e.reused = true;
          if (dup.vectorStoreId) storeIdRef.current = dup.vectorStoreId;
          patchEntry(e.id, {
            url: dup.url,
            openaiFileId: dup.openaiFileId,
            vectorStoreId: dup.vectorStoreId,
            visualRequired: dup.visualRequired,
            status: "ready",
            reused: true,
            progress: 100,
          });
        }
      })
    );

    // 1) Upload the rest to Storage (with retry on transient failures).
    const fresh = entries.filter((e) => !e.reused);
    await Promise.all(
      fresh.map(async (e) => {
        // Already uploaded (e.g. retry after an indexing failure) → skip upload.
        if (e.url) {
          patchEntry(e.id, { status: "indexing", progress: 100 });
          return;
        }
        try {
          const meta = await withRetry(() =>
            uploadFileToStorage({
              uid,
              file: e.file,
              onProgress: (percent) =>
                patchEntry(e.id, { status: "uploading", progress: percent }),
            })
          );
          e.url = meta.url;
          e.path = meta.path;
          // Upload done → indexing phase (no measurable %, indeterminate).
          patchEntry(e.id, { url: meta.url, path: meta.path, status: "indexing", progress: 100 });
        } catch {
          e.failed = true;
          patchEntry(e.id, { status: "error" });
        }
      })
    );

    // 2) Index the batch (docs + images) in one call (with retry).
    const items = fresh.filter((e) => !e.failed && e.url);
    if (items.length === 0) return;

    const storeId = await resolveStoreId(uid);
    try {
      const data = await withRetry(() =>
        indexDocuments({
          vectorStoreId: storeId,
          label: inTopic ? `Topic ${topicId}` : `Library ${uid}`,
          docs: items,
        })
      );

      const newStoreId = data?.vectorStoreId || storeId;
      if (newStoreId) {
        if (newStoreId !== storeId) {
          if (inTopic) await setTopicVectorStoreId(uid, topicId, newStoreId);
          else await setUserLibraryStoreId(uid, newStoreId);
        }
        storeIdRef.current = newStoreId;
      }

      // Results come back in the same order as `items`.
      const out = Array.isArray(data?.files) ? data.files : [];
      items.forEach((d, i) => {
        const r = out[i];
        if (r?.status === "indexed") {
          // Text extracted (doc, scanned-PDF OCR, or text-bearing image).
          d.openaiFileId = r.openaiFileId;
          d.vectorStoreId = newStoreId;
          d.visualRequired = r.visualRequired; // undefined for non-images
          patchEntry(d.id, {
            status: "ready",
            openaiFileId: r.openaiFileId,
            vectorStoreId: newStoreId,
            visualRequired: r.visualRequired,
          });
        } else if (r?.status === "skipped:visual") {
          // Purely-visual image: not indexed, answered via vision at query time.
          d.visualRequired = true;
          patchEntry(d.id, { status: "ready", visualRequired: true });
        } else if (r?.status?.startsWith("skipped")) {
          patchEntry(d.id, { status: "unsupported" });
        } else {
          patchEntry(d.id, { status: "error" });
        }
      });
    } catch {
      items.forEach((d) => patchEntry(d.id, { status: "error" }));
    }
  };

  // Manual retry for a file whose processing failed (instead of a silent fail).
  const retryEntry = (id) => {
    const entry = filesRef.current.find((e) => e.id === id);
    if (!entry?.file) return;
    entry.failed = false;
    entry.reused = false;
    patchEntry(id, { status: entry.url ? "indexing" : "uploading", progress: entry.url ? 100 : 0 });
    processBatch([entry]);
  };

  /* ───────── HANDLERS ───────── */
  // override — необязательный текст для прямой отправки (клик по followup).
  // Когда вызывается как onClick кнопки, override приходит как событие — поэтому
  // проверяем именно строку.
  const handleSend = async (override) => {
    const isOverride = typeof override === "string" && override.trim().length > 0;
    const message = isOverride ? override.trim() : inputValue;
    // Allow sending with just attachments (no text).
    const hasFiles = !isOverride && filesRef.current.length > 0;
    if (!message.trim() && !hasFiles) return;
    if (!currentUser?.uid) return;

    let preparedAttachments = [];
    if (!isOverride) {
      setInputValue("");
      setIsActive(false);
      setIsExpanded(false);
      setShowExpandBtn(false);
      setIsListening(false);

      // Wait for any in-flight attachment processing (upload + index) to finish.
      // Usually already done — it ran in the background while the user typed —
      // so this resolves instantly. The file previews stay visible (with their
      // status) until processing completes, then we clear them.
      await indexChainRef.current;
      preparedAttachments = filesRef.current;
      commitFiles([]);
    }

    await sendChatMessage({
      message,
      attachments: preparedAttachments,
      currentUser,
      activeChatId,
      topicIdFromURL: topicId,
      projectChatSessions,
      setProjectChatSessions,
      setActiveProject,
      setActiveChatId,
      setIsLoadingMessages,
      setStreamingMessage,
      clearStreamingMessage,
      setStreamingSteps,
      clearStreamingSteps,
      setPendingSend,
      beginGeneration,
      endGeneration,
      vesselProfile: vesselProfileData || null,
      memorySettings: userDoc?.memorySettings ?? {},
      globalChatMemory: userDoc?.globalChatMemory ?? "",
      plan: userDoc?.plan || "free",
    });
  };

  /* ───────── SEND-NOW FROM FOLLOWUP CLICK ───────── */
  useEffect(() => {
    if (!respondToPendingPrompt) return; // pinned pane ignores followup prompts
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

    const stamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace(/[:T]/g, "-");
    const file = new File([text], `pasted-message-${stamp}.txt`, {
      type: "text/plain",
    });

    addFiles([file]);
  };

  // Shared validation/add used by both the file picker and drag-and-drop.
  // Valid files are wrapped in status-tracking entries and immediately start
  // uploading + indexing in the background (processed on attach).
  // Re-attach a file that's ALREADY in the chat (dropped/clicked back from a
  // message) — reusing its Storage upload and its OpenAI index, so there is no
  // re-upload and no re-OCR. It goes straight to "ready".
  const reuseAttachment = async (meta) => {
    if (!meta?.url) return;
    if (filesRef.current.length + 1 > FILES_LIMIT) {
      fireErrorToast(`You can attach up to ${FILES_LIMIT} files`);
      return;
    }
    // Don't add the same file twice if it's already pending in the bar.
    if (filesRef.current.some((e) => e.url && e.url === meta.url)) return;

    const isImage = (meta.type || "").startsWith("image/");
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry = {
      id,
      file: null,
      name: meta.name,
      type: meta.type,
      isImage,
      status: "ready",
      progress: 100,
      url: meta.url,
      path: meta.path || "",
      openaiFileId: meta.openaiFileId || null,
      vectorStoreId: meta.vectorStoreId || "",
      visualRequired: meta.visualRequired,
      hash: meta.hash || "",
      reused: true,
    };
    commitFiles([...filesRef.current, entry]);

    // Older messages saved before we persisted the index id: recover it from the
    // library records by URL so a re-used DOCUMENT stays searchable without re-OCR.
    if (!entry.openaiFileId && !isImage) {
      try {
        const prior = await getLibraryFiles({ uid: currentUser?.uid, topicId });
        const rec =
          prior.find((f) => f.url && f.url === meta.url) ||
          prior.find((f) => f.name === meta.name);
        if (rec?.openaiFileId) {
          patchEntry(id, {
            openaiFileId: rec.openaiFileId,
            vectorStoreId: rec.vectorStoreId || "",
            visualRequired: rec.visualRequired,
            hash: rec.hash || entry.hash,
          });
        }
      } catch { /* still attached & openable, just not re-searchable */ }
    }
  };

  reuseRef.current = reuseAttachment;

  // "Use again" from a message attachment (click) dispatches this event.
  useEffect(() => {
    const onReuse = (e) => reuseRef.current?.(e.detail);
    window.addEventListener("navimind-reuse-attachment", onReuse);
    return () => window.removeEventListener("navimind-reuse-attachment", onReuse);
  }, []);

  const addFiles = (files) => {
    if (!files?.length) return;

    if (filesRef.current.length + files.length > FILES_LIMIT) {
      fireErrorToast(`You can upload up to ${FILES_LIMIT} files`);
      return;
    }

    let totalSize = filesRef.current.reduce((acc, e) => acc + (e.file?.size || 0), 0);
    const validFiles = [];

    for (const file of files) {
      const isImage = file.type.startsWith("image/");

      if (isImage && file.size > MAX_IMAGE_SIZE) {
        fireErrorToast(`Image "${file.name}" exceeds 15MB limit`);
        continue;
      }

      if (!isImage && file.size > MAX_DOCUMENT_SIZE) {
        fireErrorToast(`File "${file.name}" exceeds 30MB limit`);
        continue;
      }

      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        fireErrorToast(`Total upload limit is 100MB`);
        break;
      }

      totalSize += file.size;
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const entries = validFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      name: file.name,
      type: file.type,
      isImage: file.type.startsWith("image/"),
      status: "uploading",
      progress: 0,
      url: "",
      path: "",
      openaiFileId: null,
      vectorStoreId: "",
    }));

    commitFiles([...filesRef.current, ...entries]);
    processBatch(entries);
  };

  const handleFileChange = (e) => {
    addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeFile = (id) => {
    const entry = filesRef.current.find((e) => e.id === id);
    commitFiles(filesRef.current.filter((e) => e.id !== id));
    // If THIS bar indexed it, detach + delete it from OpenAI so removing a file
    // before sending doesn't leave an orphan. But NEVER expire a re-used/deduped
    // entry: its index is shared with an earlier message, and deleting it would
    // break that message's file search.
    if (entry?.openaiFileId && !entry.reused) {
      expireIndexedFile({
        vectorStoreId: entry.vectorStoreId,
        openaiFileId: entry.openaiFileId,
      });
    }
  };

  /* ───────── RENDER ───────── */
  return (
    <>
      {/* ── Drag & drop overlay (desktop) — scoped to this pane's element so a
            file dragged over one split shows the drop UI only there. ── */}
      {isDragging && !isMobile && (() => {
        const overlay = (
          <div className={`${dropTargetRef?.current ? "absolute" : "fixed"} inset-0 z-[300] pointer-events-none flex items-center justify-center bg-blue-950/30 backdrop-blur-[3px]`}>
            <div className="m-6 px-12 py-10 rounded-3xl border-2 border-dashed border-blue-400/70 bg-white/95 dark:bg-gray-900/90 shadow-2xl ring-1 ring-blue-500/10 flex flex-col items-center gap-4 text-center animate-fade-in">
              <span className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-500 dark:text-blue-300">
                <Upload size={30} strokeWidth={2} />
              </span>
              <div>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  Drop files to attach
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Up to {FILES_LIMIT} files · 30&nbsp;MB each
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[260px]">
                {["Images", "PDF", "Word", "Excel", "Text"].map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
        return dropTargetRef?.current ? createPortal(overlay, dropTargetRef.current) : overlay;
      })()}

      {/* ── Expanded fullscreen editor (mobile only) ── */}
      {isExpanded && (
        <div className="fixed inset-0 z-[200] flex flex-col md:hidden bg-white dark:bg-[#0b1220]">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
            <button
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition py-1 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
              type="button"
              aria-label="Collapse editor"
            >
              <Minimize2 size={18} />
            </button>

            {/* Center: char count */}
            <div className="flex items-center justify-center min-w-[60px]">
              <span className="text-xs text-gray-500 select-none">
                {inputValue.length > 0 ? `${inputValue.length} chars` : ""}
              </span>
            </div>

            {/* Right: send only — the expanded view is for editing, not dictation */}
            <SendStopButton
              generating={isGenerating}
              onSend={handleSend}
              onStop={stopGeneration}
              disabled={!inputValue.trim() && uploadedFiles.length === 0}
            />
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
            className={`relative rounded-2xl p-1 md:p-2 flex flex-col transition duration-500
              border border-gray-200 dark:border-white/10
              shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_6px_rgba(0,0,0,0.4)]
              bg-white dark:bg-transparent
              backdrop-blur-sm
              ${isActive ? "border-blue-400 dark:border-blue-500 animate-glow" : ""}`}
          >
            {/* Expand editor (mobile, long text) — top-right corner */}
            {!isListening && !isTranscribing && showExpandBtn && (
              <button
                onClick={() => setIsExpanded(true)}
                className="md:hidden absolute top-1.5 right-2 z-10 p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition flex items-center justify-center"
                type="button"
                aria-label="Expand editor"
              >
                <Maximize2 size={15} />
              </button>
            )}

            {/* Uploaded Files Preview */}
            <FilePreview files={uploadedFiles} onRemove={removeFile} onRetry={retryEntry} />

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
                    <Tooltip content="Send" position="top" align="right">
                      <SendStopButton
                        onSend={handleSend}
                        disabled={!inputValue.trim() && uploadedFiles.length === 0}
                      />
                    </Tooltip>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Footer — desktop only. Hidden in split mode: a single shared footer is
          rendered once, centered under both panes (see AppShell). */}
      <div className={`w-full px-1 sm:px-4 pb-2 max-w-full overflow-x-hidden ${splitMode ? "hidden" : "hidden md:block"}`}>
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
