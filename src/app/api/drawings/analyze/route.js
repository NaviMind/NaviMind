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
    const body = await req.json();
    const { fileName } = body;

    // Normalise input: accept both {pages: [{url, pageNum}]} and legacy {pageUrls: string[]}.
    let pageList;
    if (Array.isArray(body.pages) && body.pages.length) {
      pageList = body.pages.slice(0, MAX_PAGES).map((p) =>
        typeof p === "string"
          ? { url: p, pageNum: body.pages.indexOf(p) + 1 }
          : p
      );
    } else if (Array.isArray(body.pageUrls) && body.pageUrls.length) {
      pageList = body.pageUrls
        .slice(0, MAX_PAGES)
        .map((url, i) => ({ url, pageNum: i + 1 }));
    } else {
      return NextResponse.json({ error: "pages required" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    // Analyse all pages in parallel — each description is independent.
    const analyzed = await Promise.all(
      pageList.map(async ({ url, pageNum }) => {
        const imageUrl = await resolveImageUrl(url);
        const resp = await openai.responses.create({
          model: "gpt-4o",
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `This is page ${pageNum} of a vessel technical drawing called "${fileName}". Extract ALL spatial and structural information visible: room names and exact locations, deck levels and identifiers, equipment names and positions, pipe routing and valve positions, evacuation and escape routes, muster/lifeboat stations, compartment labels, tank names, machinery space identifiers, dimensions, scale indicators, and any other technical details or annotations. Be comprehensive and precise — this will be used to answer specific maritime navigation, safety, and engineering questions.`,
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
        return { pageNum, url, description: resp.output_text };
      })
    );

    return NextResponse.json({ pages: analyzed });
  } catch (e) {
    console.error("drawings/analyze error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
