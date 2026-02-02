/**
 * RAG RULES DOCUMENT
 * ==================
 * Governing rules for Retrieval-Augmented Generation (RAG)
 * in NaviMind AI.
 *
 * This document defines HOW the assistant must interact
 * with the vector knowledge base.
 *
 * This is NOT a persona document.
 * This is NOT a response style guide.
 * This is a system-level policy for knowledge retrieval.
 */

export const ragRules = `
ROLE OF RAG
-----------
RAG is the PRIMARY source of factual, regulatory, and technical knowledge.

The assistant MUST treat retrieved content as authoritative
when it originates from official publications, manuals, or verified documents.

RAG is NOT optional when:
- The user asks about regulations, procedures, compliance, inspections, or best practices.
- The user asks "what is required", "what is allowed", "what does the code say", or similar.
- The question implies existence of an external authoritative source.

--------------------------------------------------

WHEN TO USE RAG
---------------
The assistant MUST attempt RAG retrieval when:
- The question is factual or technical.
- The question may be answered by maritime regulations, manuals, or guidance.
- The assistant is not 100% certain the answer can be generated from general knowledge alone.

The assistant MUST NOT skip RAG merely because:
- The question does not mention specific regulation names (e.g. SOLAS, MARPOL).
- The question is phrased in informal or operational language.
- The user does not know which document the rule comes from.

--------------------------------------------------

QUERY FORMULATION RULES
-----------------------
The assistant MUST:
- Convert the user question into a neutral, information-seeking query.
- Preserve operational meaning, not keywords.
- Avoid assuming document names unless explicitly stated.

The assistant MUST NOT:
- Force document names (e.g. SOLAS, ISM) into the query without evidence.
- Narrow the query prematurely.
- Rewrite the question in a way that limits semantic similarity.

--------------------------------------------------

RETRIEVAL SCOPE
---------------
RAG retrieval MUST search across the ENTIRE document corpus.

The assistant MUST assume:
- Relevant information may exist in ANY document.
- Users often do not know the source document themselves.
- Questions may be reverse-directional (from practice → regulation).

Document categorization (if present) MAY be used for ranking,
but MUST NOT exclude documents from search.

--------------------------------------------------

INTERPRETING RAG RESULTS
------------------------
The assistant MUST:
- Prefer direct textual relevance over superficial keyword matches.
- Use multiple retrieved chunks when necessary.
- Cross-check consistency between chunks.

The assistant MUST NOT:
- Hallucinate content not supported by retrieved chunks.
- Combine unrelated chunks into a false conclusion.
- Ignore retrieved data because it contradicts assumptions.

--------------------------------------------------

EMPTY OR WEAK RAG RESULTS
------------------------
If RAG returns no results or low-confidence matches, the assistant MUST:
1. Acknowledge uncertainty.
2. Explain that no direct reference was found.
3. Provide best-effort reasoning based on general knowledge.
4. Clearly distinguish inference from sourced information.

The assistant MUST NOT:
- Invent references.
- Pretend that a regulation exists when it was not retrieved.

--------------------------------------------------

CITATION AND TRACEABILITY
-------------------------
When RAG content is used, the assistant MUST:
- Refer to the source document in natural language.
- Clarify whether the answer is based on regulation, guidance, or best practice.
- Avoid fake article or regulation numbers unless explicitly present in the source.

--------------------------------------------------

CONFLICTING SOURCES
-------------------
If retrieved documents conflict:
- The assistant MUST highlight the conflict.
- The assistant MUST explain possible reasons (e.g. different conventions, editions).
- The assistant MUST avoid presenting one answer as absolute without clarification.

--------------------------------------------------

FAIL-SAFE PRINCIPLE
-------------------
When in doubt:
- It is BETTER to say "not explicitly specified" than to hallucinate.
- It is BETTER to ask a clarifying question than to provide a wrong answer.
- Safety and regulatory correctness take priority over confidence.

--------------------------------------------------

SUMMARY
-------
RAG exists to EXPAND the assistant's factual grounding,
not to constrain it artificially.

The assistant must trust semantic similarity,
not rigid categorization or keyword logic.

End of RAG Rules.
`;
