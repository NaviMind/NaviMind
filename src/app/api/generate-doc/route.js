// Document generator — turns the markdown the assistant produced into a real,
// downloadable Word (.docx) file. Pure JS (docx + marked), so it runs anywhere,
// including Vercel serverless (no headless browser needed).
//
// Body:  { title?: string, markdown: string }
// Returns: { ok, filename, base64 }  — the client uploads the bytes to Storage
//          and shows a download card under the answer.

import { marked } from "marked";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle,
  Header, Footer, ImageRun, PageNumber, TabStopType, TabStopPosition,
} from "docx";
import { markdownToPdf } from "@/lib/markdownToPdf";
import { BRAND, BRAND_LOGO_PNG_B64 } from "@/lib/brandAssets";

export const runtime = "nodejs";

const LOGO_BUF = Buffer.from(BRAND_LOGO_PNG_B64, "base64");
function todayStr() {
  return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const HEADING = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
};

// Inline markdown tokens → docx TextRuns (bold / italic / code / plain).
function inlineRuns(tokens = [], base = {}) {
  const runs = [];
  for (const t of tokens) {
    if (t.type === "strong") runs.push(...inlineRuns(t.tokens, { ...base, bold: true }));
    else if (t.type === "em") runs.push(...inlineRuns(t.tokens, { ...base, italics: true }));
    else if (t.type === "codespan") runs.push(new TextRun({ text: t.text, font: "Consolas", ...base }));
    else if (t.type === "link") runs.push(...inlineRuns(t.tokens, { ...base }));
    else if (t.type === "br") runs.push(new TextRun({ break: 1 }));
    else runs.push(new TextRun({ text: t.raw ?? t.text ?? "", ...base }));
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
      children: [new TextRun({ text: item.checked ? "☑  " : "☐  " }), ...runs],
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
  const border = { style: BorderStyle.SINGLE, size: 4, color: "D0D5DD" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const headerRow = new TableRow({
    tableHeader: true,
    children: (tok.header || []).map((c) =>
      new TableCell({
        borders,
        shading: { fill: "F2F4F7" },
        children: [new Paragraph({ children: inlineRuns(c.tokens, { bold: true }) })],
      })
    ),
  });
  const bodyRows = (tok.rows || []).map((row) =>
    new TableRow({
      children: row.map((c) =>
        new TableCell({ borders, children: [new Paragraph({ children: inlineRuns(c.tokens) })] })
      ),
    })
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] });
}

// Block-level markdown tokens → an array of docx children.
function blocksToDocx(tokens) {
  const out = [];
  for (const tok of tokens) {
    switch (tok.type) {
      case "heading":
        out.push(new Paragraph({
          heading: HEADING[tok.depth] || HeadingLevel.HEADING_4,
          spacing: { before: 200, after: 100 },
          children: inlineRuns(tok.tokens),
        }));
        break;
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
      children: [new TextRun({ text: String(docTitle || "Document"), bold: true, size: 40, color: BRAND.ink })],
    }),
    new Paragraph({
      spacing: { after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "D0D5DD", space: 6 } },
      children: [new TextRun({ text: "", size: 2 })],
    }),
  ];

  const children = [...titleBlock, ...blocksToDocx(tokens)];

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22, color: BRAND.ink } } } },
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
