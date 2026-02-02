import { getDocs, collection } from "firebase/firestore";
import { db } from "@/firebase/config";

export async function generateChatTxtFile(userId, chatId) {
  const messagesRef = collection(db, "users", userId, "chats", chatId, "messages");
  const snapshot = await getDocs(messagesRef);

  if (snapshot.empty) return null;

  let content = "";

  snapshot.forEach((doc) => {
    const { role, text, createdAt } = doc.data();
    const date =
      createdAt?.toDate?.().toLocaleString?.("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) || "Unknown time";

    content += `[${date}] ${role?.toUpperCase?.() || "UNKNOWN"}: ${text}\n\n`;
  });

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  return { url, filename: `chat-${chatId}.txt` };
}
export async function exportChatAsTxt(messages) {
  const content = messages
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join("\n\n");

  const blob = new Blob([content], { type: "text/plain" });
  const filename = "chat.txt";

  // 👉 Мобильный Share, если поддерживается
  if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename, { type: "text/plain" })] })) {
    const file = new File([blob], filename, { type: "text/plain" });
    try {
      await navigator.share({
        title: "Chat Export",
        text: "Here's a chat export from NaviMind:",
        files: [file],
      });
    } catch (err) {
      console.warn("Sharing failed:", err);
    }
  } else {
    // 💻 Фоллбэк — обычное скачивание
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

