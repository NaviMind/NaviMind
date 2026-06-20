import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const vectorStores = openai.vectorStores || openai.beta?.vectorStores;

// ───────────────────────────────────────────────────────────────────────────
// POST /api/library/expire
//
// Removes specific files from a vector store WITHOUT deleting the store itself
// — used for TTL cleanup of the shared per-user library (regular chats). For
// each file we detach it from the store and then delete the underlying file so
// it stops costing storage.
//
// Body: { vectorStoreId: string, fileIds: string[] }
// Returns: { removed: number }
// ───────────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const { vectorStoreId = "", fileIds = [] } = await req.json();

    let removed = 0;
    for (const id of Array.isArray(fileIds) ? fileIds : []) {
      if (!id) continue;
      // Detach from the store (best-effort), then delete the file itself.
      if (vectorStoreId && vectorStores) {
        try {
          await vectorStores.files.delete(id, { vector_store_id: vectorStoreId });
        } catch (e) {
          console.warn("expire: detach", id, e?.message);
        }
      }
      try {
        await openai.files.delete(id);
        removed += 1;
      } catch (e) {
        console.warn("expire: delete file", id, e?.message);
      }
    }

    return Response.json({ removed });
  } catch (error) {
    console.error("library expire route error:", error);
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}
