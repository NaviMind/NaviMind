"use client";

import LegalShell from "../LegalShell";

// Public Terms of Service for NaviMind. Written to reflect what the app actually
// does (maritime AI copilot, Google/email sign-in, Anthropic + OpenAI + LlamaParse
// processing, Firebase storage, Paddle billing). This is the page Google's OAuth
// brand review and Paddle's domain review read, and what users see at /legal/terms
// (also reachable at /terms via a redirect in next.config.js).
export default function TermsOfService() {
  return (
    <LegalShell title="Terms of Service" updated="July 2026">
      <h2>1. Acceptance of terms</h2>
      <p>
        By accessing or using NaviMind (“the Service”), you agree to be bound by these
        Terms of Service. If you do not agree to these terms, please do not use the
        Service. These Terms are between you and NaviMind (“Company”, “we”, “our”, “us”).
      </p>

      <h2>2. Description of the Service</h2>
      <p>
        NaviMind is an AI-powered copilot built for maritime professionals — ship
        masters, senior officers, engineers, and shore-based staff. The Service provides
        AI-assisted answers grounded in maritime regulations and in your own uploaded
        documents, search over your manuals and drawings, analysis of vessel drawings and
        plans, voice input, and personalization based on your vessel profile. NaviMind is
        a responsive web application.
      </p>
      <p>
        The Service uses third-party AI models — including models from Anthropic and
        OpenAI — to generate responses, index documents, and analyze drawings. When a
        question requires current regulatory information, the Service may perform a web
        search limited to trusted maritime sources.
      </p>
      <p>
        <strong>
          Information provided by NaviMind is for general informational and
          operational-support purposes only. It does not replace official regulations,
          class-society or flag-state determinations, manufacturer documentation, or the
          professional judgement of the crew and company. Always verify safety-critical
          information against official sources before acting on it.
        </strong>
      </p>

      <h2>3. Eligibility &amp; accounts</h2>
      <p>
        You must be at least 18 years old to use the Service. To access NaviMind you sign
        in using <strong>Google Sign-In</strong> or <strong>email and password</strong>
        (email verification is required before first login). You are responsible for:
      </p>
      <ul>
        <li>all activity that occurs under your account;</li>
        <li>maintaining the security of your sign-in credentials;</li>
        <li>notifying us promptly of any unauthorized use; and</li>
        <li>providing accurate and complete profile information.</li>
      </ul>
      <p>
        You may delete your account at any time from within the app. Upon deletion, your
        content and personal data are removed as described in our{" "}
        <a href="/legal/privacy" className="text-blue-600 underline">Privacy Policy</a>.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the Service for any unlawful purpose or to infringe others’ rights;</li>
        <li>attempt to gain unauthorized access to the Service or its systems;</li>
        <li>interfere with, disrupt, or overload the Service;</li>
        <li>share or resell your account without our permission;</li>
        <li>upload malware or content you do not have the right to use;</li>
        <li>reverse-engineer or attempt to extract the source code; or</li>
        <li>
          circumvent usage limits, token allowances, or rate restrictions, or use
          automated tools to interact with the Service without authorization.
        </li>
      </ul>

      <h2>5. Your content and documents</h2>
      <p>
        You retain ownership of all content you submit — including chat messages, uploaded
        documents, vessel drawings, manuals, and your vessel profile. By uploading content,
        you grant NaviMind a limited license to process, extract, chunk, index, embed, and
        store it, and to send relevant excerpts to our AI providers, solely to provide
        document-grounded and drawing-grounded AI responses to you.
      </p>
      <p>
        You are responsible for ensuring you have the right to upload any content you
        submit. Supported file types include PDF, DOC/DOCX, PPT/PPTX, TXT, Markdown, RTF,
        HTML, JSON, and spreadsheets (XLSX/XLS/CSV), as well as images and vessel drawings,
        subject to file-size limits based on your plan.
      </p>

      <h2>6. Memory feature</h2>
      <p>
        NaviMind’s memory feature lets the AI store and recall contextual information across
        conversations within a topic — for example your vessel type, role, and details or
        decisions discussed. You can control this: memory can be excluded from answers via a
        setting, and stored memory can be cleared. Deleting your account removes stored
        memory as described in the Privacy Policy.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        The Service and its original content, features, and functionality are owned by
        NaviMind and protected by copyright, trademark, and other laws. AI-generated
        responses are provided for your use and are not treated as proprietary content of
        NaviMind.
      </p>

      <h2>8. Disclaimer of warranties</h2>
      <p>
        THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND.
        We do not guarantee that the Service will meet your specific requirements, be
        uninterrupted or error-free, or that AI-generated responses, web-search results, or
        document analysis will be accurate, complete, or current. Always verify critical
        information with official documentation and qualified professionals before making
        decisions that affect safety, vessel operations, or regulatory compliance.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, NaviMind and its directors, employees, and
        agents shall not be liable for any indirect, incidental, special, consequential, or
        punitive damages arising out of your use of the Service, and our total liability is
        limited to the amount you paid to us in the 12 months before the claim. Nothing in
        these Terms limits liability that cannot be limited by law.
      </p>

      <h2>10. Subscriptions and payments</h2>
      <p>
        New accounts include a free trial with a capped AI-token allowance; no payment is
        taken to start the trial. Paid plans are billed monthly in advance through our
        Merchant of Record, <strong>Paddle.com Market Ltd (“Paddle”)</strong>, which appears
        as the seller on your receipt and handles billing, taxes, and refunds on our behalf.
      </p>
      <p>
        Each plan includes a monthly allowance of AI tokens and document storage shown on the{" "}
        <a href="/subscription" className="text-blue-600 underline">Plans &amp; Pricing</a>{" "}
        page. Unused monthly tokens do not roll over. By subscribing you agree to pay the
        applicable fees and to automatic monthly renewal unless cancelled before the end of
        the current period. Cancellation and refunds are governed by our{" "}
        <a href="/legal/refund" className="text-blue-600 underline">Refund &amp; Cancellation Policy</a>.
      </p>

      <h2>11. Data export and portability</h2>
      <p>
        You can export your data at any time from within the app. The export includes your
        profile information, conversation history, and memories in JSON format.
      </p>

      <h2>12. Termination</h2>
      <p>
        We may suspend or terminate your access to the Service if you breach these Terms or
        misuse the Service. You may terminate your account at any time by deleting it in the
        app.
      </p>

      <h2>13. Changes to these Terms</h2>
      <p>
        We may modify these Terms from time to time. We will notify users of material
        changes by posting the updated Terms on this page and updating the “Last updated”
        date. Continued use of the Service after changes constitutes acceptance of the
        revised Terms.
      </p>

      <h2>14. Governing law</h2>
      <p>
        These Terms are governed by and interpreted in accordance with the laws of the
        European Union, unless otherwise required by the mandatory law of your country of
        residence.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions about these Terms?{" "}
        <a href="mailto:support@navimind.io" className="text-blue-600 underline">support@navimind.io</a>
      </p>
    </LegalShell>
  );
}
