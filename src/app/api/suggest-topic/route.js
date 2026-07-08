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
      .slice(-24)
      .map((m) => `${m.role}: ${String(m.content || "").slice(0, 1000)}`)
      .join("\n");

    const prompt = `You decide whether a maritime assistant chat has become a single, sustained TOPIC worth graduating into a dedicated Topic folder (which keeps documents and memory scoped to that theme).

Read the WHOLE conversation below and identify its DOMINANT theme — the subject the user keeps coming back to across multiple exchanges. Base your decision and the names on that dominant theme only.

Suggest graduating ONLY when ALL of these hold:
- There is ONE clearly dominant subject that spans MULTIPLE exchanges (a specific vessel issue, a port call, an inspection, a piece of equipment, an ongoing project) — not scattered or one-off Q&A.
- The user has actively built on that subject (follow-up questions, uploaded files, back-and-forth), not just mentioned it.
- A dedicated folder would genuinely help them accumulate documents and return later.

CRITICAL — avoid false themes:
- Do NOT base a name on a term that appears only ONCE or in passing (e.g. a regulation, a place, or a keyword mentioned a single time). The name must reflect what the user has REPEATEDLY engaged with.
- If the chat is short, mixed, or still a general lookup, return suggest=false. It is far better to wait than to propose a wrong or premature topic.
- Names must be concrete and grounded in the actual content — never generic ("Maritime Questions", "Chat", "General").

Conversation memory:
${summary || "(none)"}

Full recent conversation:
${transcript}

Respond with STRICT JSON only:
{"suggest": boolean, "confidence": number (0-1), "names": ["2-3 distinct topic name options, each <=6 words"], "description": "1-2 sentence description of the topic's scope"}
Set suggest=true only if you are confident (confidence >= 0.75) that the dominant theme is real and sustained. Provide 2-3 varied, natural name options grounded in that theme.`;

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
    const suggest = parsed.suggest === true && Number(parsed.confidence) >= 0.75 && names.length > 0;
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
