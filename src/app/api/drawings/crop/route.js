// Tight high-res crop of a region of a drawing page (Variant B).
//
// Given a full-sheet bounding box (normalized 0..1, from the upload-time item
// detection), render ONLY that region with mupdf at high DPI — so the user/model
// sees a sharp close-up of exactly the asked-about object, not a blurry tile.
// Generous padding absorbs vision's bbox imprecision.
//
// Input : { pdfUrl, page, box:[x0,y0,x1,y1], pad? }
// Output: { ok, image (base64 PNG), width, height }

import * as mupdf from "mupdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const TARGET_PX = 1700;  // long edge of the crop — sharp but bounded
const MAX_SCALE = 24;

export async function POST(req) {
  try {
    const { pdfUrl, page = 1, box, pad = 0.35 } = await req.json();
    if (!pdfUrl || !Array.isArray(box) || box.length !== 4) {
      return Response.json({ ok: false, error: "pdfUrl and box required" }, { status: 400 });
    }

    const pdfBuf = Buffer.from(await fetch(pdfUrl).then((r) => r.arrayBuffer()));
    const doc = mupdf.Document.openDocument(pdfBuf, "application/pdf");
    const pageIndex = Math.max(0, Math.min(doc.countPages() - 1, (page | 0) - 1));
    const pg = doc.loadPage(pageIndex);
    const b = pg.getBounds(); // [x0,y0,x1,y1] in points
    const pw = b[2] - b[0];
    const ph = b[3] - b[1];

    // Normalized box → padded, clamped 0..1.
    let [x0, y0, x1, y1] = box.map((n) => Number(n) || 0);
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (y1 < y0) [y0, y1] = [y1, y0];
    const padX = (x1 - x0) * pad + 0.01;
    const padY = (y1 - y0) * pad + 0.01;
    x0 = Math.max(0, x0 - padX); y0 = Math.max(0, y0 - padY);
    x1 = Math.min(1, x1 + padX); y1 = Math.min(1, y1 + padY);

    // Region in points.
    const rx0 = b[0] + x0 * pw, ry0 = b[1] + y0 * ph;
    const rx1 = b[0] + x1 * pw, ry1 = b[1] + y1 * ph;
    const regionLongPt = Math.max(rx1 - rx0, ry1 - ry0) || 1;
    const scale = Math.min(MAX_SCALE, Math.max(2, TARGET_PX / regionLongPt));
    const m = mupdf.Matrix.scale(scale, scale);

    // Clip pixmap to the region in device space.
    const dbox = [rx0 * scale, ry0 * scale, rx1 * scale, ry1 * scale];
    const pix = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, dbox, false);
    pix.clear(255);
    const dev = new mupdf.DrawDevice(mupdf.Matrix.identity, pix);
    pg.run(dev, m);
    dev.close();

    const png = Buffer.from(pix.asPNG());
    return Response.json({
      ok: true,
      image: png.toString("base64"),
      width: pix.getWidth(),
      height: pix.getHeight(),
    });
  } catch (e) {
    console.error("crop error:", e);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
