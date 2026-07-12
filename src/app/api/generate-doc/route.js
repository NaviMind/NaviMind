// Document generator — turns the markdown the assistant produced into a real,
// downloadable Word (.docx) file. Pure JS (docx + marked), so it runs anywhere,
// including Vercel serverless (no headless browser needed).
//
// Body:  { title?: string, markdown: string }
// Returns: { ok, filename, base64 }  — the client uploads the bytes to Storage
//          and shows a download card under the answer.

import { marked } from "marked";
import {
  Document, Packer, Paragraph, TextRun,
  Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle,
  TableLayoutType, ShadingType, VerticalAlign, Footer, PageNumber,
} from "docx";
import { markdownToPdf } from "@/lib/markdownToPdf";
import { BRAND } from "@/lib/brandAssets";

export const runtime = "nodejs";

function todayStr() {
  return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Unified NaviMind document style (shared intent with the PDF generator) ──
const BODY_FONT = "Calibri";          // universally available, clean sans
const SYMBOL_FONT = "Segoe UI Symbol"; // has ☐ ☑ ✓ → arrows etc. (Calibri does not)
const TABLE_FONT_HP = 19;             // ~9.5pt — keeps wide tables from cramping
const ZEBRA_FILL = "F9FAFB";

// Some glyphs the model emits (ballot boxes, geometric shapes, dingbats, arrows)
// are missing from Calibri and render as a "tofu" box in Word. Detect them so we
// can set a symbol-capable font ONLY on those runs, leaving normal text in the
// body font.
const SYMBOL_RE = /[←-⇿∀-⋿①-⓿─-➿⬀-⯿️]/;
function fontFor(text, base) {
  if (base.font) return undefined; // already set (e.g. code)
  return SYMBOL_RE.test(text || "") ? SYMBOL_FONT : undefined;
}

// Inline markdown tokens → docx TextRuns (bold / italic / code / plain).
function inlineRuns(tokens = [], base = {}) {
  const runs = [];
  for (const t of tokens) {
    if (t.type === "strong") runs.push(...inlineRuns(t.tokens, { ...base, bold: true }));
    else if (t.type === "em") runs.push(...inlineRuns(t.tokens, { ...base, italics: true }));
    else if (t.type === "codespan") runs.push(new TextRun({ text: t.text, font: "Consolas", ...base }));
    else if (t.type === "link") runs.push(...inlineRuns(t.tokens, { ...base, color: BRAND.blue, underline: {} }));
    else if (t.type === "br") runs.push(new TextRun({ break: 1 }));
    else {
      const txt = t.raw ?? t.text ?? "";
      const font = fontFor(txt, base);
      runs.push(new TextRun({ text: txt, ...base, ...(font ? { font } : {}) }));
    }
  }
  return runs.length ? runs : [new TextRun({ text: "", ...base })];
}

function textOf(tok) {
  return inlineRuns(tok?.tokens?.length ? tok.tokens : [{ type: "text", text: tok?.text || "" }]);
}

// A list item → one paragraph, with a checklist glyph, bullet, or manual number.
function listItemParagraphs(item, ordered, index) {
  const runs = textOf(item);
  if (item.task) {
    return new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: item.checked ? "☑  " : "☐  ", font: SYMBOL_FONT }), ...runs],
    });
  }
  if (ordered) {
    return new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: `${index + 1}.  ` }), ...runs],
    });
  }
  return new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: runs });
}

function tableFromToken(tok) {
  const line = { style: BorderStyle.SINGLE, size: 2, color: BRAND.line };
  const tableBorders = {
    top: line, bottom: line, left: line, right: line,
    insideHorizontal: line, insideVertical: line,
  };
  const margins = { top: 55, bottom: 55, left: 110, right: 110 };

  const headerRow = new TableRow({
    tableHeader: true,
    children: (tok.header || []).map((c) =>
      new TableCell({
        shading: { type: ShadingType.CLEAR, color: "auto", fill: BRAND.navy },
        margins,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: inlineRuns(c.tokens, { bold: true, color: "FFFFFF", size: TABLE_FONT_HP }) })],
      })
    ),
  });

  const bodyRows = (tok.rows || []).map((row, i) =>
    new TableRow({
      children: row.map((c) =>
        new TableCell({
          margins,
          verticalAlign: VerticalAlign.CENTER,
          ...(i % 2 === 1 ? { shading: { type: ShadingType.CLEAR, color: "auto", fill: ZEBRA_FILL } } : {}),
          children: [new Paragraph({ children: inlineRuns(c.tokens, { size: TABLE_FONT_HP }) })],
        })
      ),
    })
  );

  // AUTOFIT lets Word size each column to its content — the fix for wide,
  // many-column matrices that were being crushed into equal narrow columns.
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.AUTOFIT,
    borders: tableBorders,
    rows: [headerRow, ...bodyRows],
  });
}

// Block-level markdown tokens → an array of docx children.
function blocksToDocx(tokens) {
  const out = [];
  for (const tok of tokens) {
    switch (tok.type) {
      case "heading": {
        // Explicit sizing/colour (no Word built-in heading styles) so the look
        // is identical to the PDF: navy accent for H1–H2, ink for deeper levels.
        const depth = tok.depth;
        const size = depth === 1 ? 30 : depth === 2 ? 26 : depth === 3 ? 23 : 22; // half-points
        const color = depth <= 2 ? BRAND.navy : BRAND.ink;
        out.push(new Paragraph({
          spacing: { before: depth <= 2 ? 240 : 160, after: 90 },
          children: inlineRuns(tok.tokens, { bold: true, size, color }),
        }));
        break;
      }
      case "paragraph":
        out.push(new Paragraph({ spacing: { after: 120 }, children: inlineRuns(tok.tokens) }));
        break;
      case "list":
        tok.items.forEach((it, i) => out.push(listItemParagraphs(it, tok.ordered, i)));
        break;
      case "table":
        out.push(tableFromToken(tok));
        out.push(new Paragraph({ text: "" }));
        break;
      case "blockquote":
        out.push(new Paragraph({
          indent: { left: 360 },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: "98A2B3", space: 8 } },
          children: inlineRuns(tok.tokens || []),
        }));
        break;
      case "code":
        out.push(new Paragraph({
          shading: { fill: "F2F4F7" },
          children: (tok.text || "").split("\n").map((line, i) =>
            new TextRun({ text: line, font: "Consolas", size: 18, break: i ? 1 : 0 })
          ),
        }));
        break;
      case "hr":
        out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "D0D5DD" } } }));
        break;
      case "space":
        break;
      default:
        if (tok.text) out.push(new Paragraph({ text: tok.text }));
    }
  }
  return out;
}

function safeFilename(title, ext) {
  const base = String(title || "document")
    .replace(/[^\p{L}\p{N}\s._-]/gu, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60) || "document";
  return `${base}.${ext}`;
}

async function buildDocx(markdown, title, meta = {}) {
  const tokens = marked.lexer(String(markdown));

  // If the body opens with an H1, use it as the document title and drop it from
  // the body so it isn't printed twice under the branded title block.
  let docTitle = title;
  if (tokens[0]?.type === "heading" && tokens[0].depth === 1) {
    docTitle = tokens[0].tokens?.map((t) => t.raw ?? t.text ?? "").join("") || title;
    tokens.shift();
  }

  // Clean, unbranded document: just the title and the content. No logo header,
  // no "prepared for", no vessel/flag/class subtitle, no date, no footer
  // disclaimer — the user wants a plain file they can reuse anywhere without
  // deleting our chrome first. Only a neutral page number remains in the footer.
  const footer = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ children: [PageNumber.CURRENT], size: 15, color: BRAND.muted }),
        new TextRun({ text: " / ", size: 15, color: BRAND.muted }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: BRAND.muted }),
      ],
    })],
  });

  const titleBlock = [
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: String(docTitle || "Document"), bold: true, size: 40, color: BRAND.navy })],
    }),
    new Paragraph({
      spacing: { after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BRAND.navy, space: 6 } },
      children: [new TextRun({ text: "", size: 2 })],
    }),
  ];

  const children = [...titleBlock, ...blocksToDocx(tokens)];

  const doc = new Document({
    styles: { default: { document: { run: { font: BODY_FONT, size: 22, color: BRAND.ink } } } },
    sections: [{
      properties: { page: { margin: { top: 1100, bottom: 1100, left: 1000, right: 1000 } } },
      footers: { default: footer },
      children,
    }],
  });
  return Packer.toBuffer(doc);
}

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";

export async function POST(req) {
  try {
    const { title = "", markdown = "", format = "docx", meta = {} } = await req.json();
    if (!markdown || !String(markdown).trim()) {
      return Response.json({ ok: false, error: "markdown required" }, { status: 400 });
    }

    const brandMeta = { vessel: meta?.vessel || "", preparedFor: meta?.preparedFor || "", date: todayStr() };
    const isPdf = String(format).toLowerCase() === "pdf";
    const buffer = isPdf
      ? await markdownToPdf(markdown, title, brandMeta)
      : await buildDocx(markdown, title, brandMeta);

    return Response.json({
      ok: true,
      filename: safeFilename(title, isPdf ? "pdf" : "docx"),
      mime: isPdf ? PDF_MIME : DOCX_MIME,
      base64: Buffer.from(buffer).toString("base64"),
    });
  } catch (e) {
    console.error("generate-doc error:", e?.message || e);
    return Response.json({ ok: false, error: "generation failed" }, { status: 500 });
  }
}
