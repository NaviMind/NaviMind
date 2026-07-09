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
    const body = await req.json();

    // No key configured yet → tell the caller to use its fallback path.
    if (!apiKey) {
      return Response.json({ ok: false, skipped: true, reason: "no LlamaParse key" });
    }

    const authHeaders = { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };

    // ── Mode A: poll an existing job (the client drives this; no serverless
    //    time limit because each poll is its own short request). ──
    if (body.jobId) {
      const jobRes = await fetch(`${BASE}/job/${body.jobId}`, { headers: authHeaders });
      if (!jobRes.ok) {
        // Only a transient (rate-limit / server) error is worth polling again.
        // A hard error (bad key, job not found) would otherwise be masked as an
        // endless "PENDING", so surface it so the client stops and falls back.
        const retryable = jobRes.status === 429 || jobRes.status >= 500;
        if (retryable) return Response.json({ ok: true, status: "PENDING" });
        return Response.json({ ok: false, status: "ERROR", reason: `job-status-${jobRes.status}` });
      }
      const job = await jobRes.json();
      const status = job?.status || "PENDING";
      if (status === "SUCCESS" || status === "COMPLETED") {
        const r = await fetch(`${BASE}/job/${body.jobId}/result/markdown`, { headers: authHeaders });
        if (!r.ok) return Response.json({ ok: false, error: "could not fetch result" }, { status: 502 });
        const result = await r.json();
        const markdown = (result?.markdown || "").trim();
        // A parsed-but-empty result is NOT a success — it would index nothing.
        // Report it as a failure so the caller can fall back or surface it.
        if (!markdown) {
          return Response.json({ ok: false, status: "ERROR", reason: "empty-result" });
        }
        return Response.json({ ok: true, status: "SUCCESS", markdown });
      }
      if (status === "ERROR" || status === "FAILED") {
        return Response.json({ ok: false, status: "ERROR" });
      }
      return Response.json({ ok: true, status: "PENDING" });
    }

    // ── Mode B: start a new parse job and return its id immediately. ──
    if (!body.url) {
      return Response.json({ ok: false, error: "url required" }, { status: 400 });
    }
    const fileRes = await fetch(body.url);
    if (!fileRes.ok) {
      return Response.json({ ok: false, error: "could not fetch source file" }, { status: 502 });
    }
    const buf = Buffer.from(await fileRes.arrayBuffer());
    const contentType = fileRes.headers.get("content-type") || "application/octet-stream";

    const form = new FormData();
    form.append("file", new Blob([buf], { type: contentType }), body.name || "document.pdf");

    const uploadRes = await fetch(`${BASE}/upload`, {
      method: "POST",
      headers: authHeaders,
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
    return Response.json({ ok: true, jobId, status: "PENDING" });
  } catch (e) {
    console.error("parse route error:", e);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
