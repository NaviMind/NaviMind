import OpenAI, { toFile } from "openai";
import * as XLSX from "xlsx";
import sharp from "sharp";

export const runtime = "nodejs";
// OCR of scanned PDFs (vision) can take a while for multi-page docs — allow a
// generous duration so indexing-on-attach isn't cut off.
export const maxDuration = 300;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI vector stores moved out of `beta` in recent SDKs; fall back gracefully
// so this keeps working regardless of the exact minor version installed.
const vectorStores = openai.vectorStores || openai.beta?.vectorStores;

// Vision-capable model used to OCR scanned/image-only PDFs. Defaults to gpt-4o
// (a proven vision model already used elsewhere in this app) — NOT a speculative
// name, which would make every scanned-PDF OCR silently fail. Override with a
// newer/cheaper vision model via OPENAI_OCR_MODEL.
const OCR_MODEL = process.env.OPENAI_OCR_MODEL || process.env.OPENAI_MODEL || "gpt-4o";

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

function isPdf(file) {
  return (
    file?.type === "application/pdf" ||
    (file?.name || "").toLowerCase().endsWith(".pdf")
  );
}

function isImage(file) {
  return (
    (file?.type || "").startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp|heic|heif|tiff?)$/i.test(file?.name || "")
  );
}

function isTiff(file) {
  return (
    file?.type === "image/tiff" ||
    /\.tiff?$/i.test(file?.name || "")
  );
}

// TIFF is not accepted by the OpenAI vision endpoint — convert to JPEG first.
// Uses sharp (bundled with Next.js) so no extra dependency is needed.
async function tiffToJpegBuffer(tiffBuffer) {
  return sharp(tiffBuffer).jpeg({ quality: 92 }).toBuffer();
}

function isSpreadsheet(file) {
  return /\.(xlsx|xls|csv)$/i.test(file?.name || "");
}

function isCsv(file) {
  return /\.csv$/i.test(file?.name || "") || file?.type === "text/csv";
}

// Convert a spreadsheet to plain text so File Search can index it. CSV is
// already text; xls/xlsx are rendered sheet-by-sheet as CSV with a header line
// per sheet. Capped to avoid pathologically huge uploads.
const SPREADSHEET_CHAR_CAP = 5_000_000;

function spreadsheetToText(buffer, file) {
  if (isCsv(file)) {
    return buffer.toString("utf8").slice(0, SPREADSHEET_CHAR_CAP);
  }
  const wb = XLSX.read(buffer, { type: "buffer" });
  const parts = [];
  let total = 0;
  for (const sheetName of wb.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
    if (!csv.trim()) continue;
    const block = `# Sheet: ${sheetName}\n${csv}`;
    parts.push(block);
    total += block.length;
    if (total >= SPREADSHEET_CHAR_CAP) break;
  }
  return parts.join("\n\n").slice(0, SPREADSHEET_CHAR_CAP);
}

// Detect whether a PDF actually has an extractable text layer. Scanned/photo
// PDFs come back with almost no text → those need OCR to be searchable.
async function pdfTextDensity(buffer) {
  try {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const parsed = await pdfParse(buffer);
    const dense = (parsed?.text || "").replace(/\s/g, "").length;
    const numpages = parsed?.numpages || 1;
    return { perPage: numpages ? dense / numpages : dense, numpages };
  } catch {
    return { perPage: 0, numpages: 0 };
  }
}

// OCR a scanned PDF using a vision model. The PDF is passed inline (base64) so
// the model renders + reads the pages itself — no local PDF→image step needed.
async function ocrPdfToText(buffer, filename) {
  const b64 = buffer.toString("base64");
  const resp = await openai.responses.create({
    model: OCR_MODEL,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_file",
            filename,
            file_data: `data:application/pdf;base64,${b64}`,
          },
          {
            type: "input_text",
            text: "Extract ALL text from this document verbatim. Preserve structure and render any tables as readable text. Output ONLY the extracted text, with no commentary or explanation.",
          },
        ],
      },
    ],
  });
  return (resp.output_text || "").trim();
}

// Process an attached image in a single vision pass: extract all visible text
// AND judge whether answering about the image needs the visual itself (diagram,
// chart, photo) or whether the extracted text is enough (a plain-text
// screenshot). Returns { text, visualRequired }.
async function ocrAndClassifyImage(imageUrl) {
  const resp = await openai.responses.create({
    model: OCR_MODEL,
    input: [
      {
        role: "user",
        content: [
          { type: "input_image", image_url: imageUrl, detail: "high" },
          {
            type: "input_text",
            text:
              "You are processing an attached image (often a screenshot). Do TWO things:\n" +
              "1) On the FIRST line, output exactly 'VISUAL_REQUIRED: yes' or 'VISUAL_REQUIRED: no'. Answer 'yes' if correctly answering questions about this image requires SEEING it (diagrams, charts, photos, maps, layouts, anything beyond plain text). Answer 'no' if the extracted text alone fully captures the content (e.g. a screenshot of plain text, an email, a table).\n" +
              "2) From the SECOND line onward, output ALL text visible in the image, verbatim, preserving structure (render tables as readable text). If there is no meaningful text, output nothing after the first line.\n" +
              "No commentary.",
          },
        ],
      },
    ],
  });

  const raw = (resp.output_text || "").trim();
  const firstNl = raw.indexOf("\n");
  const firstLine = (firstNl === -1 ? raw : raw.slice(0, firstNl)).trim();
  const m = firstLine.match(/VISUAL_REQUIRED:\s*(yes|no)/i);
  if (m) {
    return {
      text: (firstNl === -1 ? "" : raw.slice(firstNl + 1)).trim(),
      visualRequired: /yes/i.test(m[1]),
    };
  }
  // Model didn't follow the format → keep everything as text and play it safe
  // by assuming the visual is needed.
  return { text: raw, visualRequired: true };
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

    const {
      vectorStoreId: incomingId,
      label = "NaviMind Library",
      files = [],
      texts = [], // raw text snippets, e.g. topic conversation memory
    } = await req.json();

    const hasFiles = Array.isArray(files) && files.length > 0;
    const hasTexts = Array.isArray(texts) && texts.length > 0;
    if (!hasFiles && !hasTexts) {
      return Response.json({ error: "Nothing to index" }, { status: 400 });
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

      // ── Images: OCR + classify in one vision pass ──────────────────────
      // Text-bearing screenshots get their text indexed (searchable) and, when
      // the visual isn't needed, the client skips sending the image to vision
      // (faster answers). Purely-visual images aren't indexed (no store junk).
      if (isImage(file)) {
        try {
          // TIFF files are not accepted by the OpenAI vision endpoint — convert
          // to JPEG in-process so they follow the same OCR path as other images.
          let visionUrl = file.url;
          if (isTiff(file)) {
            const tiffBuf = await fetch(file.url).then((r) => r.arrayBuffer()).then(Buffer.from);
            const jpegBuf = await tiffToJpegBuffer(tiffBuf);
            visionUrl = `data:image/jpeg;base64,${jpegBuf.toString("base64")}`;
          }

          const { text, visualRequired } = await ocrAndClassifyImage(visionUrl);
          if (text && text.length > 20) {
            // Index OCR text as .txt (an image extension would be rejected).
            const uploadable = await toFile(
              Buffer.from(text, "utf8"),
              `${file.name}.txt`,
              { type: "text/plain" }
            );
            const uploaded = await openai.files.create({
              file: uploadable,
              purpose: "assistants",
            });
            await vectorStores.files.createAndPoll(vectorStoreId, {
              file_id: uploaded.id,
            });
            results.push({
              ...base,
              openaiFileId: uploaded.id,
              status: "indexed",
              ocr: true,
              visualRequired,
            });
          } else {
            // No meaningful text → keep it for vision only, nothing to index.
            results.push({
              ...base,
              openaiFileId: null,
              status: "skipped:visual",
              visualRequired: true,
            });
          }
        } catch (e) {
          console.error("library: image OCR failed", file?.name, e?.message);
          // Fall back to treating it as a visual image (vision at answer time).
          results.push({
            ...base,
            openaiFileId: null,
            status: "skipped:visual",
            visualRequired: true,
          });
        }
        continue;
      }

      // ── Spreadsheets: convert to text so File Search can index them ──────
      if (isSpreadsheet(file)) {
        try {
          const buffer = Buffer.from(
            await (await fetch(file.url)).arrayBuffer()
          );
          const text = spreadsheetToText(buffer, file);
          if (text && text.trim().length > 0) {
            // Index as .txt — OpenAI keys its parser off the extension, and a
            // real ".xlsx" name would make it try (and fail) to parse binary.
            const uploadable = await toFile(
              Buffer.from(text, "utf8"),
              `${file.name}.txt`,
              { type: "text/plain" }
            );
            const uploaded = await openai.files.create({
              file: uploadable,
              purpose: "assistants",
            });
            await vectorStores.files.createAndPoll(vectorStoreId, {
              file_id: uploaded.id,
            });
            results.push({ ...base, openaiFileId: uploaded.id, status: "indexed" });
          } else {
            results.push({ ...base, openaiFileId: null, status: "skipped:empty" });
          }
        } catch (e) {
          console.error("library: spreadsheet parse failed", file?.name, e?.message);
          results.push({ ...base, openaiFileId: null, status: "failed" });
        }
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

        // Scanned PDFs have no text layer → File Search would index nothing.
        // Detect that case and OCR the pages with a vision model, then index the
        // recognised TEXT under the original filename (so citations still match).
        //
        // CRITICAL: a scanned PDF is ONLY searchable if OCR succeeds. If OCR is
        // ineligible, throws, or returns nothing, we must NOT silently upload the
        // image-only bytes and report "indexed" — File Search extracts zero text
        // from them, so the file looks ready but is invisible to search (the exact
        // "file not indexed" symptom). Fail loudly instead, with a reason.
        let uploadable;
        let ocrUsed = false;
        if (isPdf(file)) {
          const { perPage, numpages } = await pdfTextDensity(buffer);
          const looksScanned = perPage < 50;
          if (looksScanned) {
            const ocrEligible =
              buffer.length < 25 * 1024 * 1024 &&
              (numpages === 0 || numpages <= 80);
            if (!ocrEligible) {
              console.error("library: scan too large to OCR", file?.name, buffer.length, numpages);
              results.push({ ...base, openaiFileId: null, status: "failed", reason: "scan-too-large" });
              continue;
            }
            let ocrText = "";
            try {
              ocrText = await ocrPdfToText(buffer, file.name);
            } catch (e) {
              console.error("library: OCR call failed", file?.name, e?.message);
              results.push({ ...base, openaiFileId: null, status: "failed", reason: "ocr-error" });
              continue;
            }
            if (!ocrText || ocrText.length <= 20) {
              console.error("library: OCR returned no text", file?.name);
              results.push({ ...base, openaiFileId: null, status: "failed", reason: "ocr-empty" });
              continue;
            }
            // Index OCR text as .txt — a ".pdf" name would make OpenAI try to
            // parse the plain text as a PDF binary and fail.
            uploadable = await toFile(
              Buffer.from(ocrText, "utf8"),
              `${file.name}.txt`,
              { type: "text/plain" }
            );
            ocrUsed = true;
          }
        }

        // Native text PDFs and all other supported docs index the original bytes.
        if (!uploadable) {
          uploadable = await toFile(buffer, file.name, { type: file.type });
        }

        const uploaded = await openai.files.create({
          file: uploadable,
          purpose: "assistants",
        });

        // Add to the store and wait until it is fully indexed, so the very next
        // chat request can already search it.
        const vsFile = await vectorStores.files.createAndPoll(vectorStoreId, {
          file_id: uploaded.id,
        });

        // Verify it actually indexed. createAndPoll resolves even when the file
        // ends in a "failed" state — reporting that as "indexed" is exactly how a
        // file silently becomes unsearchable. Surface it instead.
        if (vsFile?.status && vsFile.status !== "completed") {
          console.error("library: vector index not completed", file?.name, vsFile.status, vsFile.last_error);
          results.push({
            ...base,
            openaiFileId: uploaded.id,
            status: "failed",
            reason: `index-${vsFile.status}`,
          });
          continue;
        }

        results.push({
          ...base,
          openaiFileId: uploaded.id,
          status: "indexed",
          ocr: ocrUsed,
        });
      } catch (e) {
        console.error("library: failed to index", file?.name, e?.message);
        results.push({ ...base, openaiFileId: null, status: "failed" });
      }
    }

    // Index raw text snippets (e.g. topic conversation memory). Each becomes a
    // small .txt file in the same store.
    const textResults = [];
    for (const t of hasTexts ? texts : []) {
      const name = t?.name || `memory-${Date.now()}.txt`;
      if (!t?.content) {
        textResults.push({ name, openaiFileId: null, status: "skipped:empty" });
        continue;
      }
      try {
        const uploadable = await toFile(
          Buffer.from(String(t.content), "utf8"),
          name.endsWith(".txt") ? name : `${name}.txt`,
          { type: "text/plain" }
        );
        const uploaded = await openai.files.create({
          file: uploadable,
          purpose: "assistants",
        });
        await vectorStores.files.createAndPoll(vectorStoreId, {
          file_id: uploaded.id,
        });
        textResults.push({ name, openaiFileId: uploaded.id, status: "indexed" });
      } catch (e) {
        console.error("library: failed to index text", name, e?.message);
        textResults.push({ name, openaiFileId: null, status: "failed" });
      }
    }

    return Response.json({ vectorStoreId, files: results, texts: textResults });
  } catch (error) {
    console.error("library route error:", error);
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}

// ───────────────────────────────────────────────────────────────────────────
// DELETE /api/library
//
// Tears down a scope's documents from OpenAI. Deleting a vector store does NOT
// delete the underlying files (they keep costing storage), so we delete both:
// every file, then the store itself.
//
// Body: { vectorStoreId?: string, fileIds?: string[] }
// Returns: { deletedFiles: number, deletedStore: boolean }
// ───────────────────────────────────────────────────────────────────────────
export async function DELETE(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const { vectorStoreId = "", fileIds = [] } = await req.json();

    let deletedFiles = 0;
    for (const id of Array.isArray(fileIds) ? fileIds : []) {
      if (!id) continue;
      try {
        await openai.files.delete(id);
        deletedFiles += 1;
      } catch (e) {
        // Already gone / not found — fine, keep going.
        console.warn("library delete: file", id, e?.message);
      }
    }

    let deletedStore = false;
    if (vectorStoreId && vectorStores) {
      try {
        await vectorStores.delete(vectorStoreId);
        deletedStore = true;
      } catch (e) {
        console.warn("library delete: store", vectorStoreId, e?.message);
      }
    }

    return Response.json({ deletedFiles, deletedStore });
  } catch (error) {
    console.error("library delete route error:", error);
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}
