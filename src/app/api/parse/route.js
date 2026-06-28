// LlamaParse integration — turns ANY uploaded file (digital PDF, scanned PDF,
// tables, complex layouts) into clean text on the server. This replaces the
// fragile client-side pdf.js render + per-page vision OCR for text extraction.
//
// Flow: download the file from its Storage URL → upload to LlamaParse → poll the
// job until done → fetch the markdown result. Returns { ok, markdown }.
//
// Graceful fallback: if LLAMA_CLOUD_API_KEY is not configured, returns
// { ok: false, skipped: true } so the caller keeps its existing pipeline and
// nothing breaks before the key is added.

export const runtime = "nodejs";
export const maxDuration = 60;

const BASE = process.env.LLAMA_CLOUD_BASE_URL || "https://api.cloud.llamaindex.ai/api/v1/parsing";

// Diagnostic: open /api/parse in the browser to confirm the key reached THIS
// deployment/environment. Returns only a boolean — never the key itself.
export async function GET() {
  return Response.json({
    ok: true,
    hasKey: !!process.env.LLAMA_CLOUD_API_KEY,
    base: BASE,
  });
}

export async function POST(req) {
  try {
    const apiKey = process.env.LLAMA_CLOUD_API_KEY;
    const { url, name } = await req.json();

    if (!url) {
      return Response.json({ ok: false, error: "url required" }, { status: 400 });
    }
    // No key configured yet → tell the caller to use its fallback path.
    if (!apiKey) {
      return Response.json({ ok: false, skipped: true, reason: "no LlamaParse key" });
    }

    // 1) Download the file bytes from Storage (public download URL with token).
    const fileRes = await fetch(url);
    if (!fileRes.ok) {
      return Response.json({ ok: false, error: "could not fetch source file" }, { status: 502 });
    }
    const buf = Buffer.from(await fileRes.arrayBuffer());
    const contentType = fileRes.headers.get("content-type") || "application/octet-stream";

    // 2) Upload to LlamaParse.
    const form = new FormData();
    form.append("file", new Blob([buf], { type: contentType }), name || "document.pdf");

    const uploadRes = await fetch(`${BASE}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      body: form,
    });
    if (!uploadRes.ok) {
      const detail = await uploadRes.text().catch(() => "");
      return Response.json(
        { ok: false, error: `LlamaParse upload failed (${uploadRes.status})`, detail: detail.slice(0, 300) },
        { status: 502 }
      );
    }
    const { id: jobId } = await uploadRes.json();
    if (!jobId) {
      return Response.json({ ok: false, error: "no job id from LlamaParse" }, { status: 502 });
    }

    // 3) Poll until the job finishes (bounded so we stay under the function limit).
    const deadline = Date.now() + 50_000;
    let status = "PENDING";
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2500));
      const jobRes = await fetch(`${BASE}/job/${jobId}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      });
      if (!jobRes.ok) continue;
      const job = await jobRes.json();
      status = job?.status || status;
      if (status === "SUCCESS" || status === "COMPLETED") break;
      if (status === "ERROR" || status === "FAILED") {
        return Response.json({ ok: false, error: "LlamaParse job failed" }, { status: 502 });
      }
    }

    if (status !== "SUCCESS" && status !== "COMPLETED") {
      // Still processing (large file). Caller can retry later via the retry path.
      return Response.json({ ok: false, pending: true, jobId });
    }

    // 4) Fetch the markdown result.
    const resultRes = await fetch(`${BASE}/job/${jobId}/result/markdown`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!resultRes.ok) {
      return Response.json({ ok: false, error: "could not fetch LlamaParse result" }, { status: 502 });
    }
    const result = await resultRes.json();
    const markdown = (result?.markdown || "").trim();

    return Response.json({ ok: true, markdown });
  } catch (e) {
    console.error("parse route error:", e);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
