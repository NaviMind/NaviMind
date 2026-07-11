"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, Trash2, FileText, Loader2, AlertCircle, RefreshCw, Download } from "lucide-react";
import { UIContext } from "@/context/UIContext";
import { ChatContext } from "@/context/ChatContext";
import Tooltip from "@/components/common/Tooltip";
import MaskIcon from "@/components/common/MaskIcon";
import Icon from "@/components/common/Icon";
import InventoryIcon from "./InventoryIcon";
import { getViewerSrc, getFileUrl } from "@/components/app/MessageAttachments";
import { auth, storage } from "@/firebase/config";
import { ref as storageRef, deleteObject } from "firebase/storage";
import {
  uploadFileToStorage,
  indexDocuments,
  indexTextSnippet,
  hashFile,
  expireIndexedFile,
} from "@/components/app/InputBar/attachmentProcessing";
import {
  getUserDrawingsStoreId,
  setUserDrawingsStoreId,
  getDrawingFiles,
  addDrawingFileRecords,
  updateDrawingFileRecord,
  deleteDrawingFileRecordsByIds,
  getDrawingFolders,
  addDrawingFolder,
  deleteDrawingFolder,
  getAccountStorageUsage,
} from "@/firebase/chatStore";
import { useCurrentUserDoc } from "@/hooks/useCurrentUserDoc";
import { storageLimitFor, formatBytes } from "@/lib/planLimits";

const rid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const DRAWING_TYPE_COLORS = {
  "GA Plan":          "bg-blue-100   dark:bg-blue-500/20   text-blue-600   dark:text-blue-300",
  "Fire Plan":        "bg-red-100    dark:bg-red-500/20    text-red-600    dark:text-red-300",
  "Escape Routes":    "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300",
  "Tank Plan":        "bg-teal-100   dark:bg-teal-500/20   text-teal-600   dark:text-teal-300",
  "Engine Room":      "bg-slate-100  dark:bg-slate-500/20  text-slate-600  dark:text-slate-300",
  "Cargo Plan":       "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300",
  "Electrical":       "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-300",
  "Piping":           "bg-cyan-100   dark:bg-cyan-500/20   text-cyan-600   dark:text-cyan-300",
  "Stability":        "bg-green-100  dark:bg-green-500/20  text-green-600  dark:text-green-300",
  "Safety Equipment": "bg-pink-100   dark:bg-pink-500/20   text-pink-600   dark:text-pink-300",
  "Manual":           "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300",
};

// Drawing types whose VALUE is the visual layout — worth the (heavier) tiled
// spatial read. Manuals/Other are text and handled by LlamaParse instead.
const VISUAL_DRAWING_TYPES = new Set([
  "GA Plan", "Fire Plan", "Escape Routes", "Tank Plan", "Engine Room",
  "Cargo Plan", "Electrical", "Piping", "Stability", "Safety Equipment",
]);

// ── PDF rendering helpers ─────────────────────────────────────────────────────
// pdfjs-dist is loaded lazily so it doesn't bloat the initial bundle.
let _pdfJs = null;
async function loadPdfJs() {
  if (!_pdfJs) {
    const lib = await import("pdfjs-dist");
    lib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    _pdfJs = lib;
  }
  return _pdfJs;
}

function isPdf(file) {
  return file?.type === "application/pdf" || /\.pdf$/i.test(file?.name || "");
}

function isVisualFile(file) {
  return (
    isPdf(file) ||
    /^image\//.test(file?.type || "") ||
    /\.(png|jpe?g|webp|tiff?|bmp)$/i.test(file?.name || "")
  );
}

// Native CAD formats — OpenAI can't read these. The user must export to PDF/PNG.
function isCadFile(file) {
  return /\.(dwg|dxf)$/i.test(file?.name || "");
}

// ── Vision-analysis queue (cost guard) ───────────────────────────────────────
// Each analysis triggers up to 8 gpt-4o vision calls. Without a cap, uploading
// 20 files at once would fire 20 analyses in parallel — a sudden, expensive
// burst. This queue runs at most ANALYZE_CONCURRENCY analyses at a time; the
// rest wait their turn. Module-level so it persists across re-renders and is
// shared by every upload batch.
const ANALYZE_CONCURRENCY = 2;
let _activeAnalyses = 0;
const _analyzeQueue = [];

function _drainAnalyzeQueue() {
  while (_activeAnalyses < ANALYZE_CONCURRENCY && _analyzeQueue.length) {
    const job = _analyzeQueue.shift();
    _activeAnalyses++;
    Promise.resolve()
      .then(job)
      .catch(() => {})
      .finally(() => {
        _activeAnalyses--;
        _drainAnalyzeQueue();
      });
  }
}

// Schedule an async job; resolves with the job's result once it actually runs.
function enqueueAnalysis(job) {
  return new Promise((resolve) => {
    _analyzeQueue.push(() => Promise.resolve().then(job).then(resolve));
    _drainAnalyzeQueue();
  });
}

// Analyse a drawing's pages in small batches so each /api/drawings/analyze call
// stays fast and well under the serverless timeout — no matter how many pages
// the document has. We process the WHOLE drawing (no page cap); batching is what
// makes that safe. Returns merged { pages: [...], drawingType }.
const ANALYZE_BATCH_SIZE = 5;
async function analyzeAllPages(inputPages, fileName) {
  const batches = [];
  for (let i = 0; i < inputPages.length; i += ANALYZE_BATCH_SIZE) {
    batches.push(inputPages.slice(i, i + ANALYZE_BATCH_SIZE));
  }
  const allPages = [];
  let drawingType = null;
  for (let b = 0; b < batches.length; b++) {
    // Classify only on the first batch — page 1 (the title/legend) lives there,
    // so running the classifier on later batches would just waste calls.
    const classify = b === 0;
    const res = await fetch("/api/drawings/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pages: batches[b], fileName, classify }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    if (Array.isArray(res?.pages)) allPages.push(...res.pages);
    if (res?.drawingType && !drawingType) drawingType = res.drawingType;
  }
  return { pages: allPages, drawingType };
}

// Parse a file with LlamaParse: start the job, then poll client-side until it
// finishes (no serverless time limit this way — large docs can take minutes).
// Returns the parsed markdown text, or "" if unavailable (caller falls back).
async function parseWithLlama(url, name) {
  const post = (payload) =>
    fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r.json());

  const start = await post({ url, name }).catch(() => null);
  if (!start?.ok) return ""; // no key / failed → fallback
  if (start.markdown) return start.markdown; // (defensive: immediate result)
  if (!start.jobId) return "";

  const deadline = Date.now() + 4 * 60 * 1000; // up to 4 minutes
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4000));
    const poll = await post({ jobId: start.jobId }).catch(() => null);
    if (!poll) continue;
    if (poll.status === "SUCCESS") return poll.markdown || "";
    if (poll.status === "ERROR" || poll.ok === false) return "";
  }
  return ""; // timed out → fallback
}

// Renders the pages of a PDF that actually need VISION to JPEG blobs.
//
// Drawings vs manuals: a drawing/schematic is sparse text + heavy graphics and
// must be read visually; a manual page is dense prose that File Search already
// indexes from the original PDF — running vision on it would be pure wasted cost.
// So we measure each page's text density and only render (→ vision) the visual
// pages. Page 1 is always rendered: it drives type classification and is cheap.
//
// Bias is toward rendering: a drawing with many labels still falls under the
// threshold, and a false "render" only costs money, while a false "skip" would
// lose a schematic — the whole point. We render the WHOLE document (high page
// backstop guards only against a pathological PDF).
const MAX_PDF_PAGES = 100;
const TEXT_PAGE_CHAR_THRESHOLD = 1200; // above this much text → manual page → File Search only
const TARGET_LONG_EDGE_PX = 2048;      // render size matched to what Vision "high" detail uses

async function renderPdfPages(file) {
  const pdfJs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfJs.getDocument({ data: buffer }).promise;
  const count = Math.min(pdf.numPages, MAX_PDF_PAGES);
  const rendered = []; // [{ pageNum, blob }]
  for (let n = 1; n <= count; n++) {
    const page = await pdf.getPage(n);

    // Text density — a manual page is dense prose, a drawing has sparse labels.
    let textLen = 0;
    try {
      const tc = await page.getTextContent();
      textLen = tc.items.reduce((s, it) => s + (it.str?.length || 0), 0);
    } catch { textLen = 0; }

    // Skip vision for text-heavy pages (page 1 always rendered for classification).
    if (n > 1 && textLen >= TEXT_PAGE_CHAR_THRESHOLD) continue;

    // Right-size the render to what Vision actually uses (~2048px on the long
    // side for "high" detail). Rendering bigger just produces huge images the
    // model downscales anyway — wasted upload bytes, slow on ship internet.
    // Never upscale beyond 2× the native page size.
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2.0, TARGET_LONG_EDGE_PX / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale: Math.max(scale, 0.1) });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    // Fill white FIRST. pdf.js renders on a transparent canvas; scanned pages
    // (B&W image masks) and transparent-background PDFs otherwise flatten to a
    // blank/black JPEG. A white base guarantees the page content is visible.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, background: "#ffffff" }).promise;
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    rendered.push({ pageNum: n, blob });
  }
  return rendered;
}

// Storage is one account-wide pool (see getAccountStorageUsage + planLimits);
// the panel reads the account total/limit rather than enforcing a per-area cap.

export default function DrawingRegisterPanel() {
  const { isDrawingRegisterOpen, setDrawingRegisterOpen } = useContext(UIContext);
  const { splitMode } = useContext(ChatContext);
  const { data: userDoc } = useCurrentUserDoc();
  const storageLimit = storageLimitFor(userDoc?.plan || "free");

  // Account-wide bytes already in use (fetched on open, refreshed after uploads).
  const [accountUsed, setAccountUsed] = useState(0);
  const refreshUsage = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const u = await getAccountStorageUsage(uid).catch(() => null);
    if (u) setAccountUsed(u.total);
  };

  const [portalTarget, setPortalTarget] = useState(null);
  const [open, setOpen] = useState(false);

  // Firestore-backed state
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [pending, setPending] = useState([]); // in-flight uploads: { tempId, name, size, folderId, status, progress, error }
  const [loading, setLoading] = useState(false);

  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [quotaError, setQuotaError] = useState("");
  const [analyzingIds, setAnalyzingIds] = useState(new Set());
  const [activeDoc, setActiveDoc] = useState(null); // { name, url, src, isImage }

  const folderInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const storeIdRef = useRef(""); // the user's drawings vector store id

  // Batch progress tracking — lets the user leave the panel while drawings
  // process in the background and get a toast when the whole batch is ready.
  const batchInFlightRef = useRef(0); // files still uploading/indexing/analysing
  const batchReadyRef = useRef(0);    // successfully finished in the current batch
  const batchActiveRef = useRef(false);

  // Fire a global toast (mounted in the app layout; survives navigation).
  const fireToast = (message, type = "success") => {
    window.dispatchEvent(new CustomEvent("navimind-toast", { detail: { message, type } }));
  };

  // Called exactly once per file when its full lifecycle ends (ready or failed).
  // When the whole batch drains, announce how many drawings became usable.
  const markFileWorkDone = (success) => {
    if (success) batchReadyRef.current += 1;
    batchInFlightRef.current = Math.max(0, batchInFlightRef.current - 1);
    if (batchInFlightRef.current === 0 && batchActiveRef.current) {
      batchActiveRef.current = false;
      const n = batchReadyRef.current;
      batchReadyRef.current = 0;
      if (n > 0) {
        fireToast(
          n === 1
            ? "Your file is processed and ready to use."
            : `Your ${n} files are processed and ready to use.`
        );
      }
    }
  };

  // Sync local open state with the context flag in both directions.
  useEffect(() => {
    if (isDrawingRegisterOpen) setOpen(true);
    else setOpen(false);
  }, [isDrawingRegisterOpen]);

  const close = () => setOpen(false);

  // Open a drawing in the in-app viewer (stays inside the work area, doesn't
  // navigate away). Images render directly; PDFs/Office go through the iframe viewer.
  const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp)$/i;
  const openDoc = (file) => {
    const url = getFileUrl(file);
    if (!url) return;
    const isImage =
      file.type?.startsWith("image/") || IMAGE_EXT_RE.test(file.name || "");
    // TIFF can't be shown natively; fall back to its first rendered page if present.
    if (/\.tiff?$/i.test(file.name || "") && file.pages?.[0]?.url) {
      setActiveDoc({ name: file.name, url, src: file.pages[0].url, isImage: true });
      return;
    }
    setActiveDoc({
      name: file.name,
      url,
      src: isImage ? url : getViewerSrc(file),
      isImage,
    });
  };

  // Load folders + files from Firestore each time the panel opens.
  useEffect(() => {
    if (!isDrawingRegisterOpen) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [sid, fl, fo, usage] = await Promise.all([
        getUserDrawingsStoreId(uid).catch(() => ""),
        getDrawingFolders(uid).catch(() => []),
        getDrawingFiles(uid).catch(() => []),
        getAccountStorageUsage(uid).catch(() => null),
      ]);
      if (cancelled) return;
      storeIdRef.current = sid || "";
      setFolders(fl);
      setFiles(fo);
      if (usage) setAccountUsed(usage.total);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isDrawingRegisterOpen]);

  // Desktop: overlay the work area (sidebar stays visible). Mobile: work area is
  // transformed off-screen with the sidebar, so portal to <body>.
  useEffect(() => {
    const desktop = window.matchMedia?.("(hover: hover)").matches;
    setPortalTarget(
      desktop ? (document.getElementById("nm-workarea") || document.body) : document.body
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      // Escape closes the viewer first (if open), otherwise the panel.
      if (activeDoc) setActiveDoc(null);
      else close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, activeDoc]);

  useEffect(() => {
    if (creatingFolder) {
      const t = setTimeout(() => folderInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [creatingFolder]);

  const currentFolder = folders.find((f) => f.id === currentFolderId) ?? null;
  const visibleFolders = currentFolderId ? [] : folders;
  const visibleFiles = files.filter((f) => f.folderId === (currentFolderId ?? null));
  const visiblePending = pending.filter((p) => p.folderId === (currentFolderId ?? null));

  // Account-wide usage = committed total (all areas) + this panel's in-flight uploads.
  const usedBytes = accountUsed + pending.reduce((sum, p) => sum + (p.size || 0), 0);
  const usedPct = Math.min(100, (usedBytes / storageLimit) * 100);
  const barColor =
    usedPct >= 100 ? "bg-red-500" : usedPct >= 80 ? "bg-amber-500" : "bg-blue-500";

  // Auto-dismiss the "out of storage" notice after a moment.
  useEffect(() => {
    if (!quotaError) return;
    const t = setTimeout(() => setQuotaError(""), 5000);
    return () => clearTimeout(t);
  }, [quotaError]);

  // ── Folder create / delete ──
  const commitFolder = async () => {
    const name = newFolderName.trim();
    setNewFolderName("");
    setCreatingFolder(false);
    if (!name) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const folder = await addDrawingFolder({ uid, name }).catch(() => null);
    if (folder) setFolders((prev) => [folder, ...prev]);
  };

  const deleteFolder = async (folder) => {
    const uid = auth.currentUser?.uid;
    const inFolder = files.filter((f) => f.folderId === folder.id);

    // Optimistic UI
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    setFiles((prev) => prev.filter((f) => f.folderId !== folder.id));
    setAccountUsed((b) => Math.max(0, b - inFolder.reduce((s, f) => s + (f.size || 0), 0)));
    if (currentFolderId === folder.id) setCurrentFolderId(null);

    // Tear down each file's OpenAI + Storage footprint
    for (const f of inFolder) {
      for (const fid of [f.openaiFileId, f.visionFileId, f.sheetFileId]) {
        if (fid) {
          expireIndexedFile({
            vectorStoreId: f.vectorStoreId || storeIdRef.current,
            openaiFileId: fid,
          });
        }
      }
      if (f.path) deleteObject(storageRef(storage, f.path)).catch(() => {});
      for (const obj of [...(f.pages || []), ...(f.tiles || [])]) {
        if (obj.path) deleteObject(storageRef(storage, obj.path)).catch(() => {});
      }
    }
    if (uid) {
      if (inFolder.length) {
        deleteDrawingFileRecordsByIds({ uid, ids: inFolder.map((f) => f.id) }).catch(() => {});
      }
      deleteDrawingFolder({ uid, folderId: folder.id }).catch(() => {});
    }
  };

  // Same-origin proxy that streams the file with attachment headers — bypasses
  // Firebase Storage's missing CORS and the browser's cross-origin download block.
  const proxyUrl = (file) =>
    `/api/drawings/download?url=${encodeURIComponent(file.url)}&name=${encodeURIComponent(file.name || "file")}`;

  // ── Download a file to the user's device ──
  const downloadFile = (file) => {
    if (!file?.url) return;
    const a = document.createElement("a");
    a.href = proxyUrl(file);          // same-origin → `download` is honored
    a.download = file.name || "file";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Native drag-out — drag a file row onto the desktop / another app to save it.
  const onFileDragStart = (e, file) => {
    if (!file?.url) return;
    const mime = file.type || "application/octet-stream";
    // Point the drag at our same-origin proxy (absolute URL required by the
    // DownloadURL spec) so the saved-from-drag download isn't cross-origin.
    const abs = `${window.location.origin}${proxyUrl(file)}`;
    try {
      e.dataTransfer.setData("DownloadURL", `${mime}:${file.name}:${abs}`);
      e.dataTransfer.effectAllowed = "copy";
    } catch { /* not supported in this browser */ }
  };

  // ── File delete ──
  const deleteFile = async (file) => {
    const uid = auth.currentUser?.uid;
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    setAccountUsed((b) => Math.max(0, b - (file.size || 0)));

    for (const fid of [file.openaiFileId, file.visionFileId, file.sheetFileId]) {
      if (fid) {
        expireIndexedFile({
          vectorStoreId: file.vectorStoreId || storeIdRef.current,
          openaiFileId: fid,
        });
      }
    }
    if (file.path) deleteObject(storageRef(storage, file.path)).catch(() => {});
    // Delete rendered page images and drawing tiles.
    for (const obj of [...(file.pages || []), ...(file.tiles || [])]) {
      if (obj.path) deleteObject(storageRef(storage, obj.path)).catch(() => {});
    }
    if (uid && file.id) {
      deleteDrawingFileRecordsByIds({ uid, ids: [file.id] }).catch(() => {});
    }
  };

  // Index the vision-extracted page descriptions back into the drawings vector
  // store as searchable text. This is what makes a SCANNED drawing/manual (no
  // text layer, invisible to File Search) retrievable: vision turns the pages
  // into text, and that text becomes File-Search-able like any document. Returns
  // the OpenAI file id of the indexed text (for cleanup), or null.
  const indexVisionText = async ({ uid, name, pageAnalyses }) => {
    const withDesc = (pageAnalyses || []).filter((p) => p?.description);
    if (!withDesc.length) return null;
    // Lead with the document name/code repeated, so File Search reliably matches
    // queries that name this specific document (e.g. "E-302") to ITS content and
    // not another file's. The base name (without extension) is emphasized.
    const baseName = name.replace(/\.[a-z0-9]+$/i, "");
    const content =
      `DOCUMENT: ${name}\n` +
      `This is the complete content of the vessel document "${name}" (${baseName}). ` +
      `Any question that names "${baseName}" or this document must be answered from here and from no other document.\n\n` +
      withDesc.map((p) => `--- ${baseName} — Page ${p.pageNum} ---\n${p.description}`).join("\n\n");
    try {
      const res = await indexTextSnippet({
        vectorStoreId: storeIdRef.current || "",
        label: "NaviMind Drawings",
        name: `${name} (vision)`,
        content,
      });
      const newStoreId = res?.vectorStoreId || storeIdRef.current || "";
      if (newStoreId && newStoreId !== storeIdRef.current) {
        storeIdRef.current = newStoreId;
        setUserDrawingsStoreId(uid, newStoreId).catch(() => {});
      }
      return res?.texts?.[0]?.openaiFileId || null;
    } catch {
      return null;
    }
  };

  // Persist analysis results: Firestore record + (optionally) searchable vision
  // text. Shared by the initial upload analysis and the retry path. When the file
  // was already parsed by LlamaParse, pass indexText:false so we don't double-index
  // — the parsed text is the authoritative searchable copy.
  const applyAnalysis = async ({ uid, fileId, name, pageAnalyses, drawingType, indexText = true, pdfUrl = "" }) => {
    const updates = {};
    if (Array.isArray(pageAnalyses) && pageAnalyses.length) updates.pageAnalyses = pageAnalyses;
    if (drawingType) updates.drawingType = drawingType;
    if (indexText) {
      const visionFileId = await indexVisionText({ uid, name, pageAnalyses });
      if (visionFileId) updates.visionFileId = visionFileId;
    }
    if (Object.keys(updates).length) {
      updateDrawingFileRecord({ uid, id: fileId, updates }).catch(() => {});
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f)));
    }

    // For an actual visual DRAWING (not a manual), also build the high-res tiled
    // spatial index so "where is X" questions work. PDFs only (mupdf renders them).
    if (pdfUrl && /\.pdf$/i.test(name) && VISUAL_DRAWING_TYPES.has(drawingType)) {
      await buildSheetIndex({ uid, fileId, pdfUrl, name });
    }
  };

  // For a drawing: render its main sheet at high DPI and cut it into image TILES.
  // The tiles are uploaded to Storage and stored on the record so the assistant can
  // SEE the relevant region of the plan at query time (tracing pipes/lines, not just
  // reading text). Each tile keeps a short text index of what's in it, so the right
  // tiles can be picked per question. The combined text is also indexed into File
  // Search as a fallback.
  const buildSheetIndex = async ({ uid, fileId, pdfUrl, name }) => {
    try {
      const sheet = await fetch("/api/drawings/analyze-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl, name, returnImages: true }),
      }).then((r) => r.json());
      if (!sheet?.ok || !Array.isArray(sheet.tileList) || !sheet.tileList.length) return;

      const baseName = name.replace(/\.[a-z0-9]+$/i, "");
      // Upload each readable tile image to Storage.
      const tiles = [];
      for (const t of sheet.tileList) {
        if (!t.image) continue;
        try {
          const blob = await fetch(`data:image/jpeg;base64,${t.image}`).then((r) => r.blob());
          const tileFile = new File([blob], `${baseName}_tile_${t.col}-${t.row}.jpg`, { type: "image/jpeg" });
          const up = await uploadFileToStorage({ uid, file: tileFile });
          tiles.push({ url: up.url, path: up.path, pos: t.pos, col: t.col, row: t.row, description: t.description || "" });
        } catch { /* skip a tile that fails to upload */ }
      }
      if (!tiles.length) return;

      // Index the combined text as a File-Search fallback (helps locate the drawing).
      let sheetFileId = null;
      if (sheet.spatialText && sheet.readable) {
        const res = await indexTextSnippet({
          vectorStoreId: storeIdRef.current || "",
          label: "NaviMind Drawings",
          name: `${name} (spatial)`,
          content: `DOCUMENT: ${name}\nSpatial layout of the drawing "${name}".\n\n${sheet.spatialText}`,
        }).catch(() => null);
        const newStoreId = res?.vectorStoreId || storeIdRef.current;
        if (newStoreId && newStoreId !== storeIdRef.current) {
          storeIdRef.current = newStoreId;
          setUserDrawingsStoreId(uid, newStoreId).catch(() => {});
        }
        sheetFileId = res?.texts?.[0]?.openaiFileId || null;
      }

      // Located objects with full-sheet bounding boxes → enables tight on-demand
      // crops of exactly the asked-about item at query time. Cap to keep the record small.
      const items = Array.isArray(sheet.items)
        ? sheet.items
            .filter((it) => it?.label && Array.isArray(it.box) && it.box.length === 4)
            .slice(0, 120)
        : [];

      const updates = { tiles, sheetIndexed: true, items, sheetPdfUrl: pdfUrl, sheetPage: sheet.pageIndex || 1 };
      if (sheetFileId) updates.sheetFileId = sheetFileId;
      updateDrawingFileRecord({ uid, id: fileId, updates }).catch(() => {});
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f)));
    } catch { /* non-fatal — drawing is still usable via its other indexes */ }
  };

  // ── Re-run vision analysis for a file whose analysis failed or was lost ──
  // Reuses the already-rendered page images (no re-render/re-upload), so it only
  // repeats the vision step. Goes through the same concurrency-limited queue.
  const retryAnalysis = (file) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !file?.id) return;
    const inputPages = file.pages?.length
      ? file.pages.map((p) => ({ url: p.url, pageNum: p.pageNum }))
      : file.url
      ? [{ url: file.url, pageNum: 1 }]
      : [];
    if (!inputPages.length) return;
    setAnalyzingIds((prev) => new Set([...prev, file.id]));
    enqueueAnalysis(() =>
      analyzeAllPages(inputPages, file.name)
        .then(({ pages: pageAnalyses, drawingType }) =>
          applyAnalysis({ uid, fileId: file.id, name: file.name, pageAnalyses, drawingType, pdfUrl: file.url })
        )
        .catch(() => {})
        .finally(() => {
          setAnalyzingIds((prev) => {
            const s = new Set(prev);
            s.delete(file.id);
            return s;
          });
        })
    );
  };

  const dismissPending = (tempId) =>
    setPending((prev) => prev.filter((p) => p.tempId !== tempId));

  // ── Upload + index pipeline ──
  const addFiles = async (fileList) => {
    let items = Array.from(fileList || []);
    if (!items.length) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Re-sync the store id from Firestore before indexing. Prevents creating a
    // DUPLICATE vector store when the in-memory ref is stale (e.g. panel reopened
    // before an earlier create finished persisting). One store per user, always.
    if (!storeIdRef.current) {
      storeIdRef.current = (await getUserDrawingsStoreId(uid).catch(() => "")) || "";
    }

    // Reject native CAD formats up front — neither File Search nor Vision can
    // read .dwg/.dxf. Show a failed row explaining how to make them usable.
    const cadFiles = items.filter(isCadFile);
    if (cadFiles.length) {
      setPending((prev) => [
        ...cadFiles.map((f) => ({
          tempId: rid(),
          name: f.name,
          type: f.type,
          size: f.size || 0,
          folderId: currentFolderId ?? null,
          status: "failed",
          error: "CAD files can't be read — export to PDF or PNG first",
        })),
        ...prev,
      ]);
      items = items.filter((f) => !isCadFile(f));
      if (!items.length) return;
    }

    // Account-wide quota gate (current usage + incoming).
    const incoming = items.reduce((sum, f) => sum + (f.size || 0), 0);
    if (usedBytes + incoming > storageLimit) {
      const left = Math.max(0, storageLimit - usedBytes);
      setQuotaError(
        `Not enough storage — ${formatBytes(left)} left of ${formatBytes(storageLimit)}. Remove some files or upgrade your plan.`
      );
      return;
    }
    setQuotaError("");

    const folderId = currentFolderId ?? null;
    const queued = items.map((f) => ({
      tempId: rid(),
      name: f.name,
      type: f.type,
      size: f.size || 0,
      folderId,
      status: "uploading",
      progress: 0,
    }));
    setPending((prev) => [...queued, ...prev]);

    // Start (or extend) the background batch. Pre-count every file so the batch
    // only "drains" once the very last one finishes — no premature toast.
    const startingFresh = !batchActiveRef.current;
    batchActiveRef.current = true;
    batchInFlightRef.current += items.length;
    if (startingFresh) {
      fireToast(
        items.length === 1
          ? "File is processing in the background — you can keep working."
          : `${items.length} files are processing in the background — you can keep working.`
      );
    }

    for (let i = 0; i < items.length; i++) {
      const file = items[i];
      const { tempId } = queued[i];
      let uploaded = null;
      let pages = [];
      try {
        // 1) Upload bytes to Firebase Storage (with progress).
        uploaded = await uploadFileToStorage({
          uid,
          file,
          onProgress: (p) =>
            setPending((prev) =>
              prev.map((x) => (x.tempId === tempId ? { ...x, progress: p } : x))
            ),
        });

        // 2) Hash for future dedupe; switch the row to "indexing".
        const hash = await hashFile(file).catch(() => "");
        setPending((prev) =>
          prev.map((x) =>
            x.tempId === tempId ? { ...x, status: "indexing", progress: 100 } : x
          )
        );

        // 2b) PDFs → render the VISUAL pages to JPEG and upload for vision access.
        //     Text-heavy (manual) pages are skipped here — File Search covers them.
        //     Runs client-side via pdfjs-dist and is non-fatal on failure.
        if (isPdf(file)) {
          try {
            setPending((prev) =>
              prev.map((x) => (x.tempId === tempId ? { ...x, status: "rendering" } : x))
            );
            const rendered = await renderPdfPages(file); // [{ pageNum, blob }]
            const baseName = file.name.replace(/\.pdf$/i, "");
            pages = await Promise.all(
              rendered.map(async ({ pageNum, blob }) => {
                const pageFile = new File(
                  [blob],
                  `${baseName}_p${pageNum}.jpg`,
                  { type: "image/jpeg" }
                );
                const p = await uploadFileToStorage({ uid, file: pageFile });
                return { url: p.url, path: p.path, pageNum };
              })
            );
          } catch {
            pages = []; // rendering failed — continue without page images
          }
          setPending((prev) =>
            prev.map((x) => (x.tempId === tempId ? { ...x, status: "indexing" } : x))
          );
        }

        // 3) Extract authoritative text. PREFER LlamaParse (reliable for scanned
        //    PDFs, tables, complex layouts); FALL BACK to OpenAI's own extraction
        //    when LlamaParse isn't configured/available. Either way the searchable
        //    text lands in the user's persistent drawings store.
        setPending((prev) =>
          prev.map((x) => (x.tempId === tempId ? { ...x, status: "reading" } : x))
        );
        let llamaText = "";
        try {
          llamaText = await parseWithLlama(uploaded.url, uploaded.name);
        } catch { /* fall back below */ }
        setPending((prev) =>
          prev.map((x) => (x.tempId === tempId ? { ...x, status: "indexing" } : x))
        );

        let newStoreId = storeIdRef.current || "";
        let openaiFileId = "";
        let indexStatus = "";

        if (llamaText) {
          // Reliable path: index the clean parsed text (covers scans & tables).
          const res = await indexTextSnippet({
            vectorStoreId: storeIdRef.current || "",
            label: "NaviMind Drawings",
            name: uploaded.name,
            content: `DOCUMENT: ${uploaded.name}\n\n${llamaText}`,
          });
          newStoreId = res?.vectorStoreId || newStoreId;
          openaiFileId = res?.texts?.[0]?.openaiFileId || "";
        } else {
          // Fallback: let OpenAI extract text from the raw file (digital PDFs).
          const result = await indexDocuments({
            vectorStoreId: storeIdRef.current || "",
            label: "NaviMind Drawings",
            docs: [{ url: uploaded.url, name: uploaded.name, type: uploaded.type }],
          });
          newStoreId = result?.vectorStoreId || newStoreId;
          openaiFileId = result?.files?.[0]?.openaiFileId || "";
          indexStatus = result?.files?.[0]?.status || "";
        }

        if (newStoreId && newStoreId !== storeIdRef.current) {
          storeIdRef.current = newStoreId;
          // Await the persist so a concurrent/next operation reads the same id
          // and reuses this store instead of creating a duplicate.
          await setUserDrawingsStoreId(uid, newStoreId).catch(() => {});
        }

        if (openaiFileId) {
          // 4) Persist the record; reconcile optimistic state.
          const [rec] = await addDrawingFileRecords({
            uid,
            files: [
              {
                name: uploaded.name,
                type: uploaded.type,
                url: uploaded.url,
                path: uploaded.path,
                pages,
                openaiFileId,
                vectorStoreId: newStoreId,
                hash,
                size: file.size || 0,
                folderId,
              },
            ],
          });
          setPending((prev) => prev.filter((x) => x.tempId !== tempId));
          if (rec) {
            setFiles((prev) => [rec, ...prev]);
            // 5) Vision step, throttled through the concurrency-limited queue.
            //    - If LlamaParse already gave us the text, we only CLASSIFY the
            //      drawing (one cheap page-1 call) — no per-page OCR needed.
            //    - Otherwise, run the full vision OCR over the rendered pages.
            if (isVisualFile(file)) {
              const inputPages = pages.length
                ? pages.map((p) => ({ url: p.url, pageNum: p.pageNum }))
                : [{ url: uploaded.url, pageNum: 1 }];
              const visionPages = llamaText ? inputPages.slice(0, 1) : inputPages;
              setAnalyzingIds((prev) => new Set([...prev, rec.id]));
              enqueueAnalysis(() =>
                analyzeAllPages(visionPages, uploaded.name)
                  .then(({ pages: pageAnalyses, drawingType }) =>
                    applyAnalysis({
                      uid,
                      fileId: rec.id,
                      name: uploaded.name,
                      pageAnalyses,
                      drawingType,
                      // LlamaParse text is already the searchable copy — don't double-index.
                      indexText: !llamaText,
                      pdfUrl: uploaded.url,
                    })
                  )
                  .catch(() => {})
                  .finally(() => {
                    setAnalyzingIds((prev) => {
                      const s = new Set(prev);
                      s.delete(rec.id);
                      return s;
                    });
                    markFileWorkDone(true);
                  })
              );
            } else {
              // Non-visual file (e.g. .docx): indexed and usable, no vision step.
              markFileWorkDone(true);
            }
          } else {
            markFileWorkDone(false); // record failed to persist
          }
        } else {
          // Not indexable — clean up Storage objects.
          if (uploaded?.path) deleteObject(storageRef(storage, uploaded.path)).catch(() => {});
          for (const p of pages) {
            if (p.path) deleteObject(storageRef(storage, p.path)).catch(() => {});
          }
          setPending((prev) =>
            prev.map((x) =>
              x.tempId === tempId
                ? { ...x, status: "failed", error: prettyStatus(indexStatus) }
                : x
            )
          );
          markFileWorkDone(false);
        }
      } catch {
        if (uploaded?.path) deleteObject(storageRef(storage, uploaded.path)).catch(() => {});
        for (const p of pages) {
          if (p.path) deleteObject(storageRef(storage, p.path)).catch(() => {});
        }
        setPending((prev) =>
          prev.map((x) =>
            x.tempId === tempId ? { ...x, status: "failed", error: "Upload failed" } : x
          )
        );
        markFileWorkDone(false);
      }
    }
    refreshUsage(); // committed sizes are in Firestore now
  };

  const isEmpty =
    !loading &&
    visibleFolders.length === 0 &&
    visibleFiles.length === 0 &&
    visiblePending.length === 0 &&
    !creatingFolder;

  if (!portalTarget) return null;

  return createPortal(
    <>
    <AnimatePresence
      onExitComplete={() => {
        setDrawingRegisterOpen(false);
        setCurrentFolderId(null);
        setCreatingFolder(false);
        setNewFolderName("");
        setQuotaError("");
      }}
    >
      {open && (
        <motion.div
          key="dr-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`fixed top-0 bottom-0 left-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-hidden ${
            splitMode ? "right-0 [@media(hover:hover)]:right-1/2" : "right-0"
          }`}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <motion.div
            variants={{
              initial: { y: "100%", opacity: 0 },
              animate: { y: 0, opacity: 1 },
              exit: { y: "100%", opacity: 0 },
            }}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-3xl h-[680px] max-h-[88vh] flex flex-col
              bg-white dark:bg-[#1a2235] rounded-2xl shadow-2xl
              ring-1 ring-black/5 dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
            onDragOver={(e) => {
              // Only react to external file drags — not a row being dragged OUT.
              if (!Array.from(e.dataTransfer?.types || []).includes("Files")) return;
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer?.files); }}
          >
            {/* ── Header ── */}
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-white/10">
              <div className="min-w-0 flex-1 flex items-center gap-2.5">
                {currentFolder ? (
                  <>
                    <button
                      onClick={() => setCurrentFolderId(null)}
                      className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-400 transition shrink-0"
                    >
                      <ChevronLeft size={16} /> Drawings / Manuals
                    </button>
                    <span className="text-gray-300 dark:text-white/20">/</span>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {currentFolder.name}
                    </h2>
                  </>
                ) : (
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                    Drawings / Manuals
                  </h2>
                )}
              </div>

              {/* New folder — only at the top level */}
              {!currentFolder && (
                <Tooltip content="New folder" position="top" align="right">
                  <button
                    onClick={() => setCreatingFolder(true)}
                    aria-label="New folder"
                    className="shrink-0 p-2 rounded-lg text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
                  >
                    <Icon name="folder-close" size={22} />
                  </button>
                </Tooltip>
              )}

              {/* Upload */}
              <Tooltip content="Upload drawings" position="top" align="right">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload drawings"
                  className="shrink-0 p-2 rounded-lg text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
                >
                  <MaskIcon src="/library_add.svg" size={20} />
                </button>
              </Tooltip>

              <button
                onClick={close}
                aria-label="Close"
                className="shrink-0 p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
              >
                <X size={18} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff,.tif,.doc,.docx,.txt,.md,.pptx,.ppt,.xlsx,.xls,.csv,.dwg,.dxf"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
            </div>

            {/* ── Body ── */}
            <div className="relative flex-1 overflow-y-auto custom-scroll p-4">
              {dragging && (
                <div className="absolute inset-3 z-10 rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/70 dark:bg-blue-500/10 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-300 pointer-events-none">
                  Drop files to add them
                </div>
              )}

              {loading ? (
                <div className="w-full h-full min-h-[320px] flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <Loader2 size={22} className="animate-spin" />
                </div>
              ) : isEmpty ? (
                /* Empty state — drag & drop zone */
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="group w-full h-full min-h-[320px] rounded-2xl border-2 border-dashed
                    border-gray-200 dark:border-white/10
                    hover:border-blue-400/70 dark:hover:border-blue-400/50
                    hover:bg-blue-50/40 dark:hover:bg-blue-500/[0.04]
                    transition flex flex-col items-center justify-center text-center px-8 gap-4"
                >
                  <span className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/[0.06]
                    text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400
                    flex items-center justify-center transition-colors">
                    <InventoryIcon size={32} />
                  </span>
                  <div className="max-w-md">
                    <p className="text-base font-medium text-gray-700 dark:text-gray-200">
                      {currentFolder ? "Drop files into this folder" : "Drag & drop your drawings & manuals here"}
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">
                      Upload vessel drawings, equipment manuals, general arrangement plans, schematics.
                    </p>
                  </div>
                </button>
              ) : (
                <div className="space-y-6">
                  {/* Folders */}
                  {(visibleFolders.length > 0 || creatingFolder) && (
                    <div>
                      <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                        Folders
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {creatingFolder && (
                          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-blue-400/60 bg-blue-50/50 dark:bg-blue-500/10">
                            <Icon name="folder-close" size={22} className="text-blue-500 shrink-0" />
                            <input
                              ref={folderInputRef}
                              value={newFolderName}
                              onChange={(e) => setNewFolderName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitFolder();
                                if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); }
                              }}
                              onBlur={commitFolder}
                              placeholder="Folder name"
                              className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder-gray-400 dark:placeholder-gray-500"
                            />
                          </div>
                        )}
                        {visibleFolders.map((folder) => {
                          const count = files.filter((f) => f.folderId === folder.id).length;
                          return (
                            <button
                              key={folder.id}
                              onClick={() => setCurrentFolderId(folder.id)}
                              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full
                                hover:bg-gray-100 dark:hover:bg-white/5 transition"
                            >
                              <Icon name="folder-close" size={22} className="text-gray-500 dark:text-gray-400 shrink-0" />
                              <span className="flex-1 min-w-0 text-sm text-gray-800 dark:text-white/90 truncate">
                                {folder.name}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                                {count} {count === 1 ? "file" : "files"}
                              </span>
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); deleteFolder(folder); }}
                                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10
                                  [@media(hover:hover)]:opacity-0 group-hover:opacity-100 transition"
                                aria-label="Delete folder"
                              >
                                <Trash2 size={15} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Files */}
                  {(visibleFiles.length > 0 || visiblePending.length > 0) && (
                    <div>
                      <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                        Files
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {/* In-flight uploads */}
                        {visiblePending.map((p) => (
                          <div
                            key={p.tempId}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03]"
                          >
                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              p.status === "failed"
                                ? "bg-red-50 dark:bg-red-500/10 text-red-500"
                                : "bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400"
                            }`}>
                              {p.status === "failed"
                                ? <AlertCircle size={18} />
                                : <PipelineRing status={p.status} progress={p.progress} />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-800 dark:text-white/90 truncate">{p.name}</p>
                              {/* No stage labels — the single ring conveys progress. Only a
                                  terminal failure (which the user must act on) is spelled out. */}
                              {p.status === "failed" && (
                                <p className="text-[11px] font-medium text-red-500 dark:text-red-400">{p.error}</p>
                              )}
                            </div>
                            {p.status === "failed" && (
                              <button
                                onClick={() => dismissPending(p.tempId)}
                                aria-label="Dismiss"
                                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
                              >
                                <X size={15} />
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Committed files */}
                        {visibleFiles.map((file) => {
                          const isAnalyzing = analyzingIds.has(file.id);
                          const isIndexed = !!(file.pageAnalyses?.length || file.spatialSummary);
                          // Visual file with no analysis = the vision step failed and can be retried.
                          const needsAnalysis = !isAnalyzing && !isIndexed && isVisualFile(file);
                          return (
                            <div
                              key={file.id}
                              draggable
                              onDragStart={(e) => onFileDragStart(e, file)}
                              onDragEnd={() => setDragging(false)}
                              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition"
                            >
                              <button
                                onClick={() => openDoc(file)}
                                aria-label={`Open ${file.name}`}
                                className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition"
                              >
                                <FileText size={18} />
                              </button>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <button
                                    onClick={() => openDoc(file)}
                                    className="text-sm text-gray-800 dark:text-white/90 truncate text-left hover:text-blue-600 dark:hover:text-blue-400 transition"
                                  >
                                    {file.name}
                                  </button>
                                  {file.drawingType && DRAWING_TYPE_COLORS[file.drawingType] && (
                                    <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${DRAWING_TYPE_COLORS[file.drawingType]}`}>
                                      {file.drawingType}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400">
                                  {(file.name.split(".").pop() || "file").toUpperCase()}
                                  {file.size ? (
                                    <span className="text-gray-400 dark:text-gray-500 font-normal normal-case tracking-normal">
                                      {" · "}{formatBytes(file.size)}
                                    </span>
                                  ) : null}
                                  {/* Per-file processing status (Analyzing / Indexed /
                                      Not analyzed) intentionally hidden — users don't
                                      need the document-pipeline internals surfaced. */}
                                </p>
                              </div>
                              {needsAnalysis && (
                                <button
                                  onClick={() => retryAnalysis(file)}
                                  aria-label="Retry analysis"
                                  title="Retry AI analysis"
                                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 transition"
                                >
                                  <RefreshCw size={15} />
                                </button>
                              )}
                              <button
                                onClick={() => downloadFile(file)}
                                aria-label="Download file"
                                className="group/dl relative shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-500/10
                                  [@media(hover:hover)]:opacity-0 group-hover:opacity-100 transition"
                              >
                                <Download size={16} />
                                <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 z-30 whitespace-nowrap rounded-md bg-blue-600 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover/dl:opacity-100">
                                  Download
                                </span>
                              </button>
                              <button
                                onClick={() => deleteFile(file)}
                                aria-label="Delete file"
                                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10
                                  [@media(hover:hover)]:opacity-0 group-hover:opacity-100 transition"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer: storage quota ── */}
            <div className="px-6 py-3.5 border-t border-gray-100 dark:border-white/10">
              {quotaError && (
                <p className="mb-2.5 text-xs font-medium text-red-500 dark:text-red-400">
                  {quotaError}
                </p>
              )}
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    {formatBytes(usedBytes)}
                  </span>{" "}
                  of {formatBytes(storageLimit)} used
                </span>
                <span className="text-gray-400 dark:text-gray-500">{Math.round(usedPct)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all duration-300`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* ── In-app document viewer — constrained to the work area (portalled into
          nm-workarea, whose transform makes `fixed` relative to it), so it
          never covers the sidebar or navigates away. Separate AnimatePresence so
          closing the viewer doesn't trigger the panel's onExitComplete. ── */}
    <AnimatePresence>
      {activeDoc && (
        <motion.div
          key="dr-doc-viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`fixed top-0 bottom-0 left-0 z-[400] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm ${
            splitMode ? "right-0 [@media(hover:hover)]:right-1/2" : "right-0"
          }`}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveDoc(null); }}
        >
          <div
            className="flex flex-col w-full max-w-4xl h-[88vh] bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-white/10 shrink-0">
              <span className="text-sm font-medium text-gray-800 dark:text-white/90 truncate flex-1">
                {activeDoc.name}
              </span>
              <a
                href={activeDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 flex items-center gap-1 shrink-0"
              >
                Open in new tab
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="15 3 21 3 21 9" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <button
                onClick={() => setActiveDoc(null)}
                aria-label="Close"
                className="shrink-0 p-1.5 -mr-1 text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {activeDoc.isImage ? (
              <div className="flex-1 overflow-auto bg-gray-50 dark:bg-black/40 flex items-center justify-center p-4">
                <img
                  src={activeDoc.src}
                  alt={activeDoc.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <iframe src={activeDoc.src} className="w-full flex-1 bg-white" title={activeDoc.name} />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>,
    portalTarget
  );
}

// ONE unified progress ring for the whole drawing/manual pipeline — upload,
// convert, read, index — shown as a single percentage. No stage labels: the user
// doesn't need to know which internal step is running. Upload maps to 0–80%; the
// indeterminate steps (rendering/reading/indexing) each set a floor and creep
// toward 98%, and the percentage only ever moves forward.
function PipelineRing({ status, progress }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (status === "uploading") {
      setPct((p) => Math.max(p, Math.min(80, Math.round((progress || 0) * 0.8))));
      return;
    }
    const floor = { rendering: 82, reading: 89, indexing: 94 }[status];
    if (floor != null) {
      setPct((p) => Math.max(p, floor));
      const id = setInterval(() => setPct((p) => (p < 98 ? p + 1 : p)), 500);
      return () => clearInterval(id);
    }
  }, [status, progress]);

  const size = 34, stroke = 3;
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const shown = Math.min(100, Math.max(0, Math.round(pct)));
  const offset = circ - (shown / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-blue-500/20" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="text-blue-500 transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <span className="absolute text-[8px] font-semibold text-blue-500 dark:text-blue-400">{shown}%</span>
    </div>
  );
}

// Human-readable reason when a file couldn't be indexed for AI search.
function prettyStatus(status = "") {
  if (status.startsWith("skipped:visual")) return "No readable text found";
  if (status.startsWith("skipped:unsupported")) return "Unsupported file type";
  if (status.startsWith("skipped:empty")) return "File is empty";
  return "Couldn't process file";
}
