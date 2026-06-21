import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cheap model for the lightweight "is this chat one sustained topic?" check.
const MODEL = process.env.OPENAI_SUGGEST_MODEL || "gpt-4.1-mini";

// ───────────────────────────────────────────────────────────────────────────
// POST /api/suggest-topic
//
// Decides whether a long regular chat has become a single, sustained topic that
// would benefit from being graduated into a Topic folder — and, if so, proposes
// a name + description. Gated/cached by the caller so it runs rarely.
//
// Body: { summary?: string, messages: [{ role, content }] }
// Returns: { suggest: boolean, confidence: number, name: string, description: string }
// ───────────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ suggest: false }, { status: 200 });
    }

    const { summary = "", messages = [] } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ suggest: false }, { status: 200 });
    }

    const transcript = messages
      .slice(-20)
      .map((m) => `${m.role}: ${String(m.content || "").slice(0, 800)}`)
      .join("\n");

    const prompt = `You decide whether a maritime assistant chat has become a single, sustained TOPIC worth graduating into a dedicated Topic folder (which keeps documents and memory scoped to that theme).

Suggest graduating ONLY when ALL of these hold:
- The conversation is clearly centred on ONE coherent subject (e.g. a specific vessel issue, a port call, an inspection, a project) — not scattered, one-off, or general Q&A.
- It is substantial / ongoing (the user keeps building on the same theme).
- A dedicated folder would genuinely help (accumulating docs, returning later).

Do NOT suggest for: short chats, mixed/unrelated questions, quick lookups, or vague small talk.

Conversation memory:
${summary || "(none)"}

Recent messages:
${transcript}

Respond with STRICT JSON only:
{"suggest": boolean, "confidence": number (0-1), "names": ["2-3 distinct topic name options, each <=6 words"], "description": "1-2 sentence description of the topic's scope"}
Set suggest=true only if confidence >= 0.7. Provide 2-3 varied, natural name options the user can choose from.`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You output strict JSON only." },
        { role: "user", content: prompt },
      ],
    });

    let parsed = {};
    try {
      parsed = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
    } catch {
      parsed = {};
    }

    const names = Array.isArray(parsed.names)
      ? parsed.names.map((n) => String(n || "").slice(0, 60)).filter(Boolean).slice(0, 3)
      : [];
    const suggest = parsed.suggest === true && Number(parsed.confidence) >= 0.7 && names.length > 0;
    return Response.json({
      suggest,
      confidence: Number(parsed.confidence) || 0,
      names,
      description: String(parsed.description || "").slice(0, 400),
    });
  } catch (e) {
    console.error("suggest-topic error:", e?.message);
    return Response.json({ suggest: false }, { status: 200 });
  }
}
