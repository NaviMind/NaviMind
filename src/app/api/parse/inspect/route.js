// Diagnostic-only endpoint for the drawings feature. Runs a file through
// LlamaParse WITH page screenshots enabled and reports what comes back — how much
// text was OCR'd per page, and whether full-page images are available and at what
// resolution. This tells us whether LlamaParse can supply reliable high-res page
// images to feed our own tiling + vision pipeline for large scanned drawings.
//
// Indexes nothing. Returns a compact summary, never the raw content.

export const runtime = "nodejs";
export const maxDuration = 60;

const BASE = process.env.LLAMA_CLOUD_BASE_URL || "https://api.cloud.llamaindex.ai/api/v1/parsing";

export async function POST(req) {
  try {
    const apiKey = process.env.LLAMA_CLOUD_API_KEY;
    if (!apiKey) return Response.json({ ok: false, error: "no LlamaParse key" }, { status: 500 });

    const { url, name } = await req.json();
    if (!url) return Response.json({ ok: false, error: "url required" }, { status: 400 });

    const auth = { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };

    // 1) Download + upload with screenshots enabled.
    const fileRes = await fetch(url);
    if (!fileRes.ok) return Response.json({ ok: false, error: "fetch source failed" }, { status: 502 });
    const buf = Buffer.from(await fileRes.arrayBuffer());
    const ct = fileRes.headers.get("content-type") || "application/octet-stream";

    const form = new FormData();
    form.append("file", new Blob([buf], { type: ct }), name || "document.pdf");
    form.append("take_screenshot", "true");

    const up = await fetch(`${BASE}/upload`, { method: "POST", headers: auth, body: form });
    if (!up.ok) {
      const detail = await up.text().catch(() => "");
      return Response.json({ ok: false, error: `upload ${up.status}`, detail: detail.slice(0, 300) }, { status: 502 });
    }
    const { id: jobId } = await up.json();

    // 2) Poll (bounded).
    const deadline = Date.now() + 50_000;
    let status = "PENDING";
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000));
      const j = await fetch(`${BASE}/job/${jobId}`, { headers: auth });
      if (!j.ok) continue;
      status = (await j.json())?.status || status;
      if (status === "SUCCESS" || status === "COMPLETED") break;
      if (status === "ERROR" || status === "FAILED") {
        return Response.json({ ok: false, error: "job failed", jobId });
      }
    }
    if (status !== "SUCCESS" && status !== "COMPLETED") {
      return Response.json({ ok: false, pending: true, jobId });
    }

    // 3) Fetch the structured JSON result and summarize.
    const jr = await fetch(`${BASE}/job/${jobId}/result/json`, { headers: auth });
    if (!jr.ok) return Response.json({ ok: false, error: "result/json failed" }, { status: 502 });
    const data = await jr.json();
    const pages = Array.isArray(data?.pages) ? data.pages : [];

    const summary = pages.map((p, i) => {
      const text = (p?.text || p?.md || "");
      const imgs = Array.isArray(p?.images) ? p.images : [];
      return {
        page: p?.page ?? i + 1,
        textChars: text.replace(/\s/g, "").length,
        textPreview: text.slice(0, 160),
        images: imgs.map((im) => ({
          name: im?.name,
          w: im?.width || im?.original_width,
          h: im?.height || im?.original_height,
          type: im?.type,
        })),
      };
    });

    return Response.json({
      ok: true,
      jobId,
      pageCount: pages.length,
      totalImages: summary.reduce((s, p) => s + p.images.length, 0),
      pages: summary,
    });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
