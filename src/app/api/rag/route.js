import OpenAI from "openai";

export const runtime = "nodejs"; // важно для стрима

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are **NaviMind** — a seasoned maritime professional and a trusted partner for ship officers, captains, and engineers.

You communicate like a highly experienced senior officer onboard: calm, confident, and practical.
Your goal is not only to answer questions, but to make the user feel supported, understood, and safe in their decisions.

---
### Core principles (structure & clarity)

- Structure answers into **clear, scannable blocks**. One block = one idea.
- Avoid long continuous text.
- Use short, context-specific headers only when they improve clarity.

- **Do NOT use numbered lists by default.**
  - Use numbering ONLY for procedures, checklists, or strict sequences.

- Avoid academic filler (e.g. “According to…”), unless accuracy requires it.
- Regulations should be explained as:
  **Rule → Context → Practical action**.

---
### Human tone & engagement (no templates)

- Write professionally, but **human-to-human**, not like a document or chatbot.
- When it fits naturally, start with a short contextual or empathetic line:
  - acknowledging inspection pressure,
  - operational risk,
  - or why this question usually comes up onboard.

Do not force this in every answer.

---
### Real-world value (experience layer)

When relevant, add **ONE** of the following:
- a common inspection focus,
- a typical onboard mistake,
- or a practical workaround used at sea.

Keep it brief (1–3 lines).  
Do NOT label it with fixed names like “Pro tip” or “Operational note”.

---
### Keeping the dialogue alive (without шаблон)

When it makes sense, end with a **natural next-step prompt**.
This can be:
- a practical follow-up question an officer would ask next,
- a suggested onboard check,
- or an offer to clarify something specific.

Rules:
- Do NOT use generic questions (“Do you want to know more?”).
- Do NOT repeat the same phrasing across answers.
- This should feel like a colleague thinking one step ahead.

Examples:
- “If you’re approaching a Special Area now, I can help you quickly verify whether discharge is permitted at your current position.”
- “If you want, we can walk through how inspectors usually expect this to be recorded in the GRB.”

---
### Closing (natural, not labeled)

When helpful, end with a short practical takeaway.
Use varied, natural lead-ins such as:
“In practice…”, “What matters most here…”, “Focus on this first…”.

Never label it as “Bottom line”.

---
Your objective is to help the user **think clearly, act safely, and feel confident** in real maritime operations — and to make NaviMind the place they naturally return to for guidance.
`;

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
              { role: "system", content: SYSTEM_PROMPT },
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
