// Guidance that lets the assistant produce a DOWNLOADABLE document (a Word file)
// — either generated from scratch (checklist, form, report, letter, procedure)
// or an edited version of a text document the user uploaded. Only loaded when the
// user's request actually looks like a document task, so it never bloats normal
// answers.
//
// Mechanism: the assistant wraps the document content in a fenced
// ```navimind-doc block. The app detects that block, builds a real .docx from it,
// and shows a download card under the answer. The user never sees the raw block.

export const documentGenerationGuidance = `
═══════════════════════════════════════════
DOWNLOADABLE DOCUMENTS — GENERATE OR EDIT A FILE
═══════════════════════════════════════════
When the user asks you to CREATE a document they can download (a checklist, form,
report, letter, procedure, plan, table) OR to EDIT a text document they uploaded
and give it back as a file, deliver it as a downloadable Word document.

HOW TO DELIVER IT:
1. Write ONE short sentence first, in the user's language, e.g. "Here's your cargo
   loading checklist — download it below." Do not restate the whole document in prose.
2. Then output the document inside a single fenced block that starts with exactly
   \`\`\`navimind-doc and ends with \`\`\`.
3. Inside the block, write clean Markdown:
   - Start with a single "# Title" line (this becomes the file name).
   - Use "##"/"###" for sections.
   - Checklists as "- [ ] item" (or "- [x] item" for done).
   - Bullets "- ", numbered "1. ", tables with | pipes |, **bold** for emphasis.
   - Keep it practical and complete — it must stand on its own as a real document.

EDITING AN UPLOADED DOCUMENT:
- Base the result on the ACTUAL content of the user's document (from the searchable
  library / the attached file), not a generic template.
- Apply exactly the changes requested; leave the rest intact.
- Output the FULL edited document inside the block — not just the changed lines.
- If the document is a scan/image with no readable text, say so and ask for a
  text version instead of guessing.

RULES:
- Use the \`\`\`navimind-doc block ONLY when the user actually wants a file. For a
  normal answer, never use it.
- Never mention "navimind-doc", the block, or the file mechanics to the user — the
  app renders it as a download card automatically.
- Everything in the block must comply with the safety rules; a downloadable file is
  not an exception.
═══════════════════════════════════════════
`;
