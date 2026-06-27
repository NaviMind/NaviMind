import { NextResponse } from "next/server";
import OpenAI from "openai";
import sharp from "sharp";

// Vercel: allow up to 60 s for parallel vision calls on large drawings.
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_PAGES = 8;

const DRAWING_TYPES = [
  "GA Plan",
  "Fire Plan",
  "Escape Routes",
  "Tank Plan",
  "Engine Room",
  "Cargo Plan",
  "Electrical",
  "Piping",
  "Stability",
  "Safety Equipment",
  "Other",
];

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
    // Classify the drawing type only when asked (page 1 batch). The client sends
    // pages in small batches and sets classify:true only on the first one.
    const shouldClassify = body.classify !== false;

    // Normalise input: accept both {pages: [{url, pageNum}]} and legacy {pageUrls: string[]}.
    // MAX_PAGES is a per-call safety bound; the client batches well below it.
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

    // Pre-resolve all URLs (TIFF → JPEG if needed) so parallel calls can start immediately.
    const resolvedUrls = await Promise.all(pageList.map((p) => resolveImageUrl(p.url)));

    // Run classification (first batch only) + page analyses in parallel.
    // Classification uses only page 1 at low detail — cheap and fast.
    const classifyPromise = shouldClassify
      ? openai.responses.create({
          model: "gpt-4o-mini",
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `Classify this vessel technical drawing into exactly one of the following categories. Reply with ONLY the category name, nothing else.\n\nCategories:\n${DRAWING_TYPES.map((t) => `- ${t}`).join("\n")}\n\nDescription hints:\n- GA Plan: full ship profile/cross-section or deck overview showing all spaces\n- Fire Plan: fire detection, suppression equipment, fire zones\n- Escape Routes: muster stations, lifeboats, emergency escape paths\n- Tank Plan: ballast tanks, fuel tanks, cargo tanks arrangement\n- Engine Room: machinery spaces, main engine, auxiliary equipment\n- Cargo Plan: cargo loading, stability, capacity plan\n- Electrical: electrical diagrams, switchboards, power distribution\n- Piping: pipe routing, valve positions, hydraulic schematics\n- Stability: stability curves, trim/displacement tables\n- Safety Equipment: fire extinguishers, EPIRB, lifesaving appliances positions\n- Other: anything not listed above`,
                },
                {
                  type: "input_image",
                  image_url: resolvedUrls[0],
                  detail: "low",
                },
              ],
            },
          ],
        })
      : Promise.resolve(null);

    const pageAnalysisPromises = pageList.map(({ pageNum }, i) =>
      openai.responses
        .create({
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
                  image_url: resolvedUrls[i],
                  detail: "high",
                },
              ],
            },
          ],
        })
        .then((resp) => ({ pageNum, url: pageList[i].url, description: resp.output_text }))
    );

    const [classifyResult, ...analyzedPages] = await Promise.all([
      classifyPromise,
      ...pageAnalysisPromises,
    ]);

    let drawingType = null;
    if (classifyResult) {
      const rawType = classifyResult.output_text?.trim() || "Other";
      drawingType = DRAWING_TYPES.includes(rawType) ? rawType : "Other";
    }

    return NextResponse.json({ pages: analyzedPages, drawingType });
  } catch (e) {
    console.error("drawings/analyze error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
