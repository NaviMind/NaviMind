export async function analyzeRagIntent(openai, question) {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `
You analyze a maritime question and return a STRICT JSON object.

DO NOT answer the question.
DO NOT explain anything.

Return ONLY JSON in this format:

{
  "domain": "...",
  "knowledge_type": "...",
  "regulation_likelihood": "high | medium | low",
  "keywords": ["...", "..."]
}

Possible domains:
- safety
- security
- navigation
- environmental
- cargo
- engineering
- management
- inspection
- mixed

Possible knowledge_type:
- regulation
- best_practice
- procedure
- technical_explanation
- mixed
        `,
      },
      { role: "user", content: question },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
}