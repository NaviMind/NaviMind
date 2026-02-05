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

async function generateChatSummary({ messages }) {
  if (!messages || messages.length === 0) return "";

  const prompt = `
Summarize the following conversation in 3–4 short sentences.
Focus on the main topic, goals, and important decisions.
Do NOT include greetings or small talk.

Conversation:
${messages
  .map(m => `${m.role.toUpperCase()}: ${m.content}`)
  .join("\n")}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You summarize conversations clearly and concisely." },
        { role: "user", content: prompt },
      ],
    });

    return completion.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("❌ Failed to generate summary:", err);
    return "";
  }
}

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ===== SYSTEM PROMPT ASSEMBLY =====

const SYSTEM_PROMPT = [
  systemInstruction,
  assistantRoleAndValue,
  responseStyle,
  safetyRules,
  confidenceCalibration,
  clarificationStrategy,
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
      chatHistory = [], 
      summary = "",
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

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start: async (controller) => {
        try {
          controller.enqueue(encoder.encode(sse("status", "start")));

          const summaryBlock = summary
  ? {
      role: "system",
      content: `Conversation summary (context from earlier messages):\n${summary}`,
    }
  : null;

         const messages = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },

  ...(summaryBlock ? [summaryBlock] : []),

  ...chatHistory.map((m) => ({
    role: m.role,
    content: String(m.content),
  })),

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
