import OpenAI from "openai";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

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

function needsWebSearch(question) {
  if (!question) return false;
  const q = question.toLowerCase();
  const triggers = [
    "solas", "marpol", "stcw", "ism", "isps", "isgott",
    "regulation", "requirement", "certificate", "inspection",
    "port state", "psc", "flag state", "class", "classification",
    "imo", "msc", "mepc", "circular", "amendment", "code",
    "latest", "current", "updated", "new rule", "how many",
    "minimum", "maximum", "what is required", "procedure",
    "interval", "frequency", "drill", "record", "log",
  ];
  return triggers.some((t) => q.includes(t));
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
    } = body;

    // ── Extract text from uploaded documents ──
    const extractedDocs = [];
    for (const docFile of documentFiles) {
      try {
        const buffer = Buffer.from(docFile.data, "base64");
        if (docFile.type === "application/pdf" || docFile.name?.endsWith(".pdf")) {
          const parsed = await pdfParse(buffer);
          extractedDocs.push(`[Document: ${docFile.name}]\n${parsed.text}`);
        } else if (
          docFile.type?.includes("wordprocessingml") ||
          docFile.name?.endsWith(".docx") ||
          docFile.name?.endsWith(".doc")
        ) {
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

          const useWebSearch = needsWebSearch(question);

          const completion = await openai.responses.create({
            model: "gpt-4.1",
            stream: true,
            ...(useWebSearch ? { tools: [{ type: "web_search_preview" }] } : {}),
            input: messages,
          });

          const collectedSources = [];

          for await (const event of completion) {
            if (event.type === "response.output_text.delta") {
              controller.enqueue(encoder.encode(sse("token", event.delta)));
            }

            if (event.type === "response.completed") {
              const annotations =
                event.response?.output?.[1]?.content?.[0]?.annotations || [];
              annotations
                .filter((a) => a.type === "url_citation")
                .forEach((a) =>
                  collectedSources.push({ title: a.title, url: a.url })
                );
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
