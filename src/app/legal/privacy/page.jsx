"use client";

import LegalShell from "../LegalShell";

// Public Privacy Policy for NaviMind. Follows the standard SaaS structure and
// reflects the real data flows: Firebase (Auth/Firestore/Storage), Anthropic
// (answer generation + web search), OpenAI (vector search/OCR/drawing analysis/
// voice transcription), LlamaParse (document extraction), and Paddle (payments).
// NaviMind is a web-only app with no native apps, push notifications, or
// analytics/crash-reporting SDKs, so none are described here.
// Served at /legal/privacy (also reachable at /privacy via a redirect).
export default function PrivacyPolicy() {
  return (
    <LegalShell title="Privacy Policy" updated="July 2026">
      <h2>1. Introduction</h2>
      <p>
        At NaviMind, we take your privacy seriously. This Privacy Policy explains how we collect,
        use, disclose, and safeguard your information when you use our AI-powered copilot for
        maritime professionals, including ship masters, senior officers, marine engineers, and
        watchkeeping officers.
      </p>

      <h2>2. Information We Collect</h2>
      <p><strong>Account Information</strong></p>
      <p>When you create an account via Google Sign-In or email and password, we collect:</p>
      <ul>
        <li>Name and email address</li>
        <li>Profile photo URL (if provided by your sign-in provider)</li>
        <li>Authentication identifiers managed by Firebase Authentication</li>
      </ul>

      <p><strong>Profile &amp; Personalization Data</strong></p>
      <p>To personalize your experience, you may optionally provide:</p>
      <ul>
        <li>Your vessel profile — rank/role, vessel type, flag state, classification society, ice class, capacity, engine and machinery details, LNG containment details, ship particulars, and notes</li>
        <li>Interface preferences (language and theme)</li>
        <li>Memory and chat-history referencing preferences</li>
      </ul>

      <p><strong>Conversation &amp; Content Data</strong></p>
      <ul>
        <li>Chat messages and conversation threads</li>
        <li>AI-generated memories (contextual information the assistant remembers about you)</li>
        <li>Uploaded documents (PDF, DOC/DOCX, PPT/PPTX, TXT, Markdown, RTF, HTML, JSON), spreadsheets (XLSX/XLS/CSV), images, and vessel drawings</li>
        <li>Voice recordings you submit for transcription</li>
        <li>Web search queries initiated during conversations</li>
      </ul>

      <p><strong>Usage Data</strong></p>
      <ul>
        <li>Token usage metrics (input/output tokens) per billing period, per day, and during your trial</li>
        <li>Feature usage counts (web searches, document uploads)</li>
      </ul>

      <p><strong>Subscription Data</strong></p>
      <ul>
        <li>Subscription tier, status, and renewal information</li>
        <li>Billing-period dates and Paddle customer and subscription identifiers</li>
        <li>Payment processing is handled entirely by Paddle. We do not store credit card or payment details</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, maintain, and improve the NaviMind service</li>
        <li>Personalize AI responses based on your vessel profile and preferences</li>
        <li>Ground answers in your uploaded documents and drawings</li>
        <li>Process and manage your subscription</li>
        <li>Enforce usage limits based on your subscription tier</li>
        <li>Monitor service health and diagnose technical issues</li>
        <li>Protect against fraudulent or illegal activity</li>
      </ul>

      <h2>4. Chat Data and AI Processing</h2>
      <p>
        When you send a message, your conversation history and relevant context are processed by
        third-party AI model providers to generate responses. Important details:
      </p>
      <ul>
        <li>Conversations are sent to Anthropic solely to generate responses</li>
        <li>Uploaded documents are extracted, chunked, embedded, and stored in a vector database (OpenAI vector stores) to enable document-grounded answers; document text may also be extracted using LlamaParse, and OpenAI performs OCR, drawing analysis, and voice transcription</li>
        <li>The Memory feature allows the AI to store and recall contextual information about you across conversations — you can view and delete memories at any time</li>
        <li>Web search queries are sent through Anthropic’s web search and limited to trusted maritime sources when you use the Web Search feature</li>
        <li>You can delete your chat history, memories, and documents at any time</li>
      </ul>

      <h2>5. Third-Party Services</h2>
      <p>
        We use the following third-party services to operate NaviMind. Each service receives only
        the data necessary for its function:
      </p>
      <ul>
        <li><strong>Firebase (Google)</strong> — Authentication, database (Firestore), and file storage</li>
        <li><strong>Anthropic</strong> — AI model inference; receives conversation messages and context to generate responses, and performs web search</li>
        <li><strong>OpenAI</strong> — Document indexing and vector search, OCR, drawing analysis, and voice transcription</li>
        <li><strong>LlamaIndex (LlamaParse)</strong> — Document text extraction</li>
        <li><strong>Paddle</strong> — Payment processing and subscription management for the web application; processes billing information, invoices, and handles tax compliance</li>
      </ul>

      <h2>6. Data Sharing and Disclosure</h2>
      <p>We do not sell your personal information. We may share your information only:</p>
      <ul>
        <li>With your consent</li>
        <li>With the third-party service providers listed above, solely to operate the Service</li>
        <li>To comply with legal obligations</li>
        <li>To protect our rights and prevent fraud</li>
        <li>In connection with a merger or acquisition</li>
      </ul>

      <h2>7. Data Security</h2>
      <p>We implement appropriate technical and organizational measures to protect your data:</p>
      <ul>
        <li>Encryption in transit (TLS/SSL) for all communications</li>
        <li>Secure authentication via Firebase with Google sign-in and email verification</li>
        <li>Per-user access controls (Firebase security rules) ensuring users can only access their own data</li>
        <li>File validation and size limits for uploads</li>
      </ul>

      <h2>8. Data Retention and Deletion</h2>
      <p>We retain your personal information for as long as your account is active or as needed to provide you services.</p>
      <ul>
        <li>You can delete individual conversations, memories, and documents at any time from within the app</li>
        <li>You can export all your data (profile, conversations, memories) in JSON format via Settings</li>
        <li>When you delete your account, your personal information is anonymized and your Firebase authentication is removed</li>
        <li>If a free trial ends without a subscription, associated storage may be removed after a grace period</li>
      </ul>

      <h2>9. Your Rights</h2>
      <p>Depending on your location, you may have the right to:</p>
      <ul>
        <li>Access the personal information we hold about you</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of your data (available in-app via Settings)</li>
        <li>Export your data in a portable format (available in-app via Settings)</li>
        <li>Object to processing of your data</li>
        <li>Withdraw consent at any time</li>
      </ul>
      <p>To exercise these rights, use the in-app controls or contact us at support@navimind.io</p>

      <h2>10. Cookies and Tracking</h2>
      <p>Our web application uses essential cookies and local storage to:</p>
      <ul>
        <li>Keep you logged in</li>
        <li>Remember your preferences</li>
      </ul>
      <p>
        We do not use third-party analytics, advertising, or tracking cookies. You can control
        cookies through your browser settings, though this may affect functionality.
      </p>

      <h2>11. International Data Transfers</h2>
      <p>
        Your information may be transferred to and processed in countries other than your own,
        including through the third-party services listed in Section 5. We ensure appropriate
        safeguards are in place for such transfers, including standard contractual clauses where
        applicable.
      </p>

      <h2>12. Children’s Privacy</h2>
      <p>
        Our Service is not intended for users under 18 years of age. We do not knowingly collect
        personal information from children. If we learn we have collected such information, we will
        delete it promptly.
      </p>

      <h2>13. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of any material
        changes by posting the new policy on this page and updating the “Last updated” date. We
        encourage you to review this policy periodically.
      </p>

      <h2>14. Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy or our data practices, please contact us at{" "}
        <a href="mailto:support@navimind.io" className="text-blue-600 underline">support@navimind.io</a>.
      </p>
    </LegalShell>
  );
}
