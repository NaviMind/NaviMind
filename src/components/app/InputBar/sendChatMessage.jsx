import {
  createChatGlobal,
  addMessageToGlobalChat,
  createChatForTopic,
  addMessageToTopicChat,
  updateGlobalChatMessage,
  updateTopicChatMessage,
  updateChatSummary,
  getTopicData,
  updateTopicMemory,
  loadUserTopics,
  getUserLibraryStoreId,
  getUserDrawingsStoreId,
  getDrawingFiles,
  setTopicVectorStoreId,
  addLibraryFileRecords,
  getLibraryFiles,
  countChatMessages,
  setChatTopicSuggestion,
} from "@/firebase/chatStore";
import { indexTextSnippet, uploadFileToStorage } from "./attachmentProcessing";
import { updateUserProfile } from "@/firebase/userRepo";
import { fetchChatSummary } from "@/ai/chatSummary";
import { fetchChatTitle } from "@/ai/chatTitle";
import { updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

// ─── Vessel drawings: cached load + smart selection ──────────────────────────

let _drawingsCache = { uid: null, files: [], ts: 0 };

async function getCachedDrawings(uid) {
  const TTL = 5 * 60 * 1000; // 5 minutes
  if (_drawingsCache.uid === uid && Date.now() - _drawingsCache.ts < TTL) {
    return _drawingsCache.files;
  }
  const files = await getDrawingFiles(uid).catch(() => []);
  _drawingsCache = { uid, files, ts: Date.now() };
  return files;
}

// Keywords that suggest the user is asking about spatial layout or engineering.
const DRAWING_QUESTION_RE =
  /plan|drawing|chart|layout|deck|fire|escape|evacuati|tank|pump|cargo|engine|boiler|ga |general arrangement|where is|where are|location|diagram|схем|чертеж|план|где|эвакуац|насос|танк|палуб/i;

// Maps a classified drawing type to the question patterns it matches best.
// When the question hits the pattern, that drawing gets a +4 relevance boost.
const DRAWING_TYPE_PATTERNS = {
  "GA Plan":          /where is|where are|location|layout|deck|general arrangement|где|расположени|палуб|plan view/i,
  "Fire Plan":        /fire|пожар|co2|foam|sprinkler|smoke|fire station|fire zone|противопожар/i,
  "Escape Routes":    /escape|evacuation|muster|lifeboat|emergency exit|эвакуац|шлюпк|спасательн|мастер/i,
  "Tank Plan":        /tank|насос|pump|ballast|cargo tank|bunker|fuel|танк|балласт|цистерн/i,
  "Engine Room":      /engine room|machinery|машинн|двигатель|compressor|generator|mechanical/i,
  "Cargo Plan":       /cargo|stability|loading|груз|погрузк|stowage/i,
  "Piping":           /pipe|valve|hydraul|трубопровод|клапан|piping|line diagram/i,
  "Electrical":       /electric|power|switch|generator|электр|генератор|distribution/i,
  "Safety Equipment": /life raft|fire extinguisher|epirb|спасательн|огнетушитель|safety appliance/i,
  "Manual":           /manual|instruction|procedure|how to|operate|maintenance|setting|menu|мануал|инструкц|руководств|настройк|эксплуатац|обслуживан|radar|ecdis/i,
};

function selectDrawings(files, question) {
  if (!files.length) return [];

  // Always attach all drawings when there are very few — zero selection cost.
  if (files.length <= 3) return files;

  const isSpatial = DRAWING_QUESTION_RE.test(question);
  const words = question.toLowerCase().split(/\W+/).filter((w) => w.length > 3);

  const scored = files.map((f) => {
    const name = (f.name || "").toLowerCase();

    // Base score: question words found in the file name (e.g. "VHF" in the
    // question matching a "VHF radiotelephone manual").
    const nameScore = words.reduce((s, w) => s + (name.includes(w) ? 2 : 0), 0);

    // GA plan boost for spatial/location questions.
    const gaBoost =
      /general arrangement|ga plan|ga\.pdf/i.test(f.name) &&
      /where|location|deck|layout|где|палуб/i.test(question)
        ? 3
        : 0;

    // Drawing/manual type boost: +4 when the classified type matches the topic.
    const typePattern = f.drawingType ? DRAWING_TYPE_PATTERNS[f.drawingType] : null;
    const typeBoost = typePattern?.test(question) ? 4 : 0;

    return { f, score: nameScore + gaBoost + typeBoost };
  });

  // Files with a positive relevance signal (name/type match) are always eligible
  // — even for non-spatial questions, so a VHF question pulls in the VHF manual.
  const relevant = scored.filter((s) => s.score > 0);

  // Fall back to top drawings only for clearly spatial questions; otherwise, with
  // no name/type match, attach nothing (File Search still covers text content).
  const pool = relevant.length ? relevant : (isSpatial ? scored : []);

  return pool
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((s) => s.f);
}

// For a multi-page drawing, score each page description against the question
// to pick only the most relevant page(s) — avoids sending all 10+ pages every time.
const STOP_WORDS = new Set([
  "what","where","when","which","does","this","that","with","from","have",
  "will","about","these","those","into","onto","over","under","after",
  "before","какой","какая","какие","какое","который","которая","которые",
]);

function scorePageForQuestion(description, questionLower) {
  const desc = (description || "").toLowerCase();
  let score = 0;
  const words = (questionLower.match(/\b[a-zа-я]{4,}\b/g) || []).filter(
    (w) => !STOP_WORDS.has(w)
  );
  for (const word of words) {
    if (desc.includes(word)) score += 1;
  }
  // Extra credit for exact deck/frame number matches.
  const nums = questionLower.match(/\b\d+\b/g) || [];
  for (const n of nums) {
    if (desc.includes(n)) score += 2;
  }
  return score;
}

// Pick the most relevant TILE images of a drawing for the question. Each tile has
// a short text index of what it contains; we score by that, then send those tile
// images so the assistant can visually read that region. Falls back to a spread of
// tiles when nothing matches (so it still "sees" the plan).
const MAX_TILES_PER_DRAWING = 2;
function selectTiles(tiles, question) {
  const q = question.toLowerCase();
  const withUrl = tiles.filter((t) => t.url);
  if (!withUrl.length) return [];

  const scored = withUrl
    .map((t) => ({ t, s: scorePageForQuestion(t.description || "", q) }))
    .sort((a, b) => b.s - a.s);

  // Prefer the tiles that actually match the question (the specific region). Only
  // when nothing matches do we fall back to a small spread so the model still sees
  // the sheet. Keep it tight — the user wants the relevant piece, not the whole grid.
  const matched = scored.filter((x) => x.s > 0).slice(0, MAX_TILES_PER_DRAWING);
  const chosen = matched.length ? matched : scored.slice(0, Math.min(2, withUrl.length));
  return chosen.map(({ t }) => ({ url: t.url, pageNum: 1, description: t.description }));
}

// Variant B — find the located object whose label best matches the question, so we
// can crop a tight high-res view of exactly it.
function bestItemMatch(items, question) {
  if (!Array.isArray(items) || !items.length) return null;
  const q = question.toLowerCase();
  const words = (q.match(/\b[a-zа-я]{3,}\b/g) || []).filter((w) => !STOP_WORDS.has(w));
  let best = null, bestScore = 0;
  for (const it of items) {
    const label = (it.label || "").toLowerCase();
    if (!label || !Array.isArray(it.box)) continue;
    let s = 0;
    for (const w of words) if (label.includes(w)) s += 2;
    // also reward when a label word appears in the question
    for (const lw of label.split(/\W+/)) if (lw.length > 3 && q.includes(lw)) s += 1;
    if (s > bestScore) { bestScore = s; best = it; }
  }
  return bestScore > 0 ? best : null;
}

// Crop the matched item out of the drawing at high resolution, upload it, and
// return its URL — a sharp close-up of exactly the asked-about thing.
async function cropMatchedItem(f, question, uid) {
  if (!f.sheetPdfUrl || !f.items?.length) return null;
  const item = bestItemMatch(f.items, question);
  if (!item) return null;
  try {
    const res = await fetch("/api/drawings/crop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pdfUrl: f.sheetPdfUrl, page: f.sheetPage || item.page || 1, box: item.box }),
    }).then((r) => r.json());
    if (!res?.ok || !res.image) return null;
    const blob = await fetch(`data:image/png;base64,${res.image}`).then((r) => r.blob());
    const file = new File([blob], `crop_${(f.name || "drawing").replace(/\.[a-z0-9]+$/i, "")}_${Date.now()}.png`, { type: "image/png" });
    const up = await uploadFileToStorage({ uid, file });
    return { url: up.url, label: item.label };
  } catch {
    return null;
  }
}

const MAX_PAGES_PER_DRAWING = 3;

// Pick the most relevant pages of a drawing for the current question.
// Falls back gracefully when per-page analysis is not yet available.
function selectPages(drawing, question) {
  const q = question.toLowerCase();

  // New format: per-page descriptions stored in pageAnalyses[].
  if (drawing.pageAnalyses?.length) {
    const analyses = drawing.pageAnalyses;
    if (analyses.length <= MAX_PAGES_PER_DRAWING) return analyses;
    return analyses
      .map((p) => ({ ...p, _s: scorePageForQuestion(p.description || "", q) }))
      .sort((a, b) => b._s - a._s)
      .slice(0, MAX_PAGES_PER_DRAWING)
      .map(({ _s: _ignored, ...p }) => p);
  }

  // Legacy format: single spatialSummary string.
  if (drawing.spatialSummary) {
    const url = drawing.pages?.[0]?.url || drawing.url;
    return [{ pageNum: 1, url, description: drawing.spatialSummary }];
  }

  // Rendered pages with no analysis yet — send up to MAX for vision only.
  if (drawing.pages?.length) {
    return drawing.pages.slice(0, MAX_PAGES_PER_DRAWING).map((p) => ({
      pageNum: p.pageNum,
      url: p.url,
    }));
  }

  // Image file: use the direct URL (no multi-page concept).
  return drawing.url ? [{ pageNum: 1, url: drawing.url }] : [];
}

// ─────────────────────────────────────────────────────────────────────────────

async function fetchChatSummaryFromStore({ uid, chatId, topicId }) {
  const ref = topicId
    ? doc(db, "users", uid, "topics", topicId, "chats", chatId)
    : doc(db, "users", uid, "chats", chatId);

  const snap = await getDoc(ref);
  return snap.exists() ? snap.data()?.summary || "" : "";
}

const getMessagesRef = (uid, chatId, topicId) =>
  topicId
    ? collection(db, "users", uid, "topics", topicId, "chats", chatId, "messages")
    : collection(db, "users", uid, "chats", chatId, "messages");

async function fetchLastMessages({ uid, chatId, topicId, limitCount = 10 }) {
  const q = query(
    getMessagesRef(uid, chatId, topicId),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  );

  const snap = await getDocs(q);
  return snap.docs.reverse().map(d => d.data()).map(({ role, content }) => ({ role, content }));
}

// ── Topic suggestion (graduate a long focused chat into a Topic) ──
// Gated hard: only for regular chats past a size threshold, checked at most once
// per growth window, and cached on the chat doc so the LLM check runs rarely.
const SUGGEST_MIN_MESSAGES = 10;
const SUGGEST_RECHECK_GROWTH = 10;

async function maybeSuggestTopic({ uid, chatId, summary, messages }) {
  try {
    const count = await countChatMessages(uid, chatId);
    if (count < SUGGEST_MIN_MESSAGES) return;

    const snap = await getDoc(doc(db, "users", uid, "chats", chatId));
    const data = snap.exists() ? snap.data() : {};
    const state = data.topicSuggestionState;
    const atCount = data.topicSuggestionAtCount || 0;
    // Already pending or accepted → leave it. Snoozed/checked → wait for growth.
    if (state === "suggested" || state === "accepted") return;
    if ((state === "dismissed" || state === "checked") && count < atCount + SUGGEST_RECHECK_GROWTH) return;

    const res = await fetch("/api/suggest-topic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary, messages }),
    });
    if (!res.ok) return;
    const out = await res.json();

    if (out.suggest && Array.isArray(out.names) && out.names.length > 0) {
      await setChatTopicSuggestion(uid, chatId, {
        state: "suggested",
        suggestion: { names: out.names, description: out.description || "" },
        atCount: count,
      });
    } else {
      await setChatTopicSuggestion(uid, chatId, { state: "checked", atCount: count });
    }
  } catch { /* silent — suggestion is best-effort */ }
}

const summaryLocks = new Set();
const sendLocks = new Set();

export async function sendChatMessage({
  message,
  attachments = [],
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
  vesselProfile = null,
  memorySettings = {},
  globalChatMemory = "",
}) {
  if (!currentUser?.uid) return;

  // Allow sending with just attachments and no text.
  const trimmedMessage = message?.trim() || "";
  const hasAttachments = (attachments?.length || 0) > 0;
  if (!trimmedMessage && !hasAttachments) return;

  // When the user sends files without typing, give the model a sensible default
  // instruction (it can't answer an empty question), and seed a title.
  const firstAttachmentName = attachments?.[0]?.name || "";
  const titleSeed = trimmedMessage || firstAttachmentName || "Shared file";
  const ragQuestion =
    trimmedMessage ||
    "Please review the attached file(s) and give me the key points relevant to my vessel and situation.";

  const topicId =
    topicIdFromURL && topicIdFromURL !== "null" ? topicIdFromURL : null;
  const inTopic = Boolean(topicId);
  let chatId = activeChatId;
  const isNewChat = !chatId;
  let aiMessageId;
  let genAbortController = null;

  const sendKey = `${currentUser?.uid}:${topicIdFromURL || "global"}:${activeChatId || "new"}`;

if (sendLocks.has(sendKey)) {
  return;
}

sendLocks.add(sendKey);

  try {

  // ───────── CREATE CHAT IF NEEDED ─────────
  if (!chatId) {
    if (inTopic) {
      const created = await createChatForTopic({
        uid: currentUser.uid,
        topicId,
        messageText: titleSeed,
      });

      chatId = created.chatId;
      setActiveProject(topicId);
      setActiveChatId(chatId);
      // Flip into "loading messages" in the same batch so the UI jumps
      // straight to the chat area instead of flashing the chat list
      setIsLoadingMessages?.(true);

      const snap = await getDoc(
        doc(db, "users", currentUser.uid, "topics", topicId, "chats", chatId)
      );

      setProjectChatSessions((prev) => {
        const updated = { ...prev };
        updated[topicId] = [
          {
            chatId,
            createdAt: snap.data()?.createdAt?.toMillis?.() ?? Date.now(),
            messages: [],
            title: titleSeed.slice(0, 60),
          },
          ...(updated[topicId] || []),
        ];
        return updated;
      });
    } else {
      const created = await createChatGlobal({
        uid: currentUser.uid,
        messageText: titleSeed,
      });

      chatId = created.chatId;
      setActiveProject(null);
      setActiveChatId(chatId);
      setIsLoadingMessages?.(true);

      const snap = await getDoc(
        doc(db, "users", currentUser.uid, "chats", chatId)
      );

      setProjectChatSessions((prev) => {
        const updated = { ...prev };
        updated.global = [
          {
            chatId,
            createdAt: snap.data()?.createdAt?.toMillis?.() ?? Date.now(),
            messages: [],
            title: titleSeed.slice(0, 60),
          },
          ...(updated.global || []),
        ];
        return updated;
      });
    }
  }

  // ───────── OPTIMISTIC RENDER ─────────
  // Show the outgoing message instantly (with image previews and a "thinking"
  // bubble). Attachments arrive already uploaded (processed on attach), so we
  // can preview straight from their Storage URL.
  if (setPendingSend) {
    const previews = (attachments || []).map((f) => ({
      name: f.name,
      type: f.type,
      previewUrl: f.isImage ? (f.url || (f.file && URL.createObjectURL(f.file))) : undefined,
    }));
    setPendingSend({ chatId, message, attachments: previews });
  }

  // ───────── CONTEXT BUILD (before saving new messages) ─────────
  const previousMessages = await fetchLastMessages({
    uid: currentUser.uid,
    chatId,
    topicId: inTopic ? topicId : null,
  });

  const summary = await fetchChatSummaryFromStore({
    uid: currentUser.uid,
    chatId,
    topicId: inTopic ? topicId : null,
  });

  const chatHistory = previousMessages;

  // Fetch topic-level context when inside a topic
  let topicInstruction = "";
  let topicMemory = "";
  let topicStoreId = "";
  let crossTopicMemory = "";
  let crossTopicStoreIds = [];
  if (inTopic) {
    try {
      const topicData = await getTopicData(currentUser.uid, topicId);
      topicInstruction = topicData?.description || "";
      topicMemory = topicData?.topicMemory || "";
      topicStoreId = topicData?.vectorStoreId || "";
    } catch { /* silent */ }

    if (memorySettings.crossTopicContext) {
      try {
        const allTopics = await loadUserTopics(currentUser.uid);
        const others = allTopics
          .filter((t) => t.topicId !== topicId)
          .slice(0, 8); // cap to avoid token overflow

        const memBlocks = others
          .filter((t) => t.topicMemory?.trim())
          .map((t) => `[${t.name || t.title || "Untitled"}]\n${t.topicMemory.trim()}`);
        if (memBlocks.length) {
          crossTopicMemory = memBlocks.join("\n\n");
        }

        crossTopicStoreIds = others
          .map((t) => t.vectorStoreId)
          .filter(Boolean);
      } catch { /* silent */ }
    }
  }

  // ───────── SAVE USER MESSAGE ─────────
  // Attachments are already uploaded AND processed (on attach). We only consume
  // the prepared metadata here — no Storage upload, no indexing. Any file that
  // reached Storage (has a url) is attached & openable.
  const usableAttachments = (attachments || []).filter((a) => a.url);

  // Vision input = only images whose VISUAL is actually needed (diagrams,
  // charts, photos). Text-only screenshots were OCR'd into the store on attach,
  // so we skip vision for them → faster answers.
  const uploadedImages = usableAttachments
    .filter((a) => a.isImage && a.visualRequired !== false)
    .map((a) => ({ name: a.name, type: a.type, url: a.url, path: a.path }));

  // Searchable = anything that got indexed (docs, scanned-PDF OCR, and
  // text-bearing images) — identified by an openaiFileId.
  const searchableDocs = usableAttachments
    .filter((a) => a.openaiFileId)
    .map((a) => ({
      name: a.name,
      type: a.type,
      url: a.url,
      path: a.path,
      openaiFileId: a.openaiFileId,
      vectorStoreId: a.vectorStoreId,
      hash: a.hash || "",
      reused: !!a.reused,
    }));

  // Document names are sent so the model knows which files it may cite.
  const documentPayloads = searchableDocs.map((d) => ({
    name: d.name,
    type: d.type,
    url: d.url,
  }));

  // Resolve the vector store to search. New docs already carry their store id;
  // otherwise fall back to the scope's persistent store so earlier uploads stay
  // searchable.
  let vectorStoreId =
    searchableDocs.find((d) => d.vectorStoreId)?.vectorStoreId || "";
  if (!vectorStoreId) {
    vectorStoreId = inTopic
      ? topicStoreId
      : await getUserLibraryStoreId(currentUser.uid).catch(() => "");
  }
  // The user's drawings store is account-wide: always searchable, in every chat
  // and topic, so the assistant can consult vessel drawings/manuals anywhere.
  // Wrapped defensively: drawings are an enhancement, never a hard dependency —
  // any failure here must NOT block sending the message or getting an answer.
  let drawingsStoreId = "";
  let vesselDrawings = [];
  let vesselLibrary = []; // names/types of ALL drawings & manuals, so the model knows what it can search
  try {
    let allDrawingFiles = [];
    [drawingsStoreId, allDrawingFiles] = await Promise.all([
      getUserDrawingsStoreId(currentUser.uid).catch(() => ""),
      getCachedDrawings(currentUser.uid),
    ]);

    // Make the model aware of the whole vessel library (not just this message's
    // attachments) so it consults File Search for equipment/vessel questions
    // instead of falling back to generic knowledge.
    vesselLibrary = allDrawingFiles
      .filter((f) => f.name)
      .slice(0, 60)
      .map((f) => ({ name: f.name, kind: f.drawingType || null }));

    // Select the most relevant drawings to attach as vision inputs. The model
    // will see the actual image — layout, labels, pipe runs — not just OCR text.
    const selectedDrawings = selectDrawings(allDrawingFiles, ragQuestion);
    vesselDrawings = [];
    let croppedOnce = false; // only one precise crop per query (cost/latency guard)
    for (const f of selectedDrawings.filter((d) => d.url)) {
      let selectedPages = null;
      let cropLabel = null;

      // Variant B: if an object on this drawing matches the question, send a tight
      // high-res CROP of exactly it (sharp close-up) instead of the whole tile.
      if (!croppedOnce && f.items?.length && f.sheetPdfUrl) {
        const crop = await cropMatchedItem(f, ragQuestion, currentUser.uid);
        if (crop) {
          selectedPages = [{ url: crop.url, pageNum: 1, description: crop.label, isCrop: true }];
          cropLabel = crop.label;
          croppedOnce = true;
        }
      }

      if (!selectedPages) {
        selectedPages = f.tiles?.length ? selectTiles(f.tiles, ragQuestion) : selectPages(f, ragQuestion);
      }

      vesselDrawings.push({
        url: f.url,
        name: f.name,
        type: f.type,
        drawingType: f.drawingType || null,
        tiled: !!f.tiles?.length,
        cropLabel,
        selectedPages,
      });
    }
  } catch (e) {
    console.error("Drawings prep failed (continuing without drawings):", e);
    drawingsStoreId = "";
    vesselDrawings = [];
  }
  const vectorStoreIds = [...new Set([vectorStoreId, drawingsStoreId].filter(Boolean))];

  // Everything attached is shown & openable in the message (regardless of how
  // it's consumed: vision, File Search, or both).
  const uploadedAttachments = usableAttachments.map((a) => ({
    name: a.name,
    type: a.type,
    url: a.url,
    path: a.path,
  }));

const userMessagePayload = {
  role: "user",
  content: message,
  attachments: uploadedAttachments,
};

if (inTopic) {
  await addMessageToTopicChat(topicId, chatId, userMessagePayload);
} else {
  await addMessageToGlobalChat(chatId, userMessagePayload);
}

  // ───────── AI PLACEHOLDER ─────────
  if (inTopic) {
    aiMessageId = (
      await addMessageToTopicChat(topicId, chatId, "NaviMind syncing…", "assistant")
    )?.messageId;
  } else {
    aiMessageId = (
      await addMessageToGlobalChat(chatId, "NaviMind syncing…", "assistant")
    )?.messageId;
  }

  // Real user message + placeholder are now persisted — drop the optimistic one.
  setPendingSend?.(null);

  // ───────── RECORD LIBRARY FILES ─────────
  // Indexing happened on attach; here we just persist a record of each indexed
  // doc (now that chatId exists) for citation-mapping, dedup and TTL cleanup.
  // Reused (deduped) files already have a record — don't duplicate it.
  const docsToRecord = searchableDocs.filter((d) => !d.reused);
  if (docsToRecord.length > 0) {
    addLibraryFileRecords({
      uid: currentUser.uid,
      topicId: inTopic ? topicId : null,
      chatId,
      files: docsToRecord.map((d) => ({ ...d, vectorStoreId })),
    }).catch(() => {});
  }

  // ───────── AI REQUEST ─────────
  // AbortController lets the user stop generation; signal is passed to fetch.
  genAbortController = new AbortController();
  beginGeneration?.(genAbortController, chatId);
  let aborted = false;

  const res = await fetch("/api/rag", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      question: ragQuestion,
      chatHistory,
      summary,
      imageUrls: uploadedImages.map((a) => a.url),
      documentFiles: documentPayloads,
      vectorStoreIds,
      vesselProfile,
      topicInstruction,
      topicMemory: memorySettings.searchPastChats === false ? "" : (inTopic ? topicMemory : globalChatMemory),
      searchPastChats: memorySettings.searchPastChats !== false,
      crossTopicMemory: memorySettings.searchPastChats === false ? "" : crossTopicMemory,
      crossTopicStoreIds,
      vesselDrawings,
      vesselLibrary,
    }),
    signal: genAbortController.signal,
  });

  const contentType = res.headers.get("content-type") || "";
  let finalText = "";
  let sources = [];
  let streamedSources = [];

if (res.body && contentType.includes("text/event-stream")) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffer = "";

  // Live streaming → push tokens into the context overlay, throttled to one
  // update per animation frame. The trailing [[CITED_FILES:...]] marker is
  // hidden on the fly so it never flashes in the UI.
  let liveScheduled = false;
  const pushLive = () => {
    liveScheduled = false;
    if (!setStreamingMessage || !aiMessageId) return;
    // Hide citation markers while streaming (they resolve to pills only once the
    // final message is saved): drop complete markers and any partial at the end.
    const live = finalText
      .replace(/\[\[\s*cite:[^\]]*\]\]/gi, "")
      .replace(/\[\[\s*cite:[^\]]*$/i, "");
    setStreamingMessage(aiMessageId, live);
  };
  const scheduleLive = () => {
    if (liveScheduled) return;
    liveScheduled = true;
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(pushLive);
    else pushLive();
  };
  // Enter "streaming" state immediately so the UI shows the thinking spinner.
  if (setStreamingMessage && aiMessageId) setStreamingMessage(aiMessageId, "");

  try {
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const chunk of parts) {
      const lines = chunk.split("\n");

      let event = "";
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        }

        if (line.startsWith("data:")) {
          let part = line.slice(5);
          if (part.startsWith(" ")) part = part.slice(1);
          data += (data ? "\n" : "") + part;
        }
      }

      if (event === "token") {
        finalText += data.replace(/\\n/g, "\n");
        scheduleLive();
      }

      if (event === "sources") {
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) streamedSources.push(...parsed);
  } catch (e) {
    console.error("Failed to parse sources:", data);
  }
}

      if (event === "error") {
        throw new Error(data || "SSE error");
      }
    }
  }
  } catch (streamErr) {
    // User pressed Stop → keep whatever was generated so far (graceful).
    if (genAbortController.signal.aborted) {
      aborted = true;
      try { await reader.cancel(); } catch { /* noop */ }
    } else {
      throw streamErr;
    }
  }

  // ── Inline source citations ──
  // The model places inline markers right after each claim it draws from a
  // document: "[[cite:filename.pdf]]". We DON'T strip them (they're rendered
  // inline as clickable pills); we only resolve the cited filenames to file
  // metadata so the pills know which file to open. The candidate pool is the
  // files attached in THIS message plus any previously-indexed files for this
  // scope (so citations to earlier uploads still open).
  let fileSources = [];
  if (finalText.includes("[[cite:")) {
    let candidates = [...searchableDocs, ...vesselDrawings];
    try {
      const prior = await getLibraryFiles({
        uid: currentUser.uid,
        topicId: inTopic ? topicId : null,
      });
      candidates = [...candidates, ...prior];
    } catch { /* silent */ }

    const findDoc = (n) => {
      // Extracted text is indexed as "name.ext.txt"; map that back to the
      // original attachment name so the pill opens the real file.
      const low = n.toLowerCase().replace(/(\.[a-z0-9]+)\.txt$/i, "$1");
      return (
        candidates.find((d) => d.name?.toLowerCase() === low) ||
        candidates.find(
          (d) =>
            d.name?.toLowerCase().endsWith(low) ||
            low.endsWith(d.name?.toLowerCase() || "")
        )
      );
    };
    const seen = new Set();
    const re = /\[\[\s*cite:\s*([^\]]+?)\s*\]\]/gi;
    let m;
    while ((m = re.exec(finalText)) !== null) {
      const docMeta = findDoc(m[1].trim());
      if (docMeta?.url && !seen.has(docMeta.url)) {
        seen.add(docMeta.url);
        fileSources.push({ name: docMeta.name, type: docMeta.type, url: docMeta.url });
      }
    }
  }

  // The answer's visual source = the plan that was actually READ (its tiles were
  // sent), not every drawing that happened to be in scope. Showing only the used
  // drawing keeps the footer clean even with a big library.
  const referencedDrawings = (vesselDrawings || [])
    .filter((d) => d.tiled && (d.selectedPages || []).some((p) => p.url))
    .map((d) => ({ name: d.name, url: d.url, type: d.type }))
    .filter((d) => d.name && d.url);

  // The actual plan TILES the assistant looked at — shown under the answer as
  // thumbnails so the user can see exactly which region of the drawing was read.
  const referencedTiles = (vesselDrawings || [])
    .filter((d) => d.tiled)
    .flatMap((d) =>
      (d.selectedPages || [])
        .filter((p) => p.url)
        .map((p) => ({ url: p.url, name: d.name }))
    )
    .slice(0, 3);

  // финальный апдейт ОДИН РАЗ
  if (aiMessageId) {
   const payload = {
  content: finalText || (aborted ? "⏹️ Stopped." : " "),
  sources: streamedSources,
  fileSources,
  referencedDrawings,
  referencedTiles,
};
    if (inTopic) {
      await updateTopicChatMessage(topicId, chatId, aiMessageId, payload);
    } else {
      await updateGlobalChatMessage(chatId, aiMessageId, payload);
    }
    // Persisted final text — drop the live overlay (Firestore now drives it).
    clearStreamingMessage?.(aiMessageId);
  }
}

  // ───────── AI TITLE (new chats only, fire & forget) ─────────
  if (isNewChat) {
    fetchChatTitle(titleSeed).then(async (aiTitle) => {
      if (!aiTitle) return;
      try {
        const chatDocRef = inTopic
          ? doc(db, "users", currentUser.uid, "topics", topicId, "chats", chatId)
          : doc(db, "users", currentUser.uid, "chats", chatId);
        await updateDoc(chatDocRef, { title: aiTitle });
      } catch { /* silent */ }
    }).catch(() => {});
  }

  // ───────── SUMMARY UPDATE ─────────
  const summaryKey = `${currentUser.uid}:${inTopic ? topicId : "global"}:${chatId}`;

if (!summaryLocks.has(summaryKey)) {
  summaryLocks.add(summaryKey);

  try {
    const newSummary = await fetchChatSummary({
      messages: [...chatHistory, { role: "assistant", content: finalText }],
      previousSummary: summary,
    });

    if (newSummary) {
      await updateChatSummary({
        uid: currentUser.uid,
        chatId,
        topicId: inTopic ? topicId : null,
        summaryText: newSummary,
      });
    }
  } catch (e) {
    // можно логировать позже
  } finally {
    summaryLocks.delete(summaryKey);
  }
}
  // ───────── TOPIC MEMORY UPDATE (fire & forget) ─────────
  if (inTopic && memorySettings.buildFromChats !== false) {
    const topicMemoryKey = `${currentUser.uid}:${topicId}:topicMemory`;
    if (!summaryLocks.has(topicMemoryKey)) {
      summaryLocks.add(topicMemoryKey);
      fetchChatSummary({
        messages: [
          ...chatHistory,
          { role: "user", content: ragQuestion },
          { role: "assistant", content: finalText },
        ],
        previousSummary: topicMemory,
        mode: "topic",
      })
        .then(async (newTopicMemory) => {
          if (newTopicMemory) {
            await updateTopicMemory(currentUser.uid, topicId, newTopicMemory);
          }
        })
        .catch(() => {})
        .finally(() => summaryLocks.delete(topicMemoryKey));
    }
  }

  // ───────── TOPIC COLD MEMORY (fire & forget) ─────────
  if (inTopic && !aborted && finalText && finalText.trim() && memorySettings.buildFromChats !== false) {
    (async () => {
      try {
        const content = `User: ${ragQuestion}\n\nAssistant: ${finalText}`;
        const data = await indexTextSnippet({
          vectorStoreId, // resolved earlier (may be "" → store created here)
          label: `Topic ${topicId}`,
          name: `memory-${chatId}-${Date.now()}`,
          content,
        });
        const memStoreId = data?.vectorStoreId || vectorStoreId;
        if (memStoreId && memStoreId !== vectorStoreId) {
          await setTopicVectorStoreId(currentUser.uid, topicId, memStoreId);
        }
        // Record so topic deletion cleans up memory files too. No url → these
        // never surface as citation pills.
        const indexed = (data?.texts || []).filter((t) => t.status === "indexed");
        if (indexed.length > 0) {
          await addLibraryFileRecords({
            uid: currentUser.uid,
            topicId,
            chatId,
            files: indexed.map((t) => ({
              name: t.name,
              type: "text/plain",
              url: "",
              openaiFileId: t.openaiFileId,
              vectorStoreId: memStoreId,
            })),
          });
        }
      } catch { /* silent — cold memory is best-effort */ }
    })();
  }

  // ───────── GLOBAL CHAT MEMORY UPDATE (fire & forget) ─────────
  if (!inTopic && memorySettings.buildFromChats !== false) {
    const globalMemKey = `${currentUser.uid}:global:chatMemory`;
    if (!summaryLocks.has(globalMemKey)) {
      summaryLocks.add(globalMemKey);
      fetchChatSummary({
        messages: [
          ...chatHistory,
          { role: "user", content: ragQuestion },
          { role: "assistant", content: finalText },
        ],
        previousSummary: globalChatMemory,
        mode: "topic",
      })
        .then(async (newGlobalMemory) => {
          if (newGlobalMemory) {
            await updateUserProfile(currentUser.uid, { globalChatMemory: newGlobalMemory });
          }
        })
        .catch(() => {})
        .finally(() => summaryLocks.delete(globalMemKey));
    }
  }

  // ───────── GLOBAL COLD MEMORY (fire & forget) ─────────
  // Index this exchange into the user's global library store so File Search
  // can recall past non-topic conversations when searchPastChats is on.
  if (!inTopic && !aborted && finalText && finalText.trim() && vectorStoreId && memorySettings.buildFromChats !== false) {
    (async () => {
      try {
        const content = `User: ${ragQuestion}\n\nAssistant: ${finalText}`;
        await indexTextSnippet({
          vectorStoreId,
          label: "Global chats",
          name: `memory-${chatId}-${Date.now()}`,
          content,
        });
      } catch { /* silent */ }
    })();
  }

  // ───────── TOPIC SUGGESTION (regular chats, fire & forget) ─────────
  if (!inTopic && !aborted && finalText && finalText.trim()) {
    maybeSuggestTopic({
      uid: currentUser.uid,
      chatId,
      summary,
      messages: [
        ...chatHistory,
        { role: "user", content: ragQuestion },
        { role: "assistant", content: finalText },
      ],
    });
  }

  } catch (err) {
    setPendingSend?.(null);
    // Stop pressed before any answer streamed → don't show an error, just tidy up.
    if (genAbortController?.signal.aborted) {
      if (aiMessageId) clearStreamingMessage?.(aiMessageId);
      if (aiMessageId && chatId) {
        try {
          const stopPayload = { content: "⏹️ Stopped." };
          if (inTopic && topicId) {
            await updateTopicChatMessage(topicId, chatId, aiMessageId, stopPayload);
          } else {
            await updateGlobalChatMessage(chatId, aiMessageId, stopPayload);
          }
        } catch { /* silent */ }
      }
    } else {
      console.error("❌ sendChatMessage error:", err);
      // Clear live overlay so the UI falls back to persisted state.
      if (aiMessageId) clearStreamingMessage?.(aiMessageId);
      // Replace the stuck placeholder so the user isn't left with an infinite spinner
      if (aiMessageId && chatId) {
        try {
          const errPayload = { content: `⚠️ Error: ${err?.message || "Something went wrong. Please try again."}` };
          if (inTopic && topicId) {
            await updateTopicChatMessage(topicId, chatId, aiMessageId, errPayload);
          } else {
            await updateGlobalChatMessage(chatId, aiMessageId, errPayload);
          }
        } catch { /* silent */ }
      }
    }
  } finally {
    endGeneration?.();
    sendLocks.delete(sendKey);
  }
}
