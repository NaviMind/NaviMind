"use client";

import LegalShell from "../LegalShell";

// DRAFT baseline — replace with your reviewed Privacy Policy template before
// launch. Present so links don't 404 and Paddle's domain review has a real page.
export default function PrivacyPolicy() {
  return (
    <LegalShell title="Privacy Policy" updated="2026">
      <p>
        This Policy explains what data NaviMind collects and how we use it. By using the
        Service you agree to this Policy.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data</strong> — name, email, and authentication details.</li>
        <li><strong>Content you provide</strong> — chats, documents, drawings, manuals, and your vessel profile.</li>
        <li><strong>Usage data</strong> — feature usage and AI-token consumption for metering and billing.</li>
        <li><strong>Payment data</strong> — handled by Paddle; we do not store your card details.</li>
      </ul>

      <h2>How we use it</h2>
      <p>
        To provide and improve the Service: generating answers, indexing your documents for
        search, personalising responses to your vessel, metering usage, and processing
        subscriptions. We do not sell your personal data.
      </p>

      <h2>Sub-processors</h2>
      <p>
        We rely on trusted providers to run the Service, including cloud hosting and database
        (Google Firebase), AI processing (Anthropic and OpenAI) to generate answers and index
        documents, and payments (Paddle). These providers process data only to deliver their
        part of the Service.
      </p>

      <h2>Retention</h2>
      <p>
        We keep your content while your account is active. If a trial ends without a
        subscription, associated storage may be removed after a grace period. You can delete
        your chats and data from within the app, or request account deletion by email.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct, export, or delete
        your personal data. Contact us to exercise them.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:support@navimind.io" className="text-blue-600 underline">support@navimind.io</a>
      </p>
    </LegalShell>
  );
}
