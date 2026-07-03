"use client";

import LegalShell from "../LegalShell";

// Public Terms of Service for NaviMind. Follows the standard SaaS structure and
// reflects what the app actually does: maritime AI copilot, Google/email
// sign-in, Anthropic + OpenAI + LlamaParse processing, Firebase storage, Paddle
// billing. Served at /legal/terms (also reachable at /terms via a redirect).
export default function TermsOfService() {
  return (
    <LegalShell title="Terms of Service" updated="July 2026">
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using NaviMind (“the Service”), you agree to be bound by these Terms of
        Service. If you do not agree to these terms, please do not use the Service.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        NaviMind is an AI-powered copilot for maritime professionals, including ship masters,
        senior officers, marine engineers, and watchkeeping officers. The Service provides
        AI-assisted answers grounded in maritime regulations and in your own documents, document
        and drawing search, vessel-drawing analysis, voice input, and personalization based on your
        vessel profile. NaviMind is available on the web.
      </p>
      <p>
        The Service uses third-party AI models to generate responses. The information provided by
        NaviMind is for general informational purposes only and should not replace professional
        judgment, official regulations or technical documentation, or the determinations of
        classification societies and flag states.
      </p>

      <h2>3. User Accounts</h2>
      <p>To access the Service, you must sign in using Google Sign-In or email and password. You are responsible for:</p>
      <ul>
        <li>All activities that occur under your account</li>
        <li>Maintaining the security of your sign-in credentials</li>
        <li>Notifying us immediately of any unauthorized use</li>
        <li>Providing accurate and complete profile information</li>
      </ul>
      <p>
        You may delete your account at any time through Settings. Upon deletion, your personal
        information will be anonymized and your authentication credentials removed.
      </p>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any unlawful purpose</li>
        <li>Attempt to gain unauthorized access to the Service or its systems</li>
        <li>Interfere with or disrupt the Service</li>
        <li>Share your account with others</li>
        <li>Use the Service to distribute malware or harmful content</li>
        <li>Reverse engineer or attempt to extract the source code</li>
        <li>Upload documents containing malicious content or that you do not have rights to use</li>
        <li>Attempt to circumvent usage limits or rate restrictions</li>
        <li>Use automated tools or scripts to interact with the Service without authorization</li>
      </ul>

      <h2>5. Content and Documents</h2>
      <p>
        You retain ownership of all content you submit, including messages and uploaded documents.
        By uploading documents, you grant NaviMind a limited license to process, extract, chunk,
        embed, and store your documents solely to provide document-grounded AI responses to you.
      </p>
      <p>
        You are responsible for ensuring you have the right to upload any documents you submit.
        Supported file types include PDF, DOC/DOCX, PPT/PPTX, TXT, Markdown, RTF, HTML, and JSON,
        spreadsheets (XLSX/XLS/CSV), images, and vessel drawings, subject to size limits based on
        your subscription tier.
      </p>

      <h2>6. Memory Feature</h2>
      <p>
        NaviMind’s Memory feature allows the AI to automatically store and recall contextual
        information about you across conversations within a topic. This includes details such as
        your vessel type, role, preferences, and topics discussed. You can clear stored memory at
        any time, and you can disable memory referencing in Settings.
      </p>

      <h2>7. Intellectual Property</h2>
      <p>
        The Service and its original content, features, and functionality are owned by NaviMind and
        are protected by international copyright, trademark, and other intellectual property laws.
        AI-generated responses are provided for your personal use and should not be treated as
        proprietary content of NaviMind.
      </p>

      <h2>8. Disclaimer of Warranties</h2>
      <p>THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND. We do not guarantee that:</p>
      <ul>
        <li>The Service will meet your specific requirements</li>
        <li>The Service will be uninterrupted or error-free</li>
        <li>AI-generated responses will be accurate, complete, or current</li>
        <li>Web search results or document analysis will be comprehensive</li>
        <li>Any errors in the Service will be corrected</li>
      </ul>

      <h2>9. Limitation of Liability</h2>
      <p>
        In no event shall NaviMind, its directors, employees, or agents be liable for any indirect,
        incidental, special, consequential, or punitive damages arising out of your use of the
        Service.
      </p>
      <p>
        AI-generated content is for informational purposes only. Always verify critical information
        with official documentation and qualified professionals before making decisions that affect
        safety, vessel operations, or regulatory compliance.
      </p>

      <h2>10. Subscription and Payments</h2>
      <p>
        NaviMind offers a free trial and paid subscription tiers with monthly AI-token allowances
        and document storage, shown on the{" "}
        <a href="/subscription" className="text-blue-600 underline">Plans &amp; Pricing</a> page.
        By subscribing, you agree to:
      </p>
      <ul>
        <li>Pay all applicable fees for your chosen plan</li>
        <li>Automatic renewal unless cancelled before the end of the current billing period</li>
        <li>Usage limits that reset each billing period</li>
      </ul>
      <p>
        Subscriptions are processed through Paddle, our Merchant of Record, which handles billing,
        taxes, and refunds. Refunds are handled according to our{" "}
        <a href="/legal/refund" className="text-blue-600 underline">Refund &amp; Cancellation Policy</a>.
      </p>

      <h2>11. Data Export and Portability</h2>
      <p>
        You can export your data at any time through Settings. The export includes your profile
        information, conversation history, and memories in JSON format.
      </p>

      <h2>12. Termination</h2>
      <p>
        We may terminate or suspend your account and access to the Service immediately, without
        prior notice, for any reason, including breach of these Terms. You may terminate your
        account at any time by deleting it through Settings.
      </p>

      <h2>13. Changes to Terms</h2>
      <p>
        We reserve the right to modify these Terms at any time. We will notify users of any material
        changes by posting the new Terms on this page and updating the “Last updated” date.
        Continued use of the Service after changes constitutes acceptance of the revised Terms.
      </p>

      <h2>14. Contact Us</h2>
      <p>
        If you have any questions about these Terms, please contact us at:{" "}
        <a href="mailto:support@navimind.io" className="text-blue-600 underline">support@navimind.io</a>
      </p>
    </LegalShell>
  );
}
