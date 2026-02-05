import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ summary: null }), { status: 200 });
    }

    const prompt = `
Extract persistent operational context from the conversation.

Return STRICT JSON with these keys:
- context: inspection_type, vessel_type, flag, location
- known_issues: array
- current_focus: array
- constraints: array

Rules:
- Use ONLY information present in the conversation
- Do NOT invent facts
- Be concise
- Output JSON ONLY, no text

Conversation:
${messages.map(m => `${m.role}: ${m.content}`).join("\n")}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You extract structured operational memory for an AI assistant.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";

    let summary;
    try {
      summary = JSON.parse(raw);
    } catch {
      summary = null;
    }

    return new Response(JSON.stringify({ summary }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ summary: null }), { status: 500 });
  }
}
