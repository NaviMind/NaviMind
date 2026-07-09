import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { messages, previousSummary, mode = "chat" } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ summary: null }), { status: 200 });
    }

    const prompt = mode === "topic"
      ? `You are maintaining a cumulative knowledge base for a topic folder.

This is NOT a single chat summary — it's a growing memory of everything discussed across multiple chats in this topic.

Rules:
- Write in plain text, NOT JSON.
- Maximum 8–10 sentences.
- Capture KEY FACTS, decisions, issues, findings, and vessel-specific details from all chats.
- Include numbers, dates, rule references, and specific findings when mentioned.
- Update with new information from the latest exchange.
- Do NOT repeat facts already in the previous memory.
- Do NOT include procedural steps or assistant explanations — only facts and decisions.

Previous topic memory:
${previousSummary || "(empty)"}

Latest exchange:
${messages.map(m => `${m.role}: ${m.content}`).join("\n")}

Update the topic memory to incorporate new facts from this exchange.`
      : `
You are updating a conversation memory.

Your task is NOT to create checklists, instructions, summaries of regulations, or recommendations.

Your task is ONLY to maintain a short, stable memory of what this chat is about.

Rules:
- Write in plain text, NOT JSON.
- Maximum 4–5 short sentences.
- Focus on the overall context of the conversation, not details.
- Capture only persistent facts (vessel type, inspection type, location, user intent).
- Do NOT include procedural steps, checklists, or regulatory explanations.
- Do NOT repeat assistant answers.
- Do NOT invent new facts.

Previous memory:
${previousSummary || "(empty)"}

New messages:
${messages.map(m => `${m.role}: ${m.content}`).join("\n")}

Update the memory so that it reflects what this conversation is generally about.
If the general topic has not changed, keep the memory mostly the same.
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

    // The summary is PLAIN TEXT (the prompt forbids JSON). An empty model
    // response must NOT overwrite good memory: the old `|| "{}"` fallback
    // persisted a literal "{}" as the summary, corrupting future context. Keep
    // the previous memory instead when nothing usable came back.
    const raw = completion.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return new Response(JSON.stringify({ summary: previousSummary || null }), { status: 200 });
    }

    return new Response(JSON.stringify({ summary: raw }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ summary: null }), { status: 500 });
  }
}
