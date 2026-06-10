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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      vesselProfile = null,
    } = body;

    // ── Extract text from uploaded documents ──
    const extractedDocs = [];
    for (const docFile of documentFiles) {
      try {
        const buffer = Buffer.from(docFile.data, "base64");
        if (docFile.type === "application/pdf" || docFile.name?.endsWith(".pdf")) {
          const pdfParse = (await import("pdf-parse")).default;
          const parsed = await pdfParse(buffer);
          extractedDocs.push(`[Document: ${docFile.name}]\n${parsed.text}`);
        } else if (
          docFile.type?.includes("wordprocessingml") ||
          docFile.name?.endsWith(".docx") ||
          docFile.name?.endsWith(".doc")
        ) {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ buffer });
          extractedDocs.push(`[Document: ${docFile.name}]\n${result.value}`);
        } else if (docFile.type === "text/plain" || docFile.name?.endsWith(".txt")) {
          extractedDocs.push(`[Document: ${docFile.name}]\n${buffer.toString("utf8")}`);
        }
      } catch (e) {
        extractedDocs.push(`[Document: ${docFile.name}] (failed to extract text)`);
      }
    }

    const hasImages = imageUrls.length > 0;
    const hasDocs = extractedDocs.length > 0;

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
        "═══════════════════════════════════════════",
      ].filter(Boolean);
      return rows.join("\n");
    }

    const vesselBlock = buildVesselBlock(vesselProfile);

    const basePrompt = [
  systemInstruction,
  assistantRoleAndValue,
  responseStyle,
  safetyRules,
  confidenceCalibration,
  clarificationStrategy,
  webAutonomyPolicy,
].join("\n\n---\n\n");

const contextualBlocks = [
  vesselBlock,
  hasImages ? imageAnalysisGuide : null,
  hasDocs ? documentAnalysisGuidance : null,
  isOperationalScenario(question) ? operationalReasoningPolicy : null,
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

          const messages = [
            { role: "system", content: assembledSystemPrompt },
            ...(summaryBlock ? [summaryBlock] : []),
            ...chatHistory.map((m) => ({
              role: m.role,
              content: String(m.content),
            })),
            {
              role: "user",
              content: [
                { type: "input_text", text: String(question) },
                ...(hasDocs
                  ? [{ type: "input_text", text: `\n\n[Attached Documents]\n${extractedDocs.join("\n\n---\n\n")}` }]
                  : []),
                ...imageUrls.map((url) => ({
                  type: "input_image",
                  image_url: url,
                })),
              ],
            },
          ];

          const useWebSearch = needsWebSearch(question, vesselProfile);

          const completion = await openai.responses.create({
            model: "gpt-4.1",
            stream: true,
            ...(useWebSearch ? {
              tools: [{ type: "web_search_preview" }],
              tool_choice: "required",
            } : {}),
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
