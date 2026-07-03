"use client";

const IcBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export default function TermsScreen({ onBack }) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-1 px-3 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-white/70 mr-1" aria-label="Back">
          <IcBack />
        </button>
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Terms of Service</h3>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-none mt-0.5">Last updated: July 2026</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-6 py-5 text-[13.5px] text-gray-700 dark:text-gray-300 leading-relaxed space-y-4">
        <p>
          These Terms of Service ("Terms") govern your use of NaviMind (the "Service"), provided by NaviMind ("we", "our", "us"). By creating an account or using the Service, you agree to these Terms. If you do not agree, please do not use the Service.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">1. The Service</h3>
        <p>
          NaviMind is an AI-powered copilot for maritime professionals — ship masters, senior officers, engineers, and shore-based staff. It provides AI-assisted answers grounded in maritime regulations and in your own uploaded documents, search over your manuals and drawings, analysis of vessel drawings and plans, voice input, and personalization based on your vessel profile. NaviMind is a web application and uses third-party AI models, including Anthropic and OpenAI, to generate responses.
        </p>
        <p>
          <strong>
            Information provided by NaviMind is for general informational and operational-support purposes only. It does not replace official regulations, class-society or flag-state determinations, manufacturer documentation, or the professional judgement of the crew and company. Always verify safety-critical information against official sources before acting on it.
          </strong>
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">2. Eligibility &amp; Accounts</h3>
        <p>You must be at least 18 years old to use the Service. You sign in using Google or email and password, and email verification is required before your first login. You are responsible for:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>all activity that occurs under your account;</li>
          <li>maintaining the security of your sign-in credentials;</li>
          <li>notifying us promptly of any unauthorized use; and</li>
          <li>providing accurate and up-to-date profile information.</li>
        </ul>
        <p>You may delete your account at any time from within the app.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">3. Acceptable Use</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Do not use the Service for any unlawful purpose or to infringe others' rights.</li>
          <li>Do not attempt to gain unauthorized access to, disrupt, or overload the Service.</li>
          <li>Do not share or resell your account without our permission.</li>
          <li>Do not upload malware or content you do not have the right to use.</li>
          <li>Do not reverse-engineer the Service or circumvent usage limits, token allowances, or rate restrictions.</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">4. Your Content &amp; Documents</h3>
        <p>
          You retain ownership of everything you submit — chat messages, uploaded documents, spreadsheets, images, vessel drawings, and your vessel profile. Supported upload types include PDF, DOC/DOCX, PPT/PPTX, TXT, Markdown, RTF, HTML, JSON, spreadsheets (XLSX/XLS/CSV), images, and vessel drawings. By uploading content you grant us a limited license to store, extract, chunk, index, embed, and analyze it, and to send relevant excerpts to our AI providers, solely to provide document-grounded and drawing-grounded answers to you. You must have the right to upload any content you submit.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">5. Memory</h3>
        <p>
          NaviMind's memory feature stores and recalls contextual information — such as your vessel details and decisions discussed — across conversations within a topic. You can exclude memory from answers via a setting and clear stored memory at any time.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">6. Subscriptions &amp; Payments</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>New accounts include a free trial with a capped AI-token allowance; no payment is taken to start it.</li>
          <li>Paid plans are billed monthly in advance through our Merchant of Record, Paddle, which appears as the seller on your receipt and handles billing, taxes, and refunds.</li>
          <li>Each plan includes a monthly allowance of AI tokens and document storage; unused monthly tokens do not roll over.</li>
          <li>Subscriptions renew automatically each month unless cancelled before the end of the current period.</li>
          <li>Cancellation and refunds are governed by our Refund &amp; Cancellation Policy.</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">7. Intellectual Property</h3>
        <p>
          The Service and its original content, features, and functionality are owned by NaviMind and protected by copyright, trademark, and other laws. AI-generated responses are provided for your use and are not treated as proprietary content of NaviMind.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">8. Disclaimer of Warranties</h3>
        <p>
          The Service is provided "as is" and "as available" without warranties of any kind. We do not guarantee that the Service will be uninterrupted or error-free, or that AI-generated responses, web-search results, or document analysis will be accurate, complete, or current. Always verify critical information with official documentation and qualified professionals before making decisions that affect safety, vessel operations, or regulatory compliance.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">9. Limitation of Liability</h3>
        <p>
          To the maximum extent permitted by law, NaviMind is not liable for any indirect, incidental, special, or consequential damages, and our total liability is limited to the amount you paid us in the 12 months before the claim. Nothing in these Terms limits liability that cannot be limited by law.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">10. Data Export</h3>
        <p>
          You can export your data — profile, conversation history, and memories — as a JSON file at any time from within the app.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">11. Termination</h3>
        <p>
          We may suspend or terminate your access if you breach these Terms or misuse the Service. You may terminate your account at any time by deleting it in the app.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">12. Changes to Terms</h3>
        <p>
          We may update these Terms from time to time. Material changes will be posted here with a new "Last updated" date. Continued use of the Service after changes constitutes acceptance of the revised Terms.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">13. Governing Law</h3>
        <p>
          These Terms are governed by and interpreted in accordance with the laws of the European Union.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">14. Contact</h3>
        <p>NaviMind — <a href="mailto:support@navimind.io" className="text-blue-500 hover:underline">support@navimind.io</a> · navimind.io</p>
      </div>
    </div>
  );
}
