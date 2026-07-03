"use client";

import LegalShell from "../LegalShell";

// DRAFT baseline — replace with your reviewed Terms of Service template before
// launch. This exists so pricing/checkout links don't 404 and Paddle's domain
// review has a real page to read.
export default function TermsOfService() {
  return (
    <LegalShell title="Terms of Service" updated="2026">
      <p>
        These Terms govern your use of NaviMind (“the Service”), a maritime AI assistant.
        By creating an account or using the Service, you agree to these Terms.
      </p>

      <h2>The service</h2>
      <p>
        NaviMind provides AI-assisted answers, document search, and drawing/manual analysis
        for maritime professionals. The Service is provided for informational and
        operational-support purposes and does not replace official regulations, class or
        flag-state determinations, or the professional judgement of the crew and company.
        Always verify safety-critical information against official sources.
      </p>

      <h2>Accounts</h2>
      <p>
        You are responsible for the security of your account and for all activity under it.
        Provide accurate information and keep it up to date. You must be at least 18 years old.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not use the Service unlawfully or to infringe others’ rights.</li>
        <li>Do not upload content you do not have the right to use.</li>
        <li>Do not attempt to disrupt, reverse-engineer, or abuse the Service.</li>
      </ul>

      <h2>Subscriptions &amp; payment</h2>
      <p>
        Paid plans are billed monthly through our Merchant of Record, Paddle. Pricing and
        plan limits are shown on the{" "}
        <a href="/subscription" className="text-blue-600 underline">Plans &amp; Pricing</a>{" "}
        page. Cancellation and refunds are covered by our{" "}
        <a href="/legal/refund" className="text-blue-600 underline">Refund &amp; Cancellation Policy</a>.
      </p>

      <h2>Your content</h2>
      <p>
        You retain ownership of the documents and data you upload. You grant us the limited
        rights needed to process them to provide the Service (for example, indexing for
        search and sending relevant excerpts to our AI providers to generate answers).
      </p>

      <h2>Disclaimers &amp; liability</h2>
      <p>
        The Service is provided “as is”. To the maximum extent permitted by law, NaviMind is
        not liable for indirect or consequential damages, and our total liability is limited
        to the amount you paid in the 12 months before the claim. Nothing limits liability
        that cannot be limited by law.
      </p>

      <h2>Changes &amp; termination</h2>
      <p>
        We may update the Service and these Terms; material changes will be notified. You may
        stop using the Service at any time; we may suspend accounts that breach these Terms.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:support@navimind.io" className="text-blue-600 underline">support@navimind.io</a>
      </p>
    </LegalShell>
  );
}
