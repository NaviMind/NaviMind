import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { message } = await req.json();
    if (!message?.trim()) return Response.json({ title: null });

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: `Generate a concise chat title (4–6 words, no quotes, no punctuation at the end) for a conversation that starts with this message: "${message.slice(0, 300)}"`,
        },
      ],
      max_completion_tokens: 20,
    });

    const title = completion.choices?.[0]?.message?.content?.trim() || null;
    return Response.json({ title });
  } catch {
    return Response.json({ title: null }, { status: 500 });
  }
}
