// Markdown → PDF, mirroring the .docx generator so both formats come from the
// same assistant output. Uses pdfmake with DejaVu Sans embedded as base64 (no
// runtime file paths → reliable on Vercel) and full Unicode incl. Cyrillic.

import { marked } from "marked";
import PdfPrinter from "pdfmake"; // 0.2.x server API: default export is the printer
import { DEJAVU_REGULAR_B64, DEJAVU_BOLD_B64 } from "./pdfFonts.js";
import { BRAND } from "./brandAssets.js";

const C = (hex) => `#${hex}`;

let _printer;
function getPrinter() {
  if (_printer) return _printer;
  const normal = Buffer.from(DEJAVU_REGULAR_B64, "base64");
  const bold = Buffer.from(DEJAVU_BOLD_B64, "base64");
  // No dedicated italic file — map italics to the regular/bold face (fine for
  // documents; DejaVu still slants nothing but keeps text readable).
  _printer = new PdfPrinter({
    DejaVu: { normal, bold, italics: normal, bolditalics: bold },
  });
  return _printer;
}

// Inline markdown tokens → pdfmake text runs.
function inline(tokens = [], acc = {}) {
  const runs = [];
  for (const t of tokens) {
    if (t.type === "strong") runs.push(...inline(t.tokens, { ...acc, bold: true }));
    else if (t.type === "em") runs.push(...inline(t.tokens, { ...acc, italics: true }));
    else if (t.type === "codespan") runs.push({ text: t.text, ...acc });
    else if (t.type === "link") runs.push(...inline(t.tokens, { ...acc, color: "#1D4ED8", decoration: "underline" }));
    else if (t.type === "br") runs.push({ text: "\n" });
    else runs.push({ text: t.raw ?? t.text ?? "", ...acc });
  }
  return runs.length ? runs : [{ text: "" }];
}
function inlineOf(tok) {
  return inline(tok?.tokens?.length ? tok.tokens : [{ type: "text", text: tok?.text || "" }]);
}

const H_SIZE = { 1: 20, 2: 15, 3: 13, 4: 12 };

function blocks(tokens) {
  const c = [];
  for (const tok of tokens) {
    switch (tok.type) {
      case "heading":
        // Navy accent for H1–H2, ink for deeper levels — matches the .docx.
        c.push({
          text: inline(tok.tokens),
          fontSize: H_SIZE[tok.depth] || 12,
          bold: true,
          color: tok.depth <= 2 ? C(BRAND.navy) : C(BRAND.ink),
          margin: [0, tok.depth <= 2 ? 12 : 8, 0, 4],
        });
        break;
      case "paragraph":
        c.push({ text: inline(tok.tokens), margin: [0, 0, 0, 6] });
        break;
      case "list":
        if (tok.items.some((it) => it.task)) {
          // Checklist — the ☐/☑ glyph is the marker (DejaVu has them).
          tok.items.forEach((it) =>
            c.push({ text: [{ text: it.checked ? "☑  " : "☐  " }, ...inlineOf(it)], margin: [0, 0, 0, 3] })
          );
        } else if (tok.ordered) {
          c.push({ ol: tok.items.map((it) => ({ text: inlineOf(it) })), margin: [0, 0, 0, 6] });
        } else {
          c.push({ ul: tok.items.map((it) => ({ text: inlineOf(it) })), margin: [0, 0, 0, 6] });
        }
        break;
      case "table": {
        const widths = (tok.header || []).map(() => "*");
        const body = [
          (tok.header || []).map((h) => ({ text: inline(h.tokens), bold: true, color: "#FFFFFF", fontSize: 9 })),
        ];
        (tok.rows || []).forEach((r) =>
          body.push(r.map((cell) => ({ text: inline(cell.tokens), fontSize: 9 })))
        );
        c.push({
          table: { headerRows: 1, widths, body },
          // Navy header, zebra body, thin hairlines, breathing padding — the
          // same visual language as the .docx tables.
          layout: {
            fillColor: (rowIndex) =>
              rowIndex === 0 ? C(BRAND.navy) : rowIndex % 2 === 0 ? "#F9FAFB" : null,
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => C(BRAND.line),
            vLineColor: () => C(BRAND.line),
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
          margin: [0, 4, 0, 12],
        });
        break;
      }
      case "blockquote":
        c.push({ text: inline(tok.tokens || []), italics: true, color: "#475467", margin: [12, 0, 0, 6] });
        break;
      case "code":
        c.push({ text: tok.text || "", fontSize: 9, color: "#334155", background: "#F2F4F7", margin: [0, 0, 0, 6] });
        break;
      case "hr":
        c.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#D0D5DD" }], margin: [0, 4, 0, 8] });
        break;
      case "space":
        break;
      default:
        if (tok.text) c.push({ text: tok.text, margin: [0, 0, 0, 6] });
    }
  }
  return c;
}

export async function markdownToPdf(markdown, title, meta = {}) {
  const tokens = marked.lexer(String(markdown || ""));

  // Body opens with an H1 → use it as the title, drop it from the body.
  let docTitle = title;
  if (tokens[0]?.type === "heading" && tokens[0].depth === 1) {
    docTitle = tokens[0].tokens?.map((t) => t.raw ?? t.text ?? "").join("") || title;
    tokens.shift();
  }

  // Clean, unbranded document: just the title and the content. No logo, no
  // "prepared for", no vessel/flag/class subtitle, no date — the user wants a
  // plain file they can reuse anywhere without deleting our chrome first.
  const content = [
    { text: String(docTitle || "Document"), fontSize: 20, bold: true, color: C(BRAND.navy), margin: [0, 0, 0, 8] },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: C(BRAND.navy) }], margin: [0, 0, 0, 14] },
    ...blocks(tokens),
  ];

  const docDefinition = {
    defaultStyle: { font: "DejaVu", fontSize: 11, lineHeight: 1.25, color: C(BRAND.ink) },
    pageMargins: [50, 50, 50, 55],
    content,
    // Only a neutral page number — no branding or disclaimer line.
    footer: (currentPage, pageCount) => ({
      margin: [50, 8, 50, 0],
      text: `${currentPage} / ${pageCount}`,
      fontSize: 8,
      color: C(BRAND.muted),
      alignment: "right",
    }),
  };

  const doc = getPrinter().createPdfKitDocument(docDefinition);
  return await new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (d) => chunks.push(d));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
