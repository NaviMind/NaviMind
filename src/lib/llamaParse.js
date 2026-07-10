// LlamaParse — the ONE text extractor for documents (chat uploads + drawings).
// Robust on scanned PDFs, tables, and complex layouts because it OCRs/parses
// page by page, unlike a single whole-file vision call. This server-side helper
// runs the full upload → poll → fetch-markdown cycle and returns clean markdown,
// so callers don't each re-implement the job flow.
//
// Requires LLAMA_CLOUD_API_KEY. Returns "" when unconfigured or on any failure,
// so callers can fall back gracefully (never throws).

const BASE =
  process.env.LLAMA_CLOUD_BASE_URL || "https://api.cloud.llamaindex.ai/api/v1/parsing";

export function hasLlamaKey() {
  return !!process.env.LLAMA_CLOUD_API_KEY;
}

export async function llamaParseToMarkdown(
  buffer,
  filename,
  { contentType = "application/pdf", timeoutMs = 240000, pollMs = 3000 } = {}
) {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  if (!apiKey) return "";
  const auth = { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };

  try {
    // 1) Start the parse job.
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: contentType }), filename || "document.pdf");
    const up = await fetch(`${BASE}/upload`, { method: "POST", headers: auth, body: form });
    if (!up.ok) {
      console.error("llamaParse: upload failed", up.status);
      return "";
    }
    const { id: jobId } = await up.json();
    if (!jobId) return "";

    // 2) Poll until the job finishes (bounded by timeoutMs / the route's maxDuration).
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollMs));
      const jr = await fetch(`${BASE}/job/${jobId}`, { headers: auth });
      if (!jr.ok) {
        // Transient (rate-limit / server) → keep polling; hard error → give up.
        if (jr.status === 429 || jr.status >= 500) continue;
        console.error("llamaParse: job status", jr.status);
        return "";
      }
      const job = await jr.json();
      const status = job?.status || "PENDING";
      if (status === "SUCCESS" || status === "COMPLETED") {
        const r = await fetch(`${BASE}/job/${jobId}/result/markdown`, { headers: auth });
        if (!r.ok) return "";
        const result = await r.json();
        return (result?.markdown || "").trim();
      }
      if (status === "ERROR" || status === "FAILED") {
        console.error("llamaParse: job failed", jobId);
        return "";
      }
    }
    console.error("llamaParse: job timed out", jobId);
    return "";
  } catch (e) {
    console.error("llamaParse error:", e?.message || e);
    return "";
  }
}
