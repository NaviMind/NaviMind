import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ───────────────────────────────────────────────────────────────────────────
// POST /api/library/purge-orphans
//
// Cold memory is written fire-and-forget: a memory-*.txt may land in OpenAI
// even if the Firestore record write fails, leaving an orphan the app can no
// longer track or delete. This sweeps them.
//
// The client (which has Firestore access; routes don't) gathers every
// openaiFileId the app still references and sends it here. We list the user's
// assistants-purpose files, and delete only those named "memory-*" that are NOT
// in the known set — never touches tracked files or anything else (drawings,
// library docs).
//
// Body: { knownFileIds: string[] }
// Returns: { scanned, candidates, deleted }
// ───────────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const { knownFileIds = [] } = await req.json();
    const known = new Set((Array.isArray(knownFileIds) ? knownFileIds : []).filter(Boolean));

    let scanned = 0;
    const orphans = [];
    // Auto-paginated list of every assistants-purpose file.
    for await (const f of openai.files.list({ purpose: "assistants" })) {
      scanned += 1;
      const name = f.filename || "";
      if (!name.startsWith("memory-")) continue; // only cold-memory snippets
      if (known.has(f.id)) continue;             // still referenced — keep
      orphans.push(f.id);
    }

    let deleted = 0;
    for (const id of orphans) {
      try {
        await openai.files.delete(id);
        deleted += 1;
      } catch (e) {
        console.warn("purge-orphans: delete", id, e?.message);
      }
    }

    return Response.json({ scanned, candidates: orphans.length, deleted });
  } catch (e) {
    console.error("purge-orphans error:", e);
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}
