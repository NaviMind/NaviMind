import * as XLSX from "xlsx";

export const runtime = "nodejs";

// Only fetch from our own Storage — prevents the endpoint being used as an
// open proxy (SSRF).
function isAllowedUrl(url) {
  try {
    const h = new URL(url).hostname;
    return h.endsWith("googleapis.com");
  } catch {
    return false;
  }
}

function getExt(name = "") {
  return name.split(".").pop()?.toLowerCase() || "";
}

const PAGE_CSS = `
  :root { color-scheme: light dark; }
  body {
    margin: 0; padding: 24px;
    font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px; line-height: 1.6; color: #1f2937; background: #fff;
    -webkit-text-size-adjust: 100%;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #e5e7eb; background: #0b1220; }
    a { color: #60a5fa; }
    table, th, td { border-color: #374151 !important; }
    th { background: #1f2937 !important; }
  }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; vertical-align: top; white-space: pre-wrap; }
  th { background: #f3f4f6; font-weight: 600; }
  h1,h2,h3 { line-height: 1.3; }
  .nm-sheet-title { margin: 22px 0 6px; font-size: 15px; font-weight: 700; color: #2563eb; }
  .nm-fallback { max-width: 560px; margin: 10vh auto; text-align: center; }
  .nm-fallback a { display: inline-block; margin-top: 14px; padding: 10px 18px; background: #2563eb; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; }
`;

function htmlPage(inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${PAGE_CSS}</style></head><body>${inner}</body></html>`;
}

function fallback(name, url, note) {
  return htmlPage(
    `<div class="nm-fallback"><p>${note || "Inline preview isn't available for this file."}</p>` +
      `<p style="opacity:.6">${name || ""}</p>` +
      (url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">Download / open file</a>` : "") +
      `</div>`
  );
}

function sheetsToHtml(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const parts = [];
  for (const sheetName of wb.SheetNames) {
    // sheet_to_html returns a full HTML document — keep just the <table> so it
    // sits cleanly inside our own styled page (and lets us show all sheets).
    const doc = XLSX.utils.sheet_to_html(wb.Sheets[sheetName]);
    const table = doc.match(/<table[\s\S]*<\/table>/i)?.[0] || "";
    if (table) parts.push(`<div class="nm-sheet-title">${sheetName}</div>${table}`);
  }
  return parts.length ? parts.join("\n") : "<p>Empty spreadsheet.</p>";
}

// ───────────────────────────────────────────────────────────────────────────
// GET /api/preview?url=<storage url>&name=<filename>
//
// Renders Word / Excel / CSV files to HTML server-side (mammoth + SheetJS) so
// they can be shown in an <iframe> reliably, without depending on third-party
// online viewers. Returns text/html.
// ───────────────────────────────────────────────────────────────────────────
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";
  const name = searchParams.get("name") || "document";

  const send = (html, status = 200) =>
    new Response(html, {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, max-age=300" },
    });

  if (!url || !isAllowedUrl(url)) {
    return send(fallback(name, "", "Invalid or unsupported file URL."), 400);
  }

  try {
    const buffer = Buffer.from(await (await fetch(url)).arrayBuffer());
    const ext = getExt(name);

    if (ext === "docx") {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.convertToHtml({ buffer });
      return send(htmlPage(value || fallback(name, url)));
    }

    if (ext === "xlsx" || ext === "xls" || ext === "csv") {
      return send(htmlPage(sheetsToHtml(buffer)));
    }

    // Old binary .doc and anything else we can't render here.
    return send(fallback(name, url, "Inline preview isn't available for this format."));
  } catch (e) {
    console.error("preview route error:", e?.message);
    return send(fallback(name, url, "Couldn't render a preview for this file."), 500);
  }
}
