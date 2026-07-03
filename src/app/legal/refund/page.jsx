"use client";

import LegalShell from "../LegalShell";

// DRAFT — standard SaaS refund/cancellation terms under Paddle (Merchant of
// Record). Have this reviewed before going live; adjust the money-back window to
// your preference.
export default function RefundPolicy() {
  return (
    <LegalShell title="Refund &amp; Cancellation Policy" updated="2026">
      <p>
        NaviMind is a subscription software service. Payments are processed by our
        Merchant of Record, <strong>Paddle.com Market Ltd (“Paddle”)</strong>, which
        appears as the seller on your receipt and handles billing, taxes, and refunds
        on our behalf.
      </p>

      <h2>Free trial</h2>
      <p>
        New accounts include a 21-day free trial with a capped AI-token allowance. No
        payment is taken to start the trial. If you do not subscribe, the trial simply
        ends and no charge is ever made.
      </p>

      <h2>Subscriptions &amp; billing</h2>
      <p>
        Paid plans are billed monthly in advance through Paddle. Each billing period
        includes a monthly allowance of AI tokens and storage as shown on the{" "}
        <a href="/subscription" className="text-blue-600 underline">Plans &amp; Pricing</a>{" "}
        page. Unused monthly tokens do not roll over to the next period.
      </p>

      <h2>Cancellation</h2>
      <p>
        You can cancel at any time from your account settings or by emailing{" "}
        <a href="mailto:support@navimind.io" className="text-blue-600 underline">support@navimind.io</a>.
        When you cancel, your plan stays active until the end of the current paid period,
        and you are not charged again. You will not be billed for periods after cancellation.
      </p>

      <h2>Refunds</h2>
      <ul>
        <li>
          <strong>14-day money-back guarantee.</strong> If you are not satisfied, contact
          us within 14 days of your <em>first</em> payment on a new subscription and we
          will refund that payment in full.
        </li>
        <li>
          After that period, monthly charges are non-refundable except where a refund is
          required by applicable law (for example, mandatory consumer-protection rights in
          your country).
        </li>
        <li>
          Duplicate charges, obvious billing errors, or charges you did not authorise are
          always refunded.
        </li>
      </ul>

      <h2>How to request a refund</h2>
      <p>
        Email{" "}
        <a href="mailto:support@navimind.io" className="text-blue-600 underline">support@navimind.io</a>{" "}
        with the email address on your account and the approximate date of the charge.
        Approved refunds are issued by Paddle to your original payment method, typically
        within 5–10 business days depending on your bank.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about billing or this policy? Reach us at{" "}
        <a href="mailto:support@navimind.io" className="text-blue-600 underline">support@navimind.io</a>.
      </p>
    </LegalShell>
  );
}
