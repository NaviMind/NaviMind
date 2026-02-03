import OpenAI from "openai";

import { systemInstruction } from "@/ai/systemInstruction";
import { responseStyle } from "@/ai/responseStyle";
import { safetyRules } from "@/ai/safetyRules";
import { confidenceCalibration } from "@/ai/confidenceCalibration";
import { clarificationStrategy } from "@/ai/clarificationStrategy";
import { documentAnalysisGuidance } from "@/ai/documentAnalysisGuidance";
import { imageAnalysisGuide } from "@/ai/imageAnalysisGuide";
import { regulatoryEvidenceGuidance } from "@/ai/regulatoryEvidenceGuidance";
import { ragRules } from "@/ai/ragRules";
import { analyzeRagIntent } from "@/ai/ragIntentAnalyzer";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ===== SYSTEM PROMPT ASSEMBLY =====

const SYSTEM_PROMPT = [
  systemInstruction,
  responseStyle,
  safetyRules,
  confidenceCalibration,
  clarificationStrategy,
  ragRules,
  documentAnalysisGuidance,
  imageAnalysisGuide,
  regulatoryEvidenceGuidance,
].join("\n\n---\n\n");

// ===== SSE helper =====

function sse(event, data) {
  const safe = String(data ?? "").replace(/\n/g, "\\n");
  return `event: ${event}\ndata: ${safe}\n\n`;
}

// ===== POST handler =====

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      question,
      chatHistory = [], // [{ role, content }]
    } = body;

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
   // 🧠 RAG INTENT ANALYSIS (cheap LLM step)
const intent = await analyzeRagIntent(openai, question);

    const ragContext =
      ragChunks.length > 0
        ? `RAG CONTEXT — authoritative sources from NaviMind knowledge base:\n\n${ragChunks
            .map(
              (c, i) =>
                `SOURCE ${i + 1}:\nTitle: ${c.title}\nCategory: ${c.category}\nText:\n${c.text}`
            )
            .join("\n\n---\n\n")}`
        : "";

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start: async (controller) => {
        try {
          controller.enqueue(encoder.encode(sse("status", "start")));

          const messages = [
            {
              role: "system",
              content: `${SYSTEM_PROMPT}${
                ragContext ? `\n\n---\n\n${ragContext}` : ""
              }`,
            },

            // 🧠 Chat history
            ...chatHistory.map((m) => ({
              role: m.role,
              content: String(m.content),
            })),

            // 👤 Current question
            { role: "user", content: String(question) },
          ];

          const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            stream: true,
            messages,
          });

          for await (const chunk of completion) {
            const token = chunk?.choices?.[0]?.delta?.content;
            if (token) {
              controller.enqueue(encoder.encode(sse("token", token)));
            }
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
