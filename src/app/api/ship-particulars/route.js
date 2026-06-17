import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Extracts plain text from an uploaded ship-particulars PDF so it can be stored
// once in the vessel profile and injected into every answer cheaply.
const MAX_TEXT = 8000; // ~1.5 pages — enough for particulars, keeps tokens sane

export async function POST(req) {
  try {
    const { fileBase64, fileName } = await req.json();

    if (!fileBase64) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const isPdf =
      (fileName && fileName.toLowerCase().endsWith(".pdf")) ||
      fileBase64.startsWith("JVBER"); // %PDF magic in base64

    if (!isPdf) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    const buffer = Buffer.from(fileBase64, "base64");

    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);

    let text = (parsed.text || "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

    if (!text) {
      return NextResponse.json(
        { error: "Could not read text from this PDF (it may be a scanned image)." },
        { status: 422 }
      );
    }

    let truncated = false;
    if (text.length > MAX_TEXT) {
      text = text.slice(0, MAX_TEXT).trim();
      truncated = true;
    }

    return NextResponse.json({ text, truncated });
  } catch (err) {
    console.error("ship-particulars extract error:", err);
    return NextResponse.json({ error: "Failed to process PDF" }, { status: 500 });
  }
}
