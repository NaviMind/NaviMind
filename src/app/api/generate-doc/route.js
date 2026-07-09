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
} from "docx";
import { markdownToPdf } from "@/lib/markdownToPdf";

export const runtime = "nodejs";

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

async function buildDocx(markdown, title) {
  const tokens = marked.lexer(String(markdown));
  const body = blocksToDocx(tokens);
  const children = [];
  if (title && tokens[0]?.type !== "heading") {
    children.push(new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      spacing: { after: 200 },
      children: [new TextRun({ text: String(title) })],
    }));
  }
  children.push(...body);
  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ properties: {}, children }],
  });
  return Packer.toBuffer(doc);
}

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";

export async function POST(req) {
  try {
    const { title = "", markdown = "", format = "docx" } = await req.json();
    if (!markdown || !String(markdown).trim()) {
      return Response.json({ ok: false, error: "markdown required" }, { status: 400 });
    }

    const isPdf = String(format).toLowerCase() === "pdf";
    const buffer = isPdf
      ? await markdownToPdf(markdown, title)
      : await buildDocx(markdown, title);

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
