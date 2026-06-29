// Same-origin download proxy.
//
// Browsers refuse a cross-origin `<a download>` and Firebase Storage URLs
// aren't CORS-fetchable from the page, so an in-browser blob download fails and
// the file just opens in a tab. We instead stream the file through our own
// origin with `Content-Disposition: attachment`, so the browser saves it (and
// drag-out works) without any CORS or org cross-origin-download block.
//
// Input : GET ?url=<encoded file url>&name=<filename>
// Output: the file bytes with attachment headers

export const runtime = "nodejs";
export const maxDuration = 60;

// Only proxy Google/Firebase storage hosts — never an arbitrary URL (SSRF guard).
const ALLOWED_HOSTS = new Set([
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
]);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");
  const name = (searchParams.get("name") || "file").replace(/[\r\n"\\]/g, "_");
  if (!target) return new Response("url required", { status: 400 });

  let u;
  try {
    u = new URL(target);
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (u.protocol !== "https:" || !ALLOWED_HOSTS.has(u.hostname)) {
    return new Response("host not allowed", { status: 403 });
  }

  let upstream;
  try {
    upstream = await fetch(u.toString());
  } catch {
    return new Response("fetch failed", { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response("upstream error", { status: upstream.status || 502 });
  }

  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";
  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${name}"`,
    "Cache-Control": "private, max-age=0, no-store",
  });
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);

  return new Response(upstream.body, { status: 200, headers });
}
