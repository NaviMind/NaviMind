// Drawing sheet reader — the heart of "the assistant reads vessel drawings".
//
// A General Arrangement / fire / piping sheet is a huge, dense image. Two
// problems make it unreadable by default:
//   1) Browser pdf.js renders many scanned sheets blank.
//   2) OpenAI Vision downscales any image to ~2048px, so small labels vanish.
//
// Fix: render the page server-side with mupdf (reliable on scans, any DPI) at a
// high target resolution, then TILE it into an overlapping grid and read each
// tile at full detail with vision. Per-tile transcriptions are tagged by position
// (forward/aft, upper/lower) to build a spatial index.
//
// Input : { pdfUrl, name, page? }   page is 1-based; omitted → read the largest page
// Output: { ok, spatialText, ... }

import OpenAI from "openai";
import sharp from "sharp";
import * as mupdf from "mupdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TILE_MODEL = process.env.DRAWINGS_TILE_MODEL || "gpt-4o-mini";
const TARGET_LONG_PX = 7000;   // render the sheet this big so dense labels survive
const TARGET_TILE_PX = 1200;   // smaller tiles = each is more zoomed-in → more detail
const MAX_TILES = 16;          // safety cap per call
const OVERLAP = 0.08;          // 8% overlap so labels on a seam aren't cut

function posLabel(col, row, cols, rows) {
  const h = cols === 1 ? "" : col < cols / 3 ? "forward" : col >= (cols * 2) / 3 ? "aft" : "midships";
  const v = rows === 1 ? "" : row < rows / 3 ? "upper" : row >= (rows * 2) / 3 ? "lower" : "middle";
  return [v, h].filter(Boolean).join(" / ") || "whole sheet";
}

// Render one PDF page to a high-res PNG buffer via mupdf.
function renderPage(doc, pageIndex) {
  const page = doc.loadPage(pageIndex);
  const b = page.getBounds(); // [x0, y0, x1, y1] in points
  const wPt = b[2] - b[0];
  const hPt = b[3] - b[1];
  const longPt = Math.max(wPt, hPt) || 612;
  const scale = Math.min(12, Math.max(1, TARGET_LONG_PX / longPt)); // cap upscaling
  const pix = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
  const png = Buffer.from(pix.asPNG());
  return png;
}

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }
    const { pdfUrl, name = "drawing", page, returnImages = false } = await req.json();
    if (!pdfUrl) return Response.json({ ok: false, error: "pdfUrl required" }, { status: 400 });

    const pdfBuf = Buffer.from(await fetch(pdfUrl).then((r) => r.arrayBuffer()));
    const doc = mupdf.Document.openDocument(pdfBuf, "application/pdf");
    const pageCount = doc.countPages();

    // Choose the target page: explicit, or the one with the largest area (the sheet).
    let pageIndex = Number.isInteger(page) ? page - 1 : -1;
    if (pageIndex < 0 || pageIndex >= pageCount) {
      let bestArea = -1;
      for (let i = 0; i < Math.min(pageCount, 20); i++) {
        const b = doc.loadPage(i).getBounds();
        const area = (b[2] - b[0]) * (b[3] - b[1]);
        if (area > bestArea) { bestArea = area; pageIndex = i; }
      }
    }

    const png = renderPage(doc, pageIndex);
    const meta = await sharp(png).metadata();
    const W = meta.width || 0;
    const H = meta.height || 0;
    if (!W || !H) return Response.json({ ok: false, error: "render produced no image" }, { status: 502 });

    // Grid sized to keep tiles near TARGET_TILE_PX, bounded by MAX_TILES.
    let cols = Math.max(1, Math.round(W / TARGET_TILE_PX));
    let rows = Math.max(1, Math.round(H / TARGET_TILE_PX));
    while (cols * rows > MAX_TILES) {
      if (cols >= rows && cols > 1) cols--;
      else if (rows > 1) rows--;
      else break;
    }

    const tileW = Math.floor(W / cols);
    const tileH = Math.floor(H / rows);
    const ovX = Math.floor(tileW * OVERLAP);
    const ovY = Math.floor(tileH * OVERLAP);

    const crops = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const left = Math.max(0, c * tileW - ovX);
        const top = Math.max(0, r * tileH - ovY);
        const w = Math.min(W - left, tileW + ovX * 2);
        const h = Math.min(H - top, tileH + ovY * 2);
        crops.push({ c, r, left, top, w, h });
      }
    }

    const results = new Array(crops.length);
    const CONCURRENCY = 4;
    let idx = 0;
    async function worker() {
      while (idx < crops.length) {
        const my = idx++;
        const { c, r, left, top, w, h } = crops[my];
        const pos = posLabel(c, r, cols, rows);
        try {
          const tileBuf = await sharp(png).extract({ left, top, width: w, height: h }).jpeg({ quality: 88 }).toBuffer();
          const b64 = tileBuf.toString("base64");
          const dataUri = `data:image/jpeg;base64,${b64}`;
          const resp = await openai.responses.create({
            model: TILE_MODEL,
            input: [
              {
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: `This is one tile (${pos}) of a large vessel technical drawing "${name}", cut into a ${cols}x${rows} grid. List the key labels, equipment, spaces, rooms, decks, tanks, frame numbers and systems visible in THIS tile (a short index, not a full transcription) so this tile can later be picked to answer "where is X" questions. If nothing is readable, reply "EMPTY".`,
                  },
                  { type: "input_image", image_url: dataUri, detail: "high" },
                ],
              },
            ],
          });
          const text = (resp.output_text || "").trim();
          results[my] = { pos, col: c, row: r, text: /^empty$/i.test(text) ? "" : text, b64: returnImages ? b64 : null };
        } catch (e) {
          results[my] = { pos, col: c, row: r, text: "", b64: null, error: e.message };
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, crops.length) }, worker));

    const sections = results.filter((t) => t && t.text).map((t) => `### Region: ${t.pos}\n${t.text}`);
    const spatialText =
      `SPATIAL READING of "${name}" (page ${pageIndex + 1} of ${pageCount}, rendered ${W}x${H}px, ${cols}x${rows} tiles):\n\n` +
      (sections.length ? sections.join("\n\n") : "(no readable labels found)");

    // The tile IMAGES (when requested) are the real payload: the client saves them
    // so the assistant can SEE the relevant region of the drawing at query time —
    // tracing pipes/lines visually, not just reading extracted text.
    const tileList = results.map((t) => ({
      pos: t.pos,
      col: t.col,
      row: t.row,
      description: t.text || "",
      image: returnImages ? t.b64 : undefined,
    }));

    return Response.json({
      ok: true,
      pageIndex: pageIndex + 1,
      pageCount,
      width: W,
      height: H,
      grid: { cols, rows },
      tiles: results.length,
      readable: sections.length,
      spatialText,
      tileList,
    });
  } catch (e) {
    console.error("analyze-sheet error:", e);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
