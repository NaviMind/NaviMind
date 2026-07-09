import { NextResponse } from "next/server";
import OpenAI from "openai";
import sharp from "sharp";

// Vercel: allow up to 60 s for parallel vision calls on large drawings.
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Per-page analysis model. gpt-4o-mini does OCR (verbatim text) + diagram
// description in one cheap call (~16× cheaper than gpt-4o). Bump to gpt-4o via
// env if fine schematic detail ever needs it.
const PAGE_ANALYSIS_MODEL = process.env.DRAWINGS_ANALYSIS_MODEL || "gpt-4o-mini";

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
  "Manual",
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
      pageList = body.pages.slice(0, MAX_PAGES).map((p, i) =>
        typeof p === "string"
          ? { url: p, pageNum: i + 1 } // map index, not indexOf (dup URLs)
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
                  text: `Classify this vessel technical drawing into exactly one of the following categories. Reply with ONLY the category name, nothing else.\n\nCategories:\n${DRAWING_TYPES.map((t) => `- ${t}`).join("\n")}\n\nDescription hints:\n- GA Plan: full ship profile/cross-section or deck overview showing all spaces\n- Fire Plan: fire detection, suppression equipment, fire zones\n- Escape Routes: muster stations, lifeboats, emergency escape paths\n- Tank Plan: ballast tanks, fuel tanks, cargo tanks arrangement\n- Engine Room: machinery spaces, main engine, auxiliary equipment\n- Cargo Plan: cargo loading, stability, capacity plan\n- Electrical: electrical diagrams, switchboards, power distribution\n- Piping: pipe routing, valve positions, hydraulic schematics\n- Stability: stability curves, trim/displacement tables\n- Safety Equipment: fire extinguishers, EPIRB, lifesaving appliances positions\n- Manual: equipment operation/maintenance manual or handbook — mostly text pages with instructions (e.g. radar, ECDIS, pump, separator manuals)\n- Other: anything not listed above`,
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
          model: PAGE_ANALYSIS_MODEL,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `This is page ${pageNum} of a vessel document called "${fileName}". Do BOTH of the following:\n\n1) OCR: transcribe ALL readable text on the page VERBATIM — headings, labels, table cells, part/valve numbers, specifications, notes, warnings, nameplate values (kW, V, A, rpm, Hz, dimensions). Preserve numbers and units exactly.\n\n2) DESCRIBE any visual/diagram content: equipment layout and positions, room/compartment/deck names and locations, pipe routing and valve positions, escape routes, muster/lifeboat stations, tank arrangement, wiring/terminal diagrams, curves/graphs and what they show.\n\nIf the page is mostly text, focus on an accurate transcription. If it is mostly a diagram, focus on a precise spatial description. Be comprehensive — this text is indexed and used to answer specific maritime navigation, safety, and engineering questions. If the page is blank or unreadable, say exactly "BLANK PAGE".`,
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
        .then((resp) => {
          const out = (resp.output_text || "").trim();
          // Empty output = the model read NOTHING (a failure), which is different
          // from an intentional "BLANK PAGE". Flag the failure so the client can
          // retry instead of silently indexing an empty page as if analyzed.
          if (!out) return { pageNum, url: pageList[i].url, description: "", failed: true };
          const description = /^blank page$/i.test(out) ? "" : out;
          return { pageNum, url: pageList[i].url, description };
        })
        .catch((e) => {
          console.error("drawings/analyze: page failed", pageNum, e?.message);
          return { pageNum, url: pageList[i].url, description: "", failed: true };
        })
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

    // Signal if some pages were dropped by the per-call safety cap, so the
    // caller knows the analysis isn't complete (the client batches below MAX_PAGES,
    // but this makes any silent truncation visible).
    const inputLen = body.pages?.length || body.pageUrls?.length || 0;
    const truncated = inputLen > MAX_PAGES;
    return NextResponse.json({ pages: analyzedPages, drawingType, truncated });
  } catch (e) {
    console.error("drawings/analyze error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
