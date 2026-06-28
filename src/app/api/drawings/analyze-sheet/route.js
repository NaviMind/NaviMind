// Drawing sheet reader — the heart of "the assistant reads vessel drawings".
//
// A General Arrangement / fire / piping sheet is a single huge image (e.g.
// 6094x2381). OpenAI Vision downscales any image to ~2048px on the long edge, so
// small labels ("RESCUE BOAT") become unreadable. We instead TILE the sheet into
// an overlapping grid and read each tile at full resolution with vision, so the
// fine labels survive. Each tile's extraction is tagged with its position on the
// sheet (e.g. "forward / port") so the aggregate becomes a spatial index.
//
// Input  : { imageUrl } OR { jobId, imageName }  (+ name, page)
// Output : { ok, spatialText, tiles }   — indexed by the caller into File Search.

import OpenAI from "openai";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

const BASE = process.env.LLAMA_CLOUD_BASE_URL || "https://api.cloud.llamaindex.ai/api/v1/parsing";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TILE_MODEL = process.env.DRAWINGS_TILE_MODEL || "gpt-4o-mini";
const TARGET_TILE_PX = 1600;   // aim for ~1600px tiles — readable by vision at full detail
const MAX_TILES = 12;          // safety cap so one giant sheet can't explode cost/latency
const OVERLAP = 0.08;          // 8% overlap so labels on a seam aren't cut in half

// Horizontal / vertical position label for a tile, for spatial grounding.
function posLabel(col, row, cols, rows) {
  const h = cols === 1 ? "" : col < cols / 3 ? "forward" : col >= (cols * 2) / 3 ? "aft" : "midships";
  const v = rows === 1 ? "" : row < rows / 3 ? "upper" : row >= (rows * 2) / 3 ? "lower" : "middle";
  return [v, h].filter(Boolean).join(" / ") || "whole sheet";
}

async function fetchImageBytes({ imageUrl, jobId, imageName }) {
  if (imageUrl) {
    const r = await fetch(imageUrl);
    if (!r.ok) throw new Error(`image fetch ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  const r = await fetch(`${BASE}/job/${jobId}/result/image/${encodeURIComponent(imageName)}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/octet-stream" },
  });
  if (!r.ok) throw new Error(`llama image fetch ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }
    const body = await req.json();
    const { name = "drawing", page = 1 } = body;

    const srcBuf = await fetchImageBytes(body);
    const meta = await sharp(srcBuf).metadata();
    const W = meta.width || 0;
    const H = meta.height || 0;
    if (!W || !H) return Response.json({ ok: false, error: "could not read image size" }, { status: 502 });

    // Choose a grid that keeps tiles near TARGET_TILE_PX, bounded by MAX_TILES.
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

    // Build the tile crops.
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

    // Read every tile with vision (bounded concurrency to stay under the timeout).
    const results = new Array(crops.length);
    const CONCURRENCY = 4;
    let idx = 0;
    async function worker() {
      while (idx < crops.length) {
        const my = idx++;
        const { c, r, left, top, w, h } = crops[my];
        try {
          const tileBuf = await sharp(srcBuf)
            .extract({ left, top, width: w, height: h })
            .jpeg({ quality: 88 })
            .toBuffer();
          const dataUri = `data:image/jpeg;base64,${tileBuf.toString("base64")}`;
          const pos = posLabel(c, r, cols, rows);
          const resp = await openai.responses.create({
            model: TILE_MODEL,
            input: [
              {
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: `This is one tile (${pos}) of a large vessel technical drawing "${name}", page ${page}, cut into a ${cols}x${rows} grid. Transcribe EVERY readable label, equipment name, space/room name, deck name, tank name, frame number, dimension, and annotation visible in THIS tile, VERBATIM. For each, note its rough position within this tile (e.g. top-left, centre). If nothing is readable, reply "EMPTY". Be exhaustive and precise — this builds a spatial index used to answer "where is X" questions.`,
                  },
                  { type: "input_image", image_url: dataUri, detail: "high" },
                ],
              },
            ],
          });
          const text = (resp.output_text || "").trim();
          results[my] = { pos, text: /^empty$/i.test(text) ? "" : text };
        } catch (e) {
          results[my] = { pos: posLabel(c, r, cols, rows), text: "", error: e.message };
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, crops.length) }, worker));

    const sections = results
      .filter((t) => t && t.text)
      .map((t) => `### Region: ${t.pos}\n${t.text}`);

    const spatialText =
      `SPATIAL READING of "${name}" (page ${page}, sheet ${W}x${H}px, ${cols}x${rows} tiles):\n\n` +
      (sections.length ? sections.join("\n\n") : "(no readable labels found)");

    return Response.json({
      ok: true,
      width: W,
      height: H,
      grid: { cols, rows },
      tiles: results.length,
      readable: sections.length,
      spatialText,
    });
  } catch (e) {
    console.error("analyze-sheet error:", e);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
