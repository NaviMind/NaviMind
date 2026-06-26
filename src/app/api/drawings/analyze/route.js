import { NextResponse } from "next/server";
import OpenAI from "openai";
import sharp from "sharp";

// Vercel: allow up to 60 s for parallel vision calls on large drawings.
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_PAGES = 8;

// TIFF images can't be sent directly to OpenAI Vision — convert to JPEG first.
async function resolveImageUrl(url) {
  if (/\.tiff?(\?|$)/i.test(url)) {
    const buf = await fetch(url).then((r) => r.arrayBuffer()).then(Buffer.from);
    const jpeg = await sharp(buf).jpeg({ quality: 92 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  }
  return url;
}

export async function POST(req) {
  try {
    const { pageUrls, fileName } = await req.json();

    if (!Array.isArray(pageUrls) || pageUrls.length === 0) {
      return NextResponse.json({ error: "pageUrls required" }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const urls = pageUrls.slice(0, MAX_PAGES);

    const descriptions = await Promise.all(
      urls.map(async (rawUrl, i) => {
        const imageUrl = await resolveImageUrl(rawUrl);
        const resp = await openai.responses.create({
          model: "gpt-4o",
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `This is page ${i + 1} of a vessel technical drawing called "${fileName}". Extract ALL spatial and structural information visible: room names and exact locations, deck levels, equipment names and positions, pipe routing and valve positions, evacuation and escape routes, muster stations, compartment labels, tank names, machinery spaces, dimensions, scale indicators, notes, and any other technical details. Be comprehensive and precise — this index will be used to answer specific maritime navigation, safety, and engineering questions about this vessel.`,
                },
                {
                  type: "input_image",
                  image_url: imageUrl,
                  detail: "high",
                },
              ],
            },
          ],
        });
        return `=== Page ${i + 1} ===\n${resp.output_text}`;
      })
    );

    return NextResponse.json({ spatialSummary: descriptions.join("\n\n") });
  } catch (e) {
    console.error("drawings/analyze error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
