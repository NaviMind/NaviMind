
export function shouldUpdateSummary(messageCount, step = 6) {
  if (!messageCount || messageCount < step) return false;
  return messageCount % step === 0;
}

export async function generateChatSummary({ messages }) {
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const res = await fetch("/api/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    console.warn("Summary API failed");
    return null;
  }

  const data = await res.json();
  return data?.summary || null;
}
