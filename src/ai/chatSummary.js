
export async function fetchChatSummary({
  messages,
  previousSummary = "",
  mode = "chat",
}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return previousSummary;
  }

  try {
    const res = await fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        previousSummary,
        mode,
      }),
    });

    if (!res.ok) {
      console.warn("fetchChatSummary: bad response", res.status);
      return previousSummary;
    }

    const data = await res.json();
    return typeof data.summary === "string"
      ? data.summary
      : previousSummary;
  } catch (e) {
    console.warn("fetchChatSummary failed:", e);
    return previousSummary;
  }
}
