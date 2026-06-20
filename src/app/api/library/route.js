import OpenAI, { toFile } from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI vector stores moved out of `beta` in recent SDKs; fall back gracefully
// so this keeps working regardless of the exact minor version installed.
const vectorStores = openai.vectorStores || openai.beta?.vectorStores;

// File Search can ingest text-like documents (PDF, Word, plain text, etc.) but
// NOT spreadsheets or images. We screen here so unsupported types fail fast with
// a clear status instead of erroring deep inside the OpenAI upload.
const SUPPORTED_EXTS = new Set([
  "pdf", "doc", "docx", "txt", "md", "markdown",
  "pptx", "ppt", "html", "htm", "rtf", "json",
]);

function isSupported(file) {
  const ext = (file?.name || "").split(".").pop()?.toLowerCase();
  return ext ? SUPPORTED_EXTS.has(ext) : false;
}

// ───────────────────────────────────────────────────────────────────────────
// POST /api/library
//
// Indexes one or more documents into an OpenAI vector store so they become
// searchable via the File Search tool in /api/rag.
//
// Body:
//   {
//     vectorStoreId?: string,         // reuse an existing store; created if absent
//     label?: string,                 // human-readable name for a freshly created store
//     files: [{ url, name, type }]    // Storage URLs uploaded earlier in the client
//   }
//
// Returns:
//   {
//     vectorStoreId: string,
//     files: [{ name, type, url, openaiFileId, status }]
//   }
//
// The caller (client) persists vectorStoreId + the per-file openaiFileId to
// Firestore — there is no admin SDK on the server, so all DB writes stay client
// side. The openaiFileId is what later lets us delete the file for TTL/cleanup.
// ───────────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }
    if (!vectorStores) {
      return Response.json(
        { error: "Vector stores unavailable in this OpenAI SDK build" },
        { status: 500 }
      );
    }

    const { vectorStoreId: incomingId, label = "NaviMind Library", files = [] } =
      await req.json();

    if (!Array.isArray(files) || files.length === 0) {
      return Response.json({ error: "No files to index" }, { status: 400 });
    }

    // Ensure a vector store exists. Create lazily on first upload so we never
    // make empty stores for users who never attach documents.
    let vectorStoreId = incomingId;
    if (!vectorStoreId) {
      const store = await vectorStores.create({ name: label });
      vectorStoreId = store.id;
    }

    const results = [];
    for (const file of files) {
      const base = { name: file?.name, type: file?.type, url: file?.url };

      if (!file?.url) {
        results.push({ ...base, openaiFileId: null, status: "skipped:no-url" });
        continue;
      }
      if (!isSupported(file)) {
        results.push({ ...base, openaiFileId: null, status: "skipped:unsupported" });
        continue;
      }

      try {
        // Pull the bytes from Storage and hand them to the OpenAI Files API.
        const buffer = Buffer.from(
          await (await fetch(file.url)).arrayBuffer()
        );
        const uploadable = await toFile(buffer, file.name, { type: file.type });

        const uploaded = await openai.files.create({
          file: uploadable,
          purpose: "assistants",
        });

        // Add to the store and wait until it is fully indexed, so the very next
        // chat request can already search it.
        await vectorStores.files.createAndPoll(vectorStoreId, {
          file_id: uploaded.id,
        });

        results.push({ ...base, openaiFileId: uploaded.id, status: "indexed" });
      } catch (e) {
        console.error("library: failed to index", file?.name, e?.message);
        results.push({ ...base, openaiFileId: null, status: "failed" });
      }
    }

    return Response.json({ vectorStoreId, files: results });
  } catch (error) {
    console.error("library route error:", error);
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}
