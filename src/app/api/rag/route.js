import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { hasAdminCreds } from "@/firebase/admin";
import { recordTokenUsageAdmin } from "@/firebase/adminUsage";
import { modelTierFor, docChunksFor } from "@/lib/planLimits";

import { systemInstruction } from "@/ai/systemInstruction";
import { responseStyle } from "@/ai/responseStyle";
import { safetyRules } from "@/ai/safetyRules";
import { confidenceCalibration } from "@/ai/confidenceCalibration";
import { clarificationStrategy } from "@/ai/clarificationStrategy";
import { documentAnalysisGuidance } from "@/ai/documentAnalysisGuidance";
import { imageAnalysisGuide } from "@/ai/imageAnalysisGuide";
import { regulatoryEvidenceGuidance } from "@/ai/regulatoryEvidenceGuidance";
import { assistantRoleAndValue } from "@/ai/assistantRoleAndValue";
import { operationalReasoningPolicy } from "@/ai/operationalReasoningPolicy";
import { webAutonomyPolicy } from "@/ai/webAutonomyPolicy";
import { documentGenerationGuidance } from "@/ai/documentGenerationGuidance";

// True when the user is asking for a downloadable file — generate a document
// (checklist/report/form/letter/procedure) or edit an uploaded one. Gates whether
// the document-generation guidance is loaded into the prompt.
function needsDocGeneration(question) {
  if (!question) return false;
  const q = question.toLowerCase();
  const wantsFile =
    /\b(download|\.docx?|word file|as a (word|doc|document)|pdf)\b/.test(q) ||
    /(скачать|ворд|в ворде|документ|файл|бланк|шаблон|word)/.test(q);
  const docNoun =
    /\b(checklist|check-list|form|report|letter|procedure|template|memo|plan|table|document|protocol)\b/.test(q) ||
    /(чек-?лист|форм|отчёт|отчет|письмо|процедур|шаблон|бланк|документ|таблиц|протокол|акт)/.test(q);
  const createVerb =
    /\b(generate|create|make|draft|write up|build|prepare|produce|fill (in|out))\b/.test(q) ||
    /(сгенерируй|создай|сделай|состав|подготов|напиши|заполни|оформи)/.test(q);
  const editVerb =
    /\b(edit|update|revise|modify|change|amend|correct|rewrite)\b/.test(q) ||
    /(отредактир|поправ|исправ|измени|перепиши|дополни)/.test(q);
  // Create a document, OR (edit/produce something) that clearly targets a file.
  return (createVerb && docNoun) || ((editVerb || createVerb) && wantsFile) || (docNoun && wantsFile);
}

function isOperationalScenario(question) {
  if (!question) return false;
  const q = question.toLowerCase();
  return (
    q.includes("can we") || q.includes("should we") || q.includes("continue") ||
    q.includes("stop") || q.includes("suspend") || q.includes("operation") ||
    q.includes("cargo") || q.includes("ballast") || q.includes("bunkering") ||
    q.includes("terminal") || q.includes("pressure") || q.includes("limit") ||
    q.includes("risk")
  );
}

const TRUSTED_SOURCE_DOMAINS = new Set([
  // IMO & UN
  "imo.org", "un.org", "ilo.org", "who.int",
  // Flag states
  "amp.gob.pa", "liscr.com", "register-iri.com", "bahamasmaritime.com",
  "transport.gov.mt", "mpac.gov.sg", "mardep.gov.hk", "dms.gov.cy",
  "sdir.no", "gov.uk", "hcg.gr", "gov.im", "cishipping.com", "abregistry.ag",
  "emsa.europa.eu",
  // Classification societies
  "classnk.or.jp", "dnv.com", "lr.org", "eagle.org",
  "bureauveritas.com", "rina.org", "ccs.org.cn", "krs.co.kr",
  // PSC & coast guards
  "paris-mou.org", "tokyo-mou.org", "uscg.mil", "amsa.gov.au",
  "iomou.org", "bsmou.org",
  // Industry bodies
  "ocimf.org", "intertanko.com", "sigtto.org", "intercargo.org",
  "bimco.org", "itfglobal.org", "iicl.org",
  // Casualty / investigation
  "maib.gov.uk", "ntsb.gov", "atsb.gov.au",
]);

function isTrustedSource(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return [...TRUSTED_SOURCE_DOMAINS].some((d) => hostname === d || hostname.endsWith("." + d));
  } catch {
    return false;
  }
}

const FLAG_DOMAINS = {
  "Panama": "amp.gob.pa",
  "Liberia": "liscr.com",
  "Marshall Islands": "register-iri.com",
  "Bahamas": "bahamasmaritime.com",
  "Malta": "transport.gov.mt",
  "Singapore": "mpac.gov.sg",
  "Hong Kong": "mardep.gov.hk",
  "Cyprus": "dms.gov.cy",
  "Norway": "sdir.no",
  "United Kingdom": "gov.uk",
  "Greece": "hcg.gr",
  "Isle of Man": "gov.im",
  "Cayman Islands": "cishipping.com",
  "Antigua & Barbuda": "abregistry.ag",
};

const CLASS_DOMAINS = {
  "ClassNK": "classnk.or.jp",
  "DNV": "dnv.com",
  "Lloyd's Register": "lr.org",
  "LR": "lr.org",
  "ABS": "eagle.org",
  "Bureau Veritas": "bureauveritas.com",
  "BV": "bureauveritas.com",
  "RINA": "rina.org",
  "CCS": "ccs.org.cn",
  "Korean Register": "krs.co.kr",
  "KR": "krs.co.kr",
};

function needsWebSearch(question, vesselProfile = null) {
  if (!question) return false;
  const q = question.toLowerCase();
  const generalTriggers = [
    "solas", "marpol", "stcw", "ism", "isps", "isgott",
    "regulation", "requirement", "certificate", "inspection",
    "port state", "psc", "flag state", "class", "classification",
    "imo", "msc", "mepc", "circular", "amendment", "code",
    "latest", "current", "updated", "new rule", "how many",
    "minimum", "maximum", "what is required", "procedure",
    "interval", "frequency", "drill", "record", "log",
  ];
  if (generalTriggers.some((t) => q.includes(t))) return true;

  // With a vessel profile, cast a wider net for anything compliance-adjacent
  if (vesselProfile?.flag || vesselProfile?.classification) {
    const profileTriggers = [
      "rule", "standard", "guidance", "compliance", "survey", "renewal",
      "deficiency", "detention", "vetting", "sire", "cdi", "rightship",
      "test", "audit", "must", "shall", "required", "flag", "notice",
      "equipment", "maintain", "check", "confirm", "verify", "valid",
    ];
    if (profileTriggers.some((t) => q.includes(t))) return true;
  }

  return false;
}

export const runtime = "nodejs";

// Hard cap on how many drawing page images are sent to vision in a single
// request. The pre-analyzed text index already grounds the model; the images
// are for visual verification, so a handful is plenty — and it keeps latency and
// cost bounded (too many high-detail images can stall the request).
const MAX_DRAWING_IMAGES = 6;

// Clients are created lazily (only at request time) so a missing key never
// breaks the build's page-data collection step.
// OpenAI stays as the RETRIEVAL/vector-DB provider: we search its vector
// stores directly (retrieve-then-generate) and feed the chunks to Claude.
let _openai;
function getOpenAI() {
  return (_openai ||= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
}

// Anthropic is the GENERATION provider — the "brain" that writes the answer.
let _anthropic;
function getAnthropic() {
  return (_anthropic ||= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));
}

// Model per plan tier — the core cost lever. Cheaper model on the entry tier,
// smarter models as a paid upgrade. All env-overridable so the dial stays here.
//   • standard (free, Starter) → Haiku 4.5  — cheapest, still strong for entry
//   • advance  (Plus, Pro)      → Sonnet 5   — the balanced workhorse
//   • deep     (Premium, Max)   → Opus 4.8   — top reasoning
const MODEL_STANDARD = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
const MODEL_ADVANCE = process.env.ANTHROPIC_MODEL_ADVANCE || "claude-sonnet-5";
const MODEL_DEEP = process.env.ANTHROPIC_MODEL_DEEP || "claude-opus-4-8";

// Adaptive-thinking effort ("low" | "medium" | "high" | "xhigh" | "max").
// Cost-aware: everyday chat runs "low" (cheap, snappy — adaptive thinking still
// deepens on its own when needed); safety-critical operational questions run
// "high". Both overridable via env.
const EFFORT = process.env.ANTHROPIC_EFFORT || "low";
const EFFORT_OPERATIONAL = process.env.ANTHROPIC_EFFORT_OPERATIONAL || "high";

// Per-plan reasoning tier. Higher paid tiers think harder (more adaptive-thinking
// budget) and, once a stronger model is configured, run it. "standard" keeps the
// cheap defaults; "advance"/"deep" raise effort and can point at a bigger model
// via env. All values are env-tunable so the cost/quality dial stays in one place.
const EFFORT_ADVANCE = process.env.ANTHROPIC_EFFORT_ADVANCE || "medium";
const EFFORT_DEEP = process.env.ANTHROPIC_EFFORT_DEEP || "high";

function aiConfigForModelTier(tier) {
  if (tier === "deep") {
    return { model: MODEL_DEEP, effort: EFFORT_DEEP };
  }
  if (tier === "advance") {
    return { model: MODEL_ADVANCE, effort: EFFORT_ADVANCE };
  }
  return { model: MODEL_STANDARD, effort: EFFORT };
}

// Plan tier for model/context selection comes from a CLIENT hint (default free).
// We deliberately do NOT read it via the Admin SDK on the answer's critical path:
// that Firestore/gRPC call runs in a native layer that a JS try/catch can't guard,
// and a stall or hard crash there would kill the serverless function before a
// single token streamed (a 500 with no answer). Billing/metering stays
// authoritative server-side — but it runs AFTER the answer, so it can never block
// generation. A spoofed tier only affects answer depth for that user, who is
// still metered correctly.
function resolvePlanKey(clientHint) {
  return clientHint || "free";
}

// Output cap. Generous so long maritime answers (+ adaptive thinking) aren't
// truncated; only tokens actually produced are billed. Override via ANTHROPIC_MAX_TOKENS.
const MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS) || 8000;

// Retrieval tuning. Capping results and dropping low-relevance chunks keeps
// answers sharper and cheaper (fewer tokens). Overridable via env.
const FILE_SEARCH_MAX_RESULTS = Number(process.env.OPENAI_FILE_SEARCH_MAX_RESULTS) || 6;
const FILE_SEARCH_SCORE_THRESHOLD =
  process.env.OPENAI_FILE_SEARCH_SCORE_THRESHOLD !== undefined
    ? Number(process.env.OPENAI_FILE_SEARCH_SCORE_THRESHOLD)
    : 0.4;
// Hard cap on characters injected per retrieved chunk — keeps RAG context (and
// its token cost) bounded even when a document returns very long passages.
const FILE_SEARCH_CHUNK_CHARS = Number(process.env.OPENAI_FILE_SEARCH_CHUNK_CHARS) || 1200;

// ===== Retrieval (OpenAI vector stores → chunks) =====

// Search each vector store directly and return the top chunks overall. This
// replaces OpenAI's agentic `file_search` tool: we do the retrieval ourselves so
// the generated answer can come from Claude while the vector DB stays on OpenAI.
async function retrieveContext(question, storeIds, maxResults = FILE_SEARCH_MAX_RESULTS) {
  if (!storeIds.length) return [];
  const perStore = await Promise.all(
    storeIds.map((id) =>
      getOpenAI().vectorStores
        .search(id, {
          query: String(question),
          max_num_results: maxResults,
          rewrite_query: true,
          ranking_options: { ranker: "auto", score_threshold: FILE_SEARCH_SCORE_THRESHOLD },
        })
        .then((r) => r.data || [])
        .catch((e) => {
          console.error("Vector store search failed:", id, e?.message || e);
          return [];
        })
    )
  );
  return perStore
    .flat()
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, maxResults);
}

// Turn retrieved chunks into a system-prompt block. Each chunk is labelled with
// its source filename so the model can cite it inline via [[cite:FILENAME]].
function buildRetrievedBlock(chunks) {
  if (!chunks.length) return null;
  const parts = chunks.map((c) => {
    let text = (c.content || [])
      .map((p) => p?.text)
      .filter(Boolean)
      .join("\n")
      .trim();
    if (text.length > FILE_SEARCH_CHUNK_CHARS) {
      text = text.slice(0, FILE_SEARCH_CHUNK_CHARS) + "…";
    }
    return `SOURCE FILE: ${c.filename || "unknown"}\n${text}`;
  });
  return [
    "═══════════════════════════════════════════",
    "RETRIEVED LIBRARY CONTEXT (from the user's documents)",
    "═══════════════════════════════════════════",
    "The passages below were retrieved from the user's uploaded documents as most relevant to this question. Prefer these facts over generic knowledge, and cite the SOURCE FILE inline via [[cite:EXACT_FILENAME]] when a claim comes from one. If they don't answer the question, say so — do not invent a source.",
    "",
    parts.join("\n\n---\n\n"),
    "═══════════════════════════════════════════",
  ].join("\n");
}

// Build a Claude image content block from a URL or a data: URL.
function toImageBlock(url) {
  if (typeof url !== "string") return null;
  if (url.startsWith("data:")) {
    const m = url.match(/^data:([^;]+);base64,(.*)$/);
    if (!m) return null;
    return { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } };
  }
  return { type: "image", source: { type: "url", url } };
}

// ===== SSE helper =====

function sse(event, data) {
  const safe = String(data ?? "").replace(/\n/g, "\\n");
  return `event: ${event}\ndata: ${safe}\n\n`;
}

// ===== POST handler =====

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("BODY:", body);
    
    const {
      uid = null,
      plan: clientPlan = null,
      question,
      chatHistory = [],
      summary = "",
      imageUrls = [],
      documentFiles = [],
      vectorStoreIds = [],
      vesselProfile = null,
      topicInstruction = "",
      topicMemory = "",
      searchPastChats = true,
      crossTopicMemory = "",
      crossTopicStoreIds = [],
      // Vessel drawings selected for this query: [{url, name}].
      // Passed as vision inputs so the model can read layouts, schematics, and
      // annotations directly — not just indexed text extracted from the file.
      vesselDrawings = [],
      // Names/types of the WHOLE vessel library (drawings + manuals) the user has
      // uploaded. Their content is searchable via File Search; this list makes the
      // model AWARE of what exists so it searches instead of answering generically.
      vesselLibrary = [],
    } = body;

    // Documents are no longer parsed inline — their content reaches the model
    // through the File Search tool over a vector store. `documentFiles` now only
    // carries the filenames attached in THIS message, so the citation
    // instruction can name them; the actual retrieval is `vectorStoreIds`.
    const hasImages = imageUrls.length > 0;
    const hasDrawings = vesselDrawings.length > 0;
    // Merge cross-topic store IDs into the search pool (deduplicated)
    const allVectorStoreIds = [...new Set([...vectorStoreIds, ...(Array.isArray(crossTopicStoreIds) ? crossTopicStoreIds : [])])];
    const hasDocs = allVectorStoreIds.length > 0;

    // Citation instruction — asks the model to mark which document a claim came
    // from, so the client can render clickable source pills (Level 1). Works for
    // both files attached now and files retrieved from earlier uploads.
    const docNames = documentFiles.map((d) => d?.name).filter(Boolean);
    const drawingNames = vesselDrawings.map((d) => d?.name).filter(Boolean);
    const fileCitationBlock = (hasDocs || hasDrawings)
      ? [
          "═══════════════════════════════════════════",
          "SOURCE FILE CITATION — REQUIRED WHEN USING DOCUMENTS OR DRAWINGS",
          "═══════════════════════════════════════════",
          "You have access to the user's documents through the File Search tool.",
          ...(docNames.length
            ? ["Files attached in this message:", ...docNames.map((n) => `- ${n}`), ""]
            : []),
          ...(drawingNames.length
            ? ["Vessel drawings provided as images:", ...drawingNames.map((n) => `- ${n}`), ""]
            : []),
          "When a sentence or claim in your answer is based on a document returned by File Search, place an INLINE citation marker IMMEDIATELY AFTER that sentence, in EXACTLY this format:",
          "[[cite:EXACT_FILENAME]]",
          "Rules:",
          "- Put each marker right after the specific sentence/claim it supports — NOT all bunched at the end.",
          "- Use the EXACT source filename of the retrieved document (including its extension).",
          "- Different claims may come from different files — cite each claim to the file it actually came from.",
          "- Only cite a document when that specific claim genuinely comes from it. Do NOT cite for general knowledge.",
          "- Never mention, explain, or describe these markers in your prose — they are parsed by the app and rendered as small clickable source pills.",
          "- NEVER cite internal conversation-memory files (filenames starting with \"memory-\"). Use them only as background context for continuity; they are not user-facing sources.",
          "═══════════════════════════════════════════",
        ].join("\n")
      : null;

    // Build vessel profile context block — only include non-empty fields
    function buildVesselBlock(vp) {
      if (!vp?.rank || !vp?.vesselType) return null;
      const line = (label, val, skip) => (val && val !== skip) ? `${label}: ${val}` : null;

      const flagDomain = vp.flag ? FLAG_DOMAINS[vp.flag] : null;
      const classDomain = vp.classification ? CLASS_DOMAINS[vp.classification] : null;

      const vesselTypeCode = (() => {
        if (vp.vesselType === "LNG") return "IGC Code (Gas Carriers) applies. All cargo and safety answers must be filtered through IGC.";
        if (vp.vesselType === "LPG") return "IGC Code (Gas Carriers) applies. Apply fully pressurised / semi-refrigerated rules as appropriate to this vessel.";
        if (vp.vesselType === "Chemical Tanker") return "IBC Code applies. Always cite specific product and category requirements.";
        if (vp.vesselType === "Oil Tanker") return "MARPOL Annex I, OCIMF/SIRE standards, and tanker-specific SOLAS requirements apply.";
        if (vp.vesselType === "Bulk Carrier") return "IMSBC Code and SOLAS XII (Bulk Carrier Safety) apply.";
        if (vp.vesselType === "Container") return "IMDG Code (if carrying DG), CSS Code, and SOLAS VI cargo securing requirements apply.";
        if (vp.vesselType === "Ro-Ro") return "SOLAS II-2 (fire safety), the Stockholm Agreement (if applicable), and stability requirements for Ro-Ro vessels apply.";
        if (vp.vesselType === "Passenger") return "SOLAS passenger ship requirements and relevant flag state passenger safety regulations apply.";
        if (vp.vesselType === "Offshore") return "MWS requirements, flag state offshore standards, and relevant DP class rules apply.";
        return null;
      })();

      const rows = [
        "═══════════════════════════════════════════",
        "ACTIVE VESSEL PROFILE — MANDATORY PERSONALISATION",
        "═══════════════════════════════════════════",
        "",
        "HOW YOU MUST USE THIS PROFILE (non-negotiable):",
        "",
        `1. RANK-AWARE COMMUNICATION — The user's rank is "${vp.rank}". Use it intelligently, not robotically.

   HOW to use the rank:
   - Vary how and where you reference it. Sometimes open with it naturally ("Hey Chief, ...", "Second Officer — worth noting...", "Слушай, старпом, тут важно..."). Other times embed it mid-response ("Since you're the ${vp.rank}, your main concern here is...") or use it at the end ("That's the part that typically falls on the ${vp.rank} to manage.").
   - Never default to a stiff "[Rank], the requirement is..." opener on every single response. Rotate approaches.
   - Use rank to infer responsibilities and tailor depth. A Chief Officer owns ISM/SMS, cargo, stability, and COLREG compliance. A Chief Engineer owns machinery systems, fuel management, and planned maintenance. A 2nd Officer owns navigation equipment, GMDSS, and fire safety records. An ETO owns electrical systems, automation, and comms. Match your answer focus to what this rank actually does aboard.
   - LANGUAGE: respond in the same language the user writes in. If Russian — write in Russian and use Russian maritime addressing naturally ("Старпом, ...", "Слушай, как второй помощник..."). If English — use English. If Spanish — use Spanish. Never force a language switch.
   - Sound like a knowledgeable colleague who knows who they're talking to — not a compliance officer reading from a checklist.`,
        "",
        vp.flag
          ? `2. FLAG STATE — This vessel is registered under ${vp.flag} flag. For ANY question touching compliance, certificates, surveys, or circulars, you MUST search ${flagDomain ? `site:${flagDomain}` : `the ${vp.flag} maritime authority`} for the current applicable marine notice or circular. Do NOT give a generic IMO answer when a ${vp.flag}-specific answer exists.`
          : "2. FLAG STATE — Flag not specified. Apply general international requirements.",
        "",
        vp.classification
          ? `3. CLASSIFICATION SOCIETY — This vessel is classed by ${vp.classification}. For ANY question involving class surveys, technical rules, or equipment standards, search ${classDomain ? `site:${classDomain}` : `the ${vp.classification} website`} for the current applicable rule. ${vp.classification} rules are mandatory — do not substitute with generic IACS guidance.`
          : "3. CLASS — Not specified. Apply general IACS standards.",
        "",
        vesselTypeCode ? `4. VESSEL TYPE CODE — ${vesselTypeCode}` : `4. VESSEL TYPE — Apply ${vp.vesselType} specific requirements only.`,
        "",
        "5. NEVER REPEAT THE PROFILE — Do not summarise or repeat these vessel details back to the user. They know their own ship. Use this data silently to give a more precise, vessel-specific answer.",
        "",
        "6. SOURCES — When web search is used, always include the direct link to the official flag state or class society source. Links must appear as clickable markdown: [Source Name](URL).",
        "",
        "═══════════════════════════════════════════",
        "VESSEL DATA:",
        "═══════════════════════════════════════════",
        line("Rank", vp.rank),
        line("Vessel Type", vp.vesselType),
        line("LPG Type", vp.lpgType),
        line("Offshore Type", vp.offshoreType),
        line("DP Class", vp.dpClass),
        vp.capacity ? `Vessel Capacity: ${vp.capacity} ${vp.capacityUnit || ""}`.trim() : null,
        line("Flag State", vp.flag),
        line("Classification Society", vp.classification),
        line("Ballast Water Treatment", vp.ballastSystem),
        line("Ice Class", vp.iceClass, "No Ice Class"),
        // LNG advanced
        line("LNG Containment System", vp.lngContainment),
        vp.lngTankPressure ? `LNG Tank Design Pressure: ${vp.lngTankPressure} bar` : null,
        vp.lngBor ? `Natural Boil-Off Rate: ${vp.lngBor}% per day` : null,
        line("Reliquefaction Plant", vp.lngReliq),
        line("LNG Fuel System", vp.lngFuelSystem),
        line("Gas Combustion Unit (GCU)", vp.lngGcu),
        line("Sloshing Restrictions", vp.lngSloshing),
        vp.lngMaxFilling ? `Max Cargo Filling Limit: ${vp.lngMaxFilling}%` : null,
        // Engine
        line("Main Engine", vp.engMainEngine),
        line("Aux Engines", vp.engAuxEngines),
        line("Emergency Generator", vp.engEdg),
        line("Propulsion Type", vp.engPropulsion),
        line("Thrusters", vp.engThrusters, "No Thrusters"),
        line("Shaft Generator", vp.engShaftGen),
        line("Engine Fuel System", vp.engFuelSystem),
        line("Scrubber (EGCS)", vp.engScrubber, "No Scrubber"),
        line("Boiler", vp.engBoiler, "No Boiler"),
        line("Incinerator", vp.engIncinerator),
        line("Inert Gas System", vp.engInertSystem),
        line("Cargo Compressors", vp.engCargoCompressor),
        line("Deck Notes", vp.specialNotes),
        line("Engine Notes", vp.engNotes),
        vp.shipParticularsText
          ? `\nSHIP PARTICULARS (from the vessel's uploaded particulars document — treat as authoritative vessel-specific data; use silently, do not dump back):\n${String(vp.shipParticularsText).slice(0, 8000)}`
          : null,
        "═══════════════════════════════════════════",
      ].filter(Boolean);
      return rows.join("\n");
    }

    const vesselBlock = buildVesselBlock(vesselProfile);

    const topicInstructionBlock = topicInstruction
      ? [
          "═══════════════════════════════════════════",
          "TOPIC INSTRUCTIONS — SET BY USER",
          "═══════════════════════════════════════════",
          "The user has defined the following context and instructions for this topic.",
          "Apply them to all responses. They override general defaults but must comply with safety rules.",
          "",
          topicInstruction,
          "═══════════════════════════════════════════",
        ].join("\n")
      : null;

    const topicMemoryBlock = topicMemory
      ? `PAST CONVERSATION MEMORY\nThe following facts and context were accumulated from previous chats. Use them to provide continuity, avoid repeating covered ground, and build on previous work.\n\n${topicMemory}`
      : null;

    const crossTopicMemoryBlock = crossTopicMemory
      ? [
          "═══════════════════════════════════════════",
          "CROSS-TOPIC CONTEXT — OTHER TOPIC SUMMARIES",
          "═══════════════════════════════════════════",
          "The user has enabled cross-topic context. The following are memory summaries from other topics they work in.",
          "Use this as background to provide richer, more connected answers. Do NOT surface these details unprompted — only draw on them when directly relevant.",
          "",
          crossTopicMemory,
          "═══════════════════════════════════════════",
        ].join("\n")
      : null;

    const basePrompt = [
  systemInstruction,
  assistantRoleAndValue,
  responseStyle,
  safetyRules,
  confidenceCalibration,
  clarificationStrategy,
].join("\n\n---\n\n");

// Web policy is only relevant when a web search is actually likely. Loading it
// conditionally keeps it out of the prompt on the majority of requests.

// Tell the model it has a searchable library (docs + topic conversation memory)
// so it actively consults File Search instead of answering from general
// knowledge alone. Only included when a vector store is actually attached.
const fileSearchGuidance = hasDocs
  ? [
      "═══════════════════════════════════════════",
      "SEARCHABLE LIBRARY — USE FILE SEARCH",
      "═══════════════════════════════════════════",
      "You have a File Search tool connected to this conversation's library: the user's uploaded documents and, in topics, indexed memory of earlier discussion.",
      "- BEFORE answering anything that could depend on the user's own documents, vessel paperwork, port/arrival requirements, or prior context, SEARCH the library first.",
      "- Prefer specific facts found in the library over generic knowledge; the library reflects this user's actual vessel and situation.",
      "- If the library has nothing relevant, answer normally — do not invent a source.",
      ...(!searchPastChats ? [
        "- The user has disabled past conversation memory. Do NOT use any files starting with \"memory-\" from the library as context. Only use explicitly attached documents.",
      ] : []),
      "═══════════════════════════════════════════",
    ].join("\n")
  : null;

// Per-page spatial index: only the pages most relevant to this query are included.
// Built once at upload time; here we only receive what the client pre-selected.
const drawingAnalyses = vesselDrawings
  .filter((d) => d.selectedPages?.some((p) => p.description))
  .map((d) => {
    const pagesWithDesc = d.selectedPages.filter((p) => p.description);
    const pagesText =
      pagesWithDesc.length === 1
        ? pagesWithDesc[0].description
        : pagesWithDesc
            .map((p) => `--- Page ${p.pageNum} ---\n${p.description}`)
            .join("\n\n");
    return `=== ${d.name} ===\n${pagesText}`;
  })
  .join("\n\n");

const drawingAnalysisBlock = drawingAnalyses
  ? [
      "═══════════════════════════════════════════",
      "VESSEL DRAWINGS — SPATIAL INDEX (RELEVANT PAGES)",
      "═══════════════════════════════════════════",
      "The pages below were selected as most relevant to this query from the pre-analyzed drawing index. Use them for precise answers about room locations, equipment positions, safety routes, and layout.",
      "The actual drawing images are also attached for visual verification.",
      "",
      drawingAnalyses,
      "═══════════════════════════════════════════",
    ].join("\n")
  : null;

// When vessel drawings are present, tell the model what it is looking at so it
// can cite specific drawing names and describe spatial layout from the images.
const drawingsGuidance = hasDrawings
  ? [
      "═══════════════════════════════════════════",
      "VESSEL DRAWINGS — VISUAL CONTEXT",
      "═══════════════════════════════════════════",
      `The following vessel drawing(s) are attached as images for this query:`,
      vesselDrawings
        .map((d, i) => {
          const pages = d.selectedPages || [];
          const typeNote = d.drawingType ? ` [${d.drawingType}]` : "";
          const pageNote = pages.length > 1 ? ` (${pages.length} pages)` : pages.length === 1 && pages[0].pageNum > 1 ? ` (page ${pages[0].pageNum})` : "";
          return `  [Drawing ${i + 1}] ${d.name}${typeNote}${pageNote}`;
        })
        .join("\n"),
      "",
      "Examine each drawing carefully. You can read labels, dimensions, room names, equipment positions, escape routes, pipe runs, or any other markings visible on the drawing.",
      "CITATION: when a sentence states something you read from a drawing, place an INLINE marker [[cite:EXACT_FILENAME]] right after that sentence, using the drawing's exact filename from the list above. This renders as a small clickable pill INSIDE your text — do not describe it. Do NOT dump the drawing name as a separate line or footer; cite it inline at the point it is used.",
      "If the drawing is a scanned or low-resolution image and certain details are unclear, say so rather than guessing.",
      "═══════════════════════════════════════════",
    ].join("\n")
  : null;

// Make the model aware of the user's uploaded vessel library so it consults
// File Search for vessel/equipment-specific questions instead of answering from
// generic knowledge. This is the difference between "a standard VHF usually has
// 25W/1W" and actually reading THIS vessel's VHF manual.
const vesselLibraryBlock = (Array.isArray(vesselLibrary) && vesselLibrary.length)
  ? [
      "═══════════════════════════════════════════",
      "VESSEL LIBRARY — UPLOADED DRAWINGS & MANUALS (SEARCHABLE)",
      "═══════════════════════════════════════════",
      "The user has uploaded the following vessel-specific documents. Their full content is available to you through the File Search tool:",
      ...vesselLibrary.map((d) => `- ${d.name}${d.kind ? ` [${d.kind}]` : ""}`),
      "",
      "RULES:",
      "- Search the library by MEANING, not by filename. File Search retrieves the relevant passages even from large, multi-topic documents — rely on the content that actually answers the question, wherever it sits.",
      "- When a question concerns this vessel's equipment, systems, or drawings, search the library FIRST. Do NOT answer vessel-specific questions from generic knowledge when a relevant document exists.",
      "- SOURCE HONESTY (critical): always state which document each fact came from, and cite it inline ([[cite:EXACT_FILENAME]]). NEVER present data from one document as if it came from another.",
      "- If the user asks about a specific item (e.g. \"E-302\", \"the motor\") and the content you found actually comes from a DIFFERENT document, say so explicitly — e.g. \"I don't see readable E-302 content; the closest match is the booster-pump document, which says…\". Let the captain decide; do not silently imply it answers the original item.",
      "- If nothing in the library answers the question (or a document is a scan with no readable content yet), say so plainly — the file may still be processing or may need re-uploading. Do not fall back to generic figures and present them as this vessel's.",
      "═══════════════════════════════════════════",
    ].join("\n")
  : null;

// Split the system prompt by volatility so we can PROMPT-CACHE the stable part.
// The stable prefix (base instructions + vessel profile + library + topic
// context) is identical across messages in a session, so Claude caches it and
// re-reads it at ~10% of the input price — the single biggest cost saver.
// NOTE: memory blocks are deliberately NOT here — they get rewritten after every
// answer, so keeping them in the cached prefix would bust the cache each turn.
const stableSystemText = [
  basePrompt,
  vesselBlock,
  vesselLibraryBlock,
  topicInstructionBlock,
].filter(Boolean).join("\n\n---\n\n");

// Per-message guidance depends on THIS message's attachments/question, so it
// changes every turn and stays out of the cached prefix.
const perMessageGuidance = [
  drawingAnalysisBlock,
  hasDrawings ? drawingsGuidance : null,
  hasImages ? imageAnalysisGuide : null,
  hasDocs ? documentAnalysisGuidance : null,
  fileSearchGuidance,
  fileCitationBlock,
  isOperationalScenario(question) ? operationalReasoningPolicy : null,
  needsWebSearch(question, vesselProfile) ? webAutonomyPolicy : null,
  needsDocGeneration(question) ? documentGenerationGuidance : null,
].filter(Boolean).join("\n\n---\n\n");

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(sse("error", "Missing ANTHROPIC_API_KEY"), {
        status: 500,
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      });
    }
    if (hasDocs && !process.env.OPENAI_API_KEY) {
      return new Response(sse("error", "Missing OPENAI_API_KEY (needed for document retrieval)"), {
        status: 500,
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      });
    }

    if (!question || !String(question).trim()) {
      return new Response(sse("error", "Question is required"), {
        status: 400,
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start: async (controller) => {
        try {
          controller.enqueue(encoder.encode(sse("status", "start")));

          // ── Plan tier (authoritative, server-side) ──
          // Drives which reasoning model/effort the answer runs at and how many
          // document chunks it may draw on. Read from the user doc so it can't be
          // spoofed by the client.
          const planKey = resolvePlanKey(clientPlan);
          const modelTier = modelTierFor(planKey);
          const { model: chatModel, effort: tierEffort } = aiConfigForModelTier(modelTier);
          const maxResults = docChunksFor(planKey);

          // ── Retrieval step (OpenAI vector DB) ──
          // Pull the most relevant chunks from the user's documents ourselves,
          // then hand them to Claude as context (retrieve-then-generate).
          let retrievedBlock = null;
          if (hasDocs) {
            let chunks = await retrieveContext(question, allVectorStoreIds, maxResults);
            // Respect the "past conversation memory" toggle: drop memory-* files.
            if (!searchPastChats) {
              chunks = chunks.filter(
                (c) => !String(c.filename || "").startsWith("memory-")
              );
            }
            retrievedBlock = buildRetrievedBlock(chunks);
          }

          const summaryBlock = summary
            ? `IMPORTANT CONTEXT FROM EARLIER IN THIS CHAT.\nThis information MUST be considered when answering the user.\n${summary}`
            : null;

          // Volatile system content (memory that changes each turn + per-message
          // guidance + running summary + retrieved chunks) goes AFTER the cached
          // prefix so it never breaks the cache.
          const volatileSystemText = [
            topicMemoryBlock,
            crossTopicMemoryBlock,
            perMessageGuidance,
            summaryBlock,
            retrievedBlock,
          ]
            .filter(Boolean)
            .join("\n\n---\n\n");

          // System as blocks: cache the stable prefix (ephemeral), volatile after.
          const system = [
            { type: "text", text: stableSystemText, cache_control: { type: "ephemeral" } },
            ...(volatileSystemText ? [{ type: "text", text: volatileSystemText }] : []),
          ];

          // Collect drawing page images, skipping anything that isn't a fetchable
          // raster image (Vision can't decode PDF/TIFF URLs). Cap the total so a
          // multi-drawing query can't flood the request with high-detail images.
          const drawingImageUrls = vesselDrawings
            .flatMap((d) => (d.selectedPages || []).map((p) => p?.url))
            .filter((u) => typeof u === "string" && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u))
            .slice(0, MAX_DRAWING_IMAGES);

          // Anthropic messages: user/assistant only (system is top-level), and
          // the first message must be `user` — drop any leading assistant turns.
          //
          // Carry forward image attachments from EARLIER user turns so the model
          // can still see a form/photo it discussed a few messages ago. Without
          // this, history is text-only and the visual is lost after its turn —
          // the model ends up asking the user to "re-send the form". We re-attach
          // by URL, newest-first, capped so cost/latency stay bounded. (Text
          // screenshots were OCR'd into the store, so we only re-attach genuine
          // images; documents stay retrievable via File Search regardless.)
          const IMAGE_MIME = /^image\//i;
          const MAX_HISTORY_IMAGES = 6;
          const carryUrls = new Set();
          {
            let budget = MAX_HISTORY_IMAGES;
            for (let i = chatHistory.length - 1; i >= 0 && budget > 0; i--) {
              const m = chatHistory[i];
              if (m?.role !== "user" || !Array.isArray(m.attachments)) continue;
              for (const a of m.attachments) {
                if (budget <= 0) break;
                if (a?.url && IMAGE_MIME.test(a.type || "")) {
                  carryUrls.add(a.url);
                  budget--;
                }
              }
            }
          }

          const historyMsgs = chatHistory
            .filter((m) => m && (m.role === "user" || m.role === "assistant"))
            .map((m) => {
              const text = String(m.content ?? "");
              const imgs =
                m.role === "user" && Array.isArray(m.attachments)
                  ? m.attachments
                      .filter((a) => a?.url && carryUrls.has(a.url))
                      .map((a) => toImageBlock(a.url))
                      .filter(Boolean)
                  : [];
              if (imgs.length) {
                // Skip an empty text block (attachment-only turn) — Anthropic
                // rejects empty text content.
                const blocks = text.trim()
                  ? [{ type: "text", text }, ...imgs]
                  : [...imgs];
                return { role: m.role, content: blocks };
              }
              return { role: m.role, content: text };
            });
          while (historyMsgs[0]?.role === "assistant") historyMsgs.shift();

          const messages = [
            ...historyMsgs,
            {
              role: "user",
              content: [
                { type: "text", text: String(question) },
                ...drawingImageUrls.map(toImageBlock).filter(Boolean),
                ...imageUrls.map(toImageBlock).filter(Boolean),
              ],
            },
          ];

          // Cache the conversation prefix too: mark the last PRIOR turn so
          // Claude re-reads all earlier history at ~10% instead of full price.
          // The turn's content may be a plain string OR an array of blocks (when
          // it carried image attachments) — mark the LAST block either way.
          if (historyMsgs.length > 0) {
            const last = messages[historyMsgs.length - 1];
            const blocks = Array.isArray(last.content)
              ? [...last.content]
              : [{ type: "text", text: String(last.content) }];
            blocks[blocks.length - 1] = {
              ...blocks[blocks.length - 1],
              cache_control: { type: "ephemeral" },
            };
            last.content = blocks;
          }

          const useWebSearch = needsWebSearch(question, vesselProfile);
          const tools = useWebSearch
            ? [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }]
            : undefined;

          // Effort: the plan tier sets the baseline; a safety-critical operational
          // question always bumps to the highest effort regardless of plan.
          const effort = isOperationalScenario(question) ? EFFORT_OPERATIONAL : tierEffort;

          // Watchdog: a stalled generation (Anthropic overload / rate-limit
          // retries, a hung connection) must never leave the client on an endless
          // spinner. If it doesn't finish in time we abort, so finalMessage()
          // rejects and the catch below surfaces a real error the user can see.
          console.log(`[rag] starting generation | model=${chatModel} effort=${effort} web=${useWebSearch} docs=${hasDocs}`);

          const genAbort = new AbortController();
          const GEN_TIMEOUT_MS = Number(process.env.ANTHROPIC_TIMEOUT_MS) || 75000;
          const watchdog = setTimeout(() => genAbort.abort(), GEN_TIMEOUT_MS);

          const claudeStream = getAnthropic().messages.stream(
            {
              model: chatModel,
              max_tokens: MAX_TOKENS,
              system,
              messages,
              thinking: { type: "adaptive" },
              output_config: { effort },
              ...(tools ? { tools } : {}),
            },
            { signal: genAbort.signal }
          );

          // Stream text deltas out as `token` events (thinking stays server-side).
          claudeStream.on("text", (delta) => {
            controller.enqueue(encoder.encode(sse("token", delta)));
          });

          let finalMessage;
          try {
            finalMessage = await claudeStream.finalMessage();
          } finally {
            clearTimeout(watchdog);
          }

          // Proof-of-provider + cost signal in the server logs (Vercel → Logs):
          // shows the exact Claude model that answered and the token usage.
          console.log(
            `[rag] plan=${planKey} tier=${modelTier} effort=${effort} chunks=${maxResults} | answered by ${finalMessage.model} | usage:`,
            finalMessage.usage
          );

          // Billed = uncached input + output (Anthropic's input_tokens already
          // excludes the cached prefix). We record it server-side (tamper-proof)
          // via the Admin SDK when possible — but AFTER the stream is closed, so a
          // slow/failed Admin write can never delay or block the answer.
          const u = finalMessage.usage || {};
          const billed = (u.input_tokens || 0) + (u.output_tokens || 0);
          const willRecordServerSide = billed > 0 && uid && hasAdminCreds();

          // Collect trusted web-search sources for the clickable source pills.
          const collectedSources = [];
          const seenUrls = new Set();
          for (const block of finalMessage.content || []) {
            if (block.type !== "web_search_tool_result") continue;
            const results = Array.isArray(block.content) ? block.content : [];
            for (const r of results) {
              if (
                r?.type === "web_search_result" &&
                r.url &&
                !seenUrls.has(r.url) &&
                isTrustedSource(r.url)
              ) {
                seenUrls.add(r.url);
                collectedSources.push({ title: r.title, url: r.url });
              }
            }
          }

          // Send everything and CLOSE the stream first → the client finalizes the
          // answer immediately, independent of metering.
          if (billed > 0) {
            controller.enqueue(
              encoder.encode(sse("usage", JSON.stringify({ billed, serverRecorded: willRecordServerSide })))
            );
          }
          if (collectedSources.length > 0) {
            controller.enqueue(
              encoder.encode(sse("sources", JSON.stringify(collectedSources)))
            );
          }
          controller.enqueue(encoder.encode(sse("status", "done")));
          controller.close();

          // Metering runs AFTER the stream is closed — best-effort, never on the
          // answer's critical path (the Admin/gRPC write can be slow or fail).
          if (willRecordServerSide) {
            try {
              await recordTokenUsageAdmin(uid, billed);
            } catch (e) {
              console.error("[rag] server metering failed:", e?.message || e);
            }
          }

        } catch (e) {
          controller.enqueue(
            encoder.encode(sse("error", e?.message || String(e)))
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    // Log the real cause (Vercel → Logs) and surface it to the client instead of
    // a generic "Bad request", so a failing request shows a real error rather
    // than an endless spinner.
    console.error("[rag] request error:", error?.message || error, error?.stack || "");
    return new Response(sse("error", `Server error: ${error?.message || "bad request"}`), {
      status: 400,
      headers: { "Content-Type": "text/event-stream; charset=utf-8" },
    });
  }
}
