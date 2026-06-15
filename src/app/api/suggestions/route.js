import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { topicName, topicInstruction } = await req.json();
    if (!topicName?.trim()) return Response.json({ questions: [] });

    const context = topicInstruction?.trim()
      ? `Topic: "${topicName}"\nInstruction: "${topicInstruction}"`
      : `Topic: "${topicName}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content:
            `You are an AI assistant for maritime professionals.\n` +
            `${context}\n\n` +
            `Generate exactly 3 specific, practical questions a maritime professional might ask about this topic. ` +
            `Each question must be under 95 characters. ` +
            `Return ONLY a valid JSON array of 3 strings, nothing else. Example: ["Q1?","Q2?","Q3?"]`,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "[]";
    const questions = JSON.parse(raw);
    if (!Array.isArray(questions)) throw new Error("Not an array");
    return Response.json({ questions: questions.slice(0, 3) });
  } catch {
    return Response.json({ questions: [] }, { status: 200 });
  }
}
