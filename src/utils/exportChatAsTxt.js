function stripMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g, "").trim()) // code blocks
    .replace(/`([^`]+)`/g, "$1")                // inline code
    .replace(/#{1,6}\s+/gm, "")                 // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")            // bold
    .replace(/\*(.+?)\*/g, "$1")                // italic
    .replace(/~~(.+?)~~/g, "$1")                // strikethrough
    .replace(/^\s*[-*+]\s+/gm, "• ")            // unordered list → bullet
    .replace(/^\s*\d+\.\s+/gm, "")              // ordered list numbers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")    // links → label only
    .replace(/^---+$/gm, "─────────────────")   // hr
    .replace(/\n{3,}/g, "\n\n")                 // collapse excess blank lines
    .trim();
}

function formatTimestamp(ts) {
  if (!ts) return null;
  try {
    const date = ts?.toDate?.() ?? (typeof ts === "number" ? new Date(ts) : null);
    if (!date) return null;
    return date.toLocaleString("en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export async function exportChatAsTxt(messages, chatTitle = "Chat") {
  if (!messages?.length) return;

  const lines = [];
  lines.push(`NaviMind — ${chatTitle}`);
  lines.push(`Exported: ${new Date().toLocaleString("en-GB")}`);
  lines.push("═══════════════════════════════════════");
  lines.push("");

  for (const msg of messages) {
    const role = msg.role === "user" ? "You" : "NaviMind";
    const time = formatTimestamp(msg.timestamp);
    const header = time ? `${role}  [${time}]` : role;
    const body = stripMarkdown(msg.content ?? msg.text ?? "");

    lines.push(header);
    lines.push(body);
    lines.push("");
  }

  const content = lines.join("\n");
  const filename = `navimind-${chatTitle.replace(/\s+/g, "-").toLowerCase()}.txt`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });

  // Mobile: try Web Share with file, fall back to text share, then download
  if (typeof navigator !== "undefined" && navigator.share) {
    const file = new File([blob], filename, { type: "text/plain" });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: `NaviMind — ${chatTitle}`, files: [file] });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return; // user cancelled — don't fall through
        // File share unsupported by target app → fall through to text share
      }
    }

    // Fall back: share as plain text (works with Telegram, WhatsApp, etc.)
    try {
      await navigator.share({ title: `NaviMind — ${chatTitle}`, text: content });
      return;
    } catch (err) {
      if (err?.name === "AbortError") return;
    }
  }

  // Desktop / fallback: trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
