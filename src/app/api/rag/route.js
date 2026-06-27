import OpenAI from "openai";

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
// Streaming a reasoning model with vision inputs can run well past the default
// serverless timeout. Give the function room so the stream isn't killed mid-answer.
export const maxDuration = 300;

// Hard cap on how many drawing page images are sent to vision in a single
// request. The pre-analyzed text index already grounds the model; the images
// are for visual verification, so a handful is plenty — and it keeps latency and
// cost bounded (too many high-detail images can stall the request).
const MAX_DRAWING_IMAGES = 4;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Main chat model. Defaults to gpt-5.5; override via the OPENAI_MODEL env
// var if the account needs a different id (e.g. a dated suffix).
const CHAT_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

// Reasoning effort ("low" | "medium" | "high") for reasoning-class models.
// Defaults to "medium"; override via OPENAI_REASONING_EFFORT.
const REASONING_EFFORT = process.env.OPENAI_REASONING_EFFORT || "medium";

// File Search retrieval tuning. Capping results and dropping low-relevance
// chunks keeps answers sharper and cheaper (fewer tokens). Overridable via env.
const FILE_SEARCH_MAX_RESULTS = Number(process.env.OPENAI_FILE_SEARCH_MAX_RESULTS) || 8;
const FILE_SEARCH_SCORE_THRESHOLD =
  process.env.OPENAI_FILE_SEARCH_SCORE_THRESHOLD !== undefined
    ? Number(process.env.OPENAI_FILE_SEARCH_SCORE_THRESHOLD)
    : 0.3;

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
      "When answering, cite the specific drawing name you are referencing (e.g. \"According to the General Arrangement plan…\").",
      "If the drawing is a scanned or low-resolution image and certain details are unclear, say so rather than guessing.",
      "═══════════════════════════════════════════",
    ].join("\n")
  : null;

const contextualBlocks = [
  vesselBlock,
  drawingAnalysisBlock,
  hasDrawings ? drawingsGuidance : null,
  hasImages ? imageAnalysisGuide : null,
  hasDocs ? documentAnalysisGuidance : null,
  fileSearchGuidance,
  fileCitationBlock,
  isOperationalScenario(question) ? operationalReasoningPolicy : null,
  needsWebSearch(question, vesselProfile) ? webAutonomyPolicy : null,
].filter(Boolean);

const assembledSystemPrompt = [
  basePrompt,
  ...contextualBlocks,
].join("\n\n---\n\n");

    const isImageMode = hasImages || hasDocs;

    if (!process.env.OPENAI_API_KEY) {
      return new Response(sse("error", "Missing OPENAI_API_KEY"), {
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

          const summaryBlock = summary
            ? {
                role: "system",
                content: `IMPORTANT CONTEXT FROM EARLIER IN THIS CHAT.\nThis information MUST be considered when answering the user.\n${summary}`,
              }
            : null;

          // Collect drawing page images, skipping anything that isn't a fetchable
          // raster image (OpenAI Vision can't decode PDF/TIFF URLs). Cap the total
          // so a multi-drawing query can't flood the request with high-detail images.
          const drawingImageUrls = vesselDrawings
            .flatMap((d) => (d.selectedPages || []).map((p) => p?.url))
            .filter((u) => typeof u === "string" && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u))
            .slice(0, MAX_DRAWING_IMAGES);

          const messages = [
            { role: "system", content: assembledSystemPrompt },
            ...(topicInstructionBlock ? [{ role: "system", content: topicInstructionBlock }] : []),
            ...(topicMemoryBlock ? [{ role: "system", content: topicMemoryBlock }] : []),
            ...(crossTopicMemoryBlock ? [{ role: "system", content: crossTopicMemoryBlock }] : []),
            ...(summaryBlock ? [summaryBlock] : []),
            ...chatHistory.map((m) => ({
              role: m.role,
              content: String(m.content),
            })),
            {
              role: "user",
              content: [
                { type: "input_text", text: String(question) },
                ...drawingImageUrls.map((url) => ({
                  type: "input_image",
                  image_url: url,
                  detail: "high",
                })),
                ...imageUrls.map((url) => ({
                  type: "input_image",
                  image_url: url,
                  detail: "high",
                })),
              ],
            },
          ];

          const useWebSearch = needsWebSearch(question, vesselProfile);

          // Assemble tools: File Search over the scope's vector store(s) for
          // document grounding, plus web search when the question warrants it.
          const tools = [];
          if (hasDocs) {
            tools.push({
              type: "file_search",
              vector_store_ids: allVectorStoreIds,
              max_num_results: FILE_SEARCH_MAX_RESULTS,
              ranking_options: {
                ranker: "auto",
                score_threshold: FILE_SEARCH_SCORE_THRESHOLD,
              },
            });
          }
          if (useWebSearch) {
            tools.push({ type: "web_search_preview" });
          }

          const completion = await openai.responses.create({
            model: CHAT_MODEL,
            stream: true,
            ...(REASONING_EFFORT ? { reasoning: { effort: REASONING_EFFORT } } : {}),
            ...(tools.length ? { tools } : {}),
            // Force a tool only for pure web-search queries (preserves prior
            // behaviour). When documents are in play, let the model decide.
            ...(useWebSearch && !hasDocs ? { tool_choice: "required" } : {}),
            input: messages,
          });

          const collectedSources = [];

          for await (const event of completion) {
            if (event.type === "response.output_text.delta") {
              controller.enqueue(encoder.encode(sse("token", event.delta)));
            }

            if (event.type === "response.completed") {
              // Search all output items and all content parts for url_citation annotations
              for (const outputItem of (event.response?.output || [])) {
                for (const contentPart of (outputItem?.content || [])) {
                  for (const annotation of (contentPart?.annotations || [])) {
                    if (
                      annotation.type === "url_citation" &&
                      annotation.url &&
                      isTrustedSource(annotation.url)
                    ) {
                      collectedSources.push({ title: annotation.title, url: annotation.url });
                    }
                  }
                }
              }
            }

            if (event.type === "response.error") {
              controller.enqueue(
                encoder.encode(sse("error", event.error?.message || "Unknown error"))
              );
            }
          }

          if (collectedSources.length > 0) {
            controller.enqueue(
              encoder.encode(sse("sources", JSON.stringify(collectedSources)))
            );
          }

controller.enqueue(encoder.encode(sse("status", "done")));
controller.close();

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
    return new Response(sse("error", "Bad request"), {
      status: 400,
      headers: { "Content-Type": "text/event-stream; charset=utf-8" },
    });
  }
}
