"use client";

import LegalShell from "../LegalShell";

// Public Privacy Policy for NaviMind. Written to match the real data flows in
// the codebase: Firebase (Auth/Firestore/Storage), Anthropic (answer
// generation + web search), OpenAI (vector search/OCR/drawing analysis/voice
// transcription), LlamaParse (document extraction), and Paddle (payments).
// NaviMind is a web-only app: there are no native apps, no push notifications,
// and no analytics/crash-reporting SDKs, so none are described here.
// Served at /legal/privacy (also reachable at /privacy via a redirect in
// next.config.js) — this is the page Google's OAuth brand review reads.
export default function PrivacyPolicy() {
  return (
    <LegalShell title="Privacy Policy" updated="July 2026">
      <h2>1. Introduction</h2>
      <p>
        At NaviMind we take your privacy seriously. This Privacy Policy explains how we
        collect, use, disclose, and safeguard your information when you use our AI-powered
        copilot for maritime professionals — ship masters, officers, engineers, and
        shore-based staff. NaviMind (“Company”, “we”, “our”, “us”) is a web application. By
        using the Service you agree to the practices described here.
      </p>

      <h2>2. Information we collect</h2>
      <p><strong>Account information.</strong> When you create an account via Google Sign-In or email and password, we collect:</p>
      <ul>
        <li>your name and email address;</li>
        <li>your profile photo URL (if provided by Google);</li>
        <li>your country;</li>
        <li>authentication identifiers managed by Firebase Authentication (email verification is required before first login).</li>
      </ul>

      <p><strong>Profile &amp; personalization data.</strong> To personalize answers to your ship, you may optionally provide a vessel profile, which can include:</p>
      <ul>
        <li>your rank/role, vessel type, flag state, classification society, and ice class;</li>
        <li>capacity and engine/machinery details, LNG containment details, and ship particulars;</li>
        <li>free-text notes;</li>
        <li>interface preferences such as language, theme, and whether past-conversation memory is used in answers.</li>
      </ul>

      <p><strong>Conversation &amp; content data.</strong></p>
      <ul>
        <li>chat messages, conversation threads, topics, and folders;</li>
        <li>AI-generated memories (contextual information the assistant remembers about you within a topic);</li>
        <li>uploaded documents and manuals (PDF, DOC/DOCX, PPT/PPTX, TXT, Markdown, RTF, HTML, JSON) and spreadsheets (XLSX/XLS/CSV);</li>
        <li>uploaded images and vessel drawings/plans analyzed by the Service;</li>
        <li>voice input you record for transcription;</li>
        <li>web-search queries initiated during a conversation.</li>
      </ul>

      <p><strong>Usage data.</strong></p>
      <ul>
        <li>AI-token consumption per billing period, and daily/trial counters, used to meter your plan;</li>
        <li>feature usage such as document uploads and web searches;</li>
        <li>standard technical information (such as IP address and device/browser information) used to operate and secure the Service.</li>
      </ul>

      <p><strong>Subscription data.</strong></p>
      <ul>
        <li>your plan tier, subscription status, billing-period dates, and Paddle customer/subscription identifiers;</li>
        <li>payment processing is handled entirely by Paddle. We do not store your credit-card or payment details.</li>
      </ul>

      <h2>3. How we use your information</h2>
      <ul>
        <li>provide, maintain, and improve the Service;</li>
        <li>generate AI answers and analyze your documents and drawings;</li>
        <li>index your uploaded content so it can be searched to ground responses;</li>
        <li>personalize responses based on your vessel profile and preferences;</li>
        <li>authenticate you and secure your account;</li>
        <li>meter AI-token usage and enforce plan limits;</li>
        <li>process and manage your subscription;</li>
        <li>diagnose technical issues and protect against fraudulent or unlawful activity;</li>
        <li>comply with legal obligations (including GDPR).</li>
      </ul>

      <h2>4. Chat data and AI processing</h2>
      <p>
        When you send a message, relevant conversation history and context are processed by
        third-party AI providers to generate a response. Specifically:
      </p>
      <ul>
        <li>
          Conversations are sent to <strong>Anthropic</strong>, which generates the answers.
        </li>
        <li>
          Uploaded documents are extracted, chunked, embedded, and stored in
          <strong> OpenAI vector stores</strong> to enable document-grounded answers; document
          text may also be extracted using <strong>LlamaIndex (LlamaParse)</strong>. OpenAI also
          performs OCR, vessel-drawing analysis, and voice transcription.
        </li>
        <li>
          When a question requires current regulatory information, a <strong>web search</strong> is
          performed via Anthropic and limited to a list of trusted maritime sources.
        </li>
        <li>
          The <strong>Memory</strong> feature lets the assistant store and recall contextual
          information about you across conversations within a topic. You can exclude memory from
          answers via a setting and clear stored memory at any time.
        </li>
        <li>You can delete your chat history, memories, and documents at any time.</li>
      </ul>

      <h2>5. Third-party services</h2>
      <p>
        We use the following providers to operate NaviMind. Each receives only the data
        necessary for its function:
      </p>
      <ul>
        <li><strong>Google Firebase</strong> — authentication, database (Firestore), and file storage;</li>
        <li><strong>Anthropic</strong> — AI model inference to generate responses, and web search;</li>
        <li><strong>OpenAI</strong> — document indexing and vector search, OCR, vessel-drawing analysis, and voice transcription;</li>
        <li><strong>LlamaIndex (LlamaParse)</strong> — document text extraction, where enabled;</li>
        <li><strong>Paddle (Paddle.com Market Ltd)</strong> — payment processing and subscription management as our Merchant of Record; handles billing, invoices, and tax compliance.</li>
      </ul>

      <h2>6. Data sharing and disclosure</h2>
      <p>We do not sell your personal information. We may share your information only:</p>
      <ul>
        <li>with your consent;</li>
        <li>with the third-party service providers listed above, solely to operate the Service;</li>
        <li>to comply with legal obligations;</li>
        <li>to protect our rights and prevent fraud;</li>
        <li>in connection with a merger or acquisition.</li>
      </ul>

      <h2>7. Data security</h2>
      <ul>
        <li>encryption in transit (TLS/SSL) for all communications;</li>
        <li>authentication via Firebase, with email verification and Google sign-in;</li>
        <li>access controls (Firebase security rules) ensuring users can only access their own data;</li>
        <li>file-type and file-size limits on uploads.</li>
      </ul>
      <p>No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>

      <h2>8. Data retention and deletion</h2>
      <ul>
        <li>we retain your information while your account is active or as needed to provide the Service;</li>
        <li>you can delete individual conversations, memories, and documents at any time from within the app;</li>
        <li>you can export all your data (profile, conversations, memories) in JSON format from within the app;</li>
        <li>when you delete your account, your personal information is anonymized or removed and your Firebase authentication credentials are removed;</li>
        <li>if a free trial ends without a subscription, associated storage may be removed after a grace period.</li>
      </ul>

      <h2>9. Your rights</h2>
      <p>Depending on your location, you may have the right to:</p>
      <ul>
        <li>access the personal information we hold about you;</li>
        <li>request correction of inaccurate data;</li>
        <li>request deletion of your data (available in-app);</li>
        <li>export your data in a portable format (available in-app);</li>
        <li>object to or restrict processing of your data;</li>
        <li>withdraw consent at any time.</li>
      </ul>
      <p>To exercise these rights, use the in-app controls or contact us at support@navimind.io.</p>

      <h2>10. Voice input</h2>
      <p>
        If you use voice input, the audio you record is sent to OpenAI for transcription into
        text so it can be used as your message. Voice input is optional.
      </p>

      <h2>11. Cookies</h2>
      <p>
        Our web application uses essential cookies and local storage to keep you signed in and
        remember your preferences. We do not currently use third-party analytics, advertising, or
        tracking cookies. You can control cookies through your browser settings, though this may
        affect functionality.
      </p>

      <h2>12. International data transfers</h2>
      <p>
        Your information may be transferred to and processed in countries other than your own,
        including the United States, through the third-party services listed in Section 5. We rely
        on those providers’ safeguards for such transfers, including standard contractual clauses
        where applicable.
      </p>

      <h2>13. Children’s privacy</h2>
      <p>
        The Service is not intended for users under 18 years of age. We do not knowingly collect
        personal information from children. If we learn we have collected such information, we will
        delete it promptly.
      </p>

      <h2>14. Changes to this Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of material changes
        by posting the new policy on this page and updating the “Last updated” date. We encourage
        you to review this policy periodically.
      </p>

      <h2>15. Contact us</h2>
      <p>
        Questions about this Policy or our data practices?{" "}
        <a href="mailto:support@navimind.io" className="text-blue-600 underline">support@navimind.io</a>
      </p>
    </LegalShell>
  );
}
