"use client";

import LegalShell from "../LegalShell";

// Public Privacy Policy for NaviMind. Reflects the real data flows: Firebase
// (Auth/Firestore/Storage), Anthropic + OpenAI for AI processing, LlamaParse for
// document extraction, and Paddle for payments. No analytics/tracking is used.
// Served at /legal/privacy (also reachable at /privacy via a redirect in
// next.config.js) — this is the page Google's OAuth brand review reads.
export default function PrivacyPolicy() {
  return (
    <LegalShell title="Privacy Policy" updated="July 2026">
      <p>
        This Privacy Policy explains how NaviMind (“Company”, “we”, “our”, “us”) collects,
        uses, shares, and protects your information when you use our website and services
        (the “Service”). By using the Service you agree to the practices described here.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          <strong>Account information</strong> — your name, email address, profile photo,
          country, and the sign-in method you use (Google or email/password), managed
          through Firebase Authentication.
        </li>
        <li>
          <strong>Content you provide</strong> — chat messages, uploaded documents and
          manuals, vessel drawings and plans, your vessel profile (such as rank, vessel
          type, flag, class, and technical details), and memories the Service generates from
          your conversations.
        </li>
        <li>
          <strong>Usage data</strong> — feature usage and AI-token consumption, which we
          record to meter your plan and enforce usage limits.
        </li>
        <li>
          <strong>Technical data</strong> — standard information such as IP address and
          device/browser information used to operate and secure the Service.
        </li>
        <li>
          <strong>Payment data</strong> — handled by our payment provider, Paddle. We do not
          store your card details.
        </li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>generate AI answers and analyze your documents and drawings;</li>
        <li>index your uploaded content so it can be searched to ground responses;</li>
        <li>personalize responses to your vessel profile;</li>
        <li>authenticate you and secure your account;</li>
        <li>meter AI-token usage and process subscriptions and billing;</li>
        <li>maintain, improve, and support the Service; and</li>
        <li>comply with legal obligations (including GDPR).</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>3. AI processing</h2>
      <p>
        To generate answers, relevant excerpts of your questions and uploaded content are
        sent to third-party AI providers — <strong>Anthropic</strong> (which generates the
        responses) and <strong>OpenAI</strong> (which indexes your documents for search and
        performs tasks such as OCR, drawing analysis, and voice transcription). Document text
        may also be extracted using <strong>LlamaIndex (LlamaParse)</strong>. These providers
        process your data only to deliver their part of the Service. When a question needs
        current regulatory information, a web search may be performed and limited to trusted
        maritime sources.
      </p>

      <h2>4. Sub-processors &amp; sharing</h2>
      <p>We rely on trusted providers to run the Service and share data only as needed with:</p>
      <ul>
        <li><strong>Google Firebase</strong> — authentication, database (Firestore), and file storage;</li>
        <li><strong>Anthropic</strong> — AI answer generation and web search;</li>
        <li><strong>OpenAI</strong> — document indexing/search, OCR, drawing analysis, and transcription;</li>
        <li><strong>LlamaIndex (LlamaParse)</strong> — document text extraction, where enabled;</li>
        <li><strong>Paddle (Paddle.com Market Ltd)</strong> — payment processing as our Merchant of Record;</li>
        <li>legal authorities, where required by law.</li>
      </ul>

      <h2>5. Where your data is stored</h2>
      <p>
        Your content is stored across Firebase (file bytes in Firebase Storage; account and
        content metadata, vessel profile, chat history, and memories in Firestore) and, for
        searchable content, in OpenAI vector stores. Some of these providers process data
        outside your country, including in the United States; we rely on the providers’
        safeguards for such international transfers.
      </p>

      <h2>6. Data retention</h2>
      <p>
        We keep your content while your account is active. If a free trial ends without a
        subscription, associated storage may be removed after a grace period. You can delete
        individual chats, memories, and documents from within the app, or delete your entire
        account. On account deletion, your personal information is anonymized or removed and
        your authentication credentials are removed.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Depending on your location, you may have the right to access, correct, export,
        delete, or restrict the processing of your personal data (including rights under the
        GDPR). You can export your data as JSON from within the app, and you can contact us to
        exercise any of these rights.
      </p>

      <h2>8. Security</h2>
      <p>
        We use encryption in transit, access controls, and reputable cloud infrastructure to
        protect your data. However, no method of transmission or storage is 100% secure, and
        we cannot guarantee absolute security.
      </p>

      <h2>9. Cookies</h2>
      <p>
        We use only essential cookies and local storage needed to keep you signed in and
        remember your preferences. We do not currently use third-party analytics, advertising,
        or tracking cookies.
      </p>

      <h2>10. Children’s privacy</h2>
      <p>
        The Service is not intended for individuals under 18, and we do not knowingly collect
        data from children.
      </p>

      <h2>11. Changes to this Policy</h2>
      <p>
        We may update this Policy from time to time. We will post the updated Policy on this
        page and update the “Last updated” date. Continued use of the Service after changes
        constitutes acceptance of the updated Policy.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about this Policy?{" "}
        <a href="mailto:support@navimind.io" className="text-blue-600 underline">support@navimind.io</a>
      </p>
    </LegalShell>
  );
}
