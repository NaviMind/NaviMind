import OpenAI from "openai";

export const runtime = "nodejs"; // важно для стрима

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// SSE helper
function sse(event, data) {
  // data — строка
  const safe = String(data ?? "").replace(/\n/g, "\\n");
  return `event: ${event}\ndata: ${safe}\n\n`;
}

export async function POST(req) {
  try {
    const { question } = await req.json();

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

          // ✅ OpenAI streaming
          const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            stream: true,
            messages: [
              { role: "system", content: "You are a helpful maritime AI assistant." },
              { role: "user", content: String(question) },
            ],
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
