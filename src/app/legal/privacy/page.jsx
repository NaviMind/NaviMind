"use client";

import LegalShell from "../LegalShell";

// Public Privacy Policy for NaviMind. Mirrors the in-app Privacy screen and
// reflects the real data flows in the codebase: Firebase (Auth/Firestore/
// Storage), Anthropic (answer generation + web search), OpenAI (vector search/
// OCR/drawing analysis/voice transcription), LlamaParse (document extraction),
// and Paddle (payments). NaviMind is a web-only app with no native apps, push
// notifications, or analytics/crash-reporting SDKs, so none are described here.
// Served at /legal/privacy (also reachable at /privacy via a redirect).
export default function PrivacyPolicy() {
  return (
    <LegalShell title="Privacy Policy" updated="July 2026">
      <p>
        At NaviMind we take your privacy seriously. This Privacy Policy explains how NaviMind
        (“NaviMind”, “Company”, “we”, “our”, “us”) collects, uses, shares, and protects your
        information when you use our AI-powered copilot for maritime professionals (the
        “Service”). By using the Service you agree to the practices described here.
      </p>

      <h2>1. Information we collect</h2>
      <p>
        <strong>Account information.</strong> When you sign in with Google or with email and
        password (managed by Firebase Authentication), we collect your name, email address,
        profile photo, country, email-verification status, and the authentication identifiers
        for your account.
      </p>
      <p>
        <strong>Vessel profile &amp; preferences.</strong> To personalize answers to your ship,
        you may provide a vessel profile — your rank/role, vessel type, flag state,
        classification society, ice class, capacity, engine and machinery details, LNG
        containment details, ship particulars, and notes — as well as interface preferences such
        as language, theme, and whether past-conversation memory is used.
      </p>
      <p>
        <strong>Conversations &amp; content.</strong> Chat messages, threads, topics, and
        folders; AI-generated memories; uploaded documents, manuals, spreadsheets, images, and
        vessel drawings; voice recordings you submit for transcription; and web-search queries
        made during a conversation.
      </p>
      <p>
        <strong>Usage &amp; billing data.</strong> AI-token consumption (per billing period, per
        day, and during your trial), feature usage such as document uploads and web searches,
        your plan tier and status, billing-period dates, and your Paddle customer and
        subscription identifiers.
      </p>
      <p>
        <strong>Technical data.</strong> IP address and device/browser information used to
        operate and secure the Service. Payments are handled entirely by Paddle — we never
        receive or store your card details.
      </p>

      <h2>2. Files you upload and how we process them</h2>
      <p>
        You can upload the following file types: PDF, DOC/DOCX, PPT/PPTX, TXT, Markdown, RTF,
        HTML, JSON, spreadsheets (XLSX/XLS/CSV), images (JPG/PNG/TIFF), and vessel drawings and
        plans. We process them as follows:
      </p>
      <ul>
        <li>Files are stored in your private space in Firebase Storage, subject to a per-file size limit.</li>
        <li>
          We extract the text (scanned PDFs and images are read using OCR), split it into chunks,
          create embeddings, and store them in a private OpenAI vector store so your documents can
          be searched.
        </li>
        <li>
          When you ask a question, the most relevant excerpts are retrieved and sent to Anthropic
          to generate an answer grounded in your documents, with citations back to the source file.
        </li>
        <li>
          Vessel drawings are converted to page images and analyzed to build a searchable index;
          relevant pages are sent to the AI’s vision model when you ask about a drawing.
        </li>
        <li>Voice input is sent to OpenAI to be transcribed into text.</li>
      </ul>
      <p>You can delete any uploaded file, and its stored content, at any time.</p>

      <h2>3. AI processing and providers</h2>
      <ul>
        <li><strong>Anthropic</strong> generates the answers; it receives your questions and the relevant excerpts and context.</li>
        <li><strong>OpenAI</strong> indexes your documents for search, performs OCR, analyzes drawings, and transcribes voice input.</li>
        <li><strong>LlamaIndex (LlamaParse)</strong> extracts text from complex documents.</li>
        <li>
          <strong>Web search:</strong> for questions about current regulations, NaviMind searches
          the web through Anthropic, limited to trusted maritime sources such as the IMO, flag
          registries, classification societies, port-state-control regimes, and industry bodies.
        </li>
      </ul>

      <h2>4. Memory</h2>
      <p>
        NaviMind builds a memory of key facts, decisions, and vessel details discussed in each
        topic so answers stay consistent across conversations. Memory is stored with your account
        and used only to help you. You can turn off memory referencing and clear stored memory at
        any time.
      </p>

      <h2>5. How we use your information</h2>
      <ul>
        <li>generate AI answers and analyze your documents and drawings;</li>
        <li>index your content so it can be searched to ground responses;</li>
        <li>personalize responses based on your vessel profile and preferences;</li>
        <li>authenticate you and secure your account;</li>
        <li>meter AI-token usage, enforce plan limits, and process your subscription;</li>
        <li>diagnose technical issues and protect against fraud and abuse;</li>
        <li>comply with legal obligations (including GDPR).</li>
      </ul>

      <h2>6. Third-party services</h2>
      <p>We use the following providers to run NaviMind, each receiving only the data needed for its function:</p>
      <ul>
        <li><strong>Google Firebase</strong> — authentication, database (Firestore), and file storage;</li>
        <li><strong>Anthropic</strong> — AI answer generation and web search;</li>
        <li><strong>OpenAI</strong> — document indexing and search, OCR, drawing analysis, and voice transcription;</li>
        <li><strong>LlamaIndex (LlamaParse)</strong> — document text extraction;</li>
        <li><strong>Paddle (Paddle.com Market Ltd)</strong> — payment processing and subscription management as our Merchant of Record.</li>
      </ul>

      <h2>7. Data sharing and disclosure</h2>
      <p>
        We do not sell your personal information. We share it only with the providers listed above
        to operate the Service, to comply with legal obligations, to protect our rights and prevent
        fraud, or in connection with a merger or acquisition.
      </p>

      <h2>8. Where your data is stored</h2>
      <p>
        Your content is stored in Firebase (file bytes in Storage; account data, vessel profile,
        chat history, and memories in Firestore) and, for searchable content, in OpenAI vector
        stores. Some providers process data in other countries, including the United States, under
        their own safeguards.
      </p>

      <h2>9. Data retention and deletion</h2>
      <ul>
        <li>We keep your content while your account is active.</li>
        <li>You can delete individual conversations, memories, and documents from within the app at any time.</li>
        <li>You can export all your data (profile, conversations, memories) as JSON from within the app.</li>
        <li>When you delete your account, your personal information is anonymized or removed and your authentication credentials are removed.</li>
        <li>If a free trial ends without a subscription, associated storage may be removed after a grace period.</li>
      </ul>

      <h2>10. Your rights</h2>
      <p>
        Depending on your location, you may have the right to access, correct, delete, export, or
        restrict processing of your personal data, to object to processing, and to withdraw
        consent. Use the in-app controls or contact us at support@navimind.io to exercise these
        rights.
      </p>

      <h2>11. Security</h2>
      <p>
        We protect your data with encryption in transit (TLS/SSL), authentication via Firebase with
        email verification, per-user access controls that ensure you can only access your own data,
        and file-type and file-size limits on uploads. No method of transmission or storage is
        completely secure, so we cannot guarantee absolute security.
      </p>

      <h2>12. Cookies</h2>
      <p>
        We use only essential cookies and local storage to keep you signed in and remember your
        preferences. We do not use third-party analytics, advertising, or tracking cookies.
      </p>

      <h2>13. International data transfers</h2>
      <p>
        Your information may be transferred to and processed in countries other than your own,
        including the United States, through the providers listed above, which apply appropriate
        safeguards for such transfers.
      </p>

      <h2>14. Children’s privacy</h2>
      <p>
        The Service is not intended for users under 18. We do not knowingly collect data from
        children, and we will delete such data promptly if we learn we have collected it.
      </p>

      <h2>15. Changes to this Policy</h2>
      <p>
        We may update this Policy from time to time. We will post the updated Policy here and update
        the “Last updated” date. Continued use of the Service after changes constitutes acceptance
        of the updated Policy.
      </p>

      <h2>16. Contact</h2>
      <p>
        NaviMind —{" "}
        <a href="mailto:support@navimind.io" className="text-blue-600 underline">support@navimind.io</a>{" "}
        · navimind.io
      </p>
    </LegalShell>
  );
}
