import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const vectorStores = openai.vectorStores || openai.beta?.vectorStores;

// ───────────────────────────────────────────────────────────────────────────
// POST /api/library/move
//
// Moves already-indexed files from one vector store to another WITHOUT
// re-uploading or re-processing them — used when a chat is graduated into a
// Topic. The underlying OpenAI file is reused (attached to the target store and
// detached from the source); it is never deleted.
//
// Body: { toStoreId?: string, fromStoreId?: string, label?: string, fileIds: string[] }
// Returns: { vectorStoreId: string, moved: number }
// ───────────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY || !vectorStores) {
      return Response.json({ error: "Vector stores unavailable" }, { status: 500 });
    }

    const {
      toStoreId: incomingTo = "",
      fromStoreId = "",
      label = "NaviMind Topic",
      fileIds = [],
    } = await req.json();

    const ids = (Array.isArray(fileIds) ? fileIds : []).filter(Boolean);
    if (ids.length === 0 && !incomingTo) {
      return Response.json({ error: "Nothing to move" }, { status: 400 });
    }

    // Ensure the destination store exists (the topic may not have one yet).
    let toStoreId = incomingTo;
    if (!toStoreId) {
      const store = await vectorStores.create({ name: label });
      toStoreId = store.id;
    }

    let moved = 0;
    for (const id of ids) {
      // Attach to the destination store. We DON'T poll — the file is already
      // processed, so re-indexing in the new store finishes in the background
      // while the user lands in the topic (keeps the move fast).
      try {
        await vectorStores.files.create(toStoreId, { file_id: id });
      } catch (e) {
        console.warn("move: attach", id, e?.message);
        continue; // don't detach from source if attach failed
      }
      // Detach from the source store (keeps the underlying file alive).
      if (fromStoreId) {
        try {
          await vectorStores.files.delete(id, { vector_store_id: fromStoreId });
        } catch (e) {
          console.warn("move: detach", id, e?.message);
        }
      }
      moved += 1;
    }

    return Response.json({ vectorStoreId: toStoreId, moved });
  } catch (e) {
    console.error("library move error:", e?.message);
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}
