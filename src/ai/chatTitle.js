export async function fetchChatTitle(message) {
  if (!message?.trim()) return null;
  try {
    const res = await fetch("/api/title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.title === "string" && data.title ? data.title : null;
  } catch {
    return null;
  }
}
