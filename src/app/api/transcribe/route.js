import OpenAI, { toFile } from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Transcription model. Defaults to gpt-4o-mini-transcribe (fast, cheap, multi-
// lingual); override via OPENAI_TRANSCRIBE_MODEL (e.g. "gpt-4o-transcribe" or
// "whisper-1").
const TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return Response.json({ error: "No audio file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadable = await toFile(buffer, file.name || "audio.webm", {
      type: file.type || "audio/webm",
    });

    const result = await openai.audio.transcriptions.create({
      file: uploadable,
      model: TRANSCRIBE_MODEL,
      // Language is auto-detected — keeps RU/EN/ES voice input working.
    });

    return Response.json({ text: result?.text || "" });
  } catch (error) {
    console.error("❌ transcribe error:", error);
    return Response.json(
      { error: error?.message || "Transcription failed" },
      { status: 500 }
    );
  }
}
