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
        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">1. Acceptance of Terms</h3>
        <p>
          By accessing or using NaviMind ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">2. Description of Service</h3>
        <p>
          NaviMind is an AI-powered copilot for maritime professionals, including ship masters, senior officers, marine engineers, and watchkeeping officers. The Service provides AI-assisted answers grounded in maritime regulations and in your own documents, document and drawing search, vessel-drawing analysis, voice input, and personalization based on your vessel profile. NaviMind is available on the web.
        </p>
        <p>
          The Service uses third-party AI models to generate responses. The information provided by NaviMind is for general informational purposes only and should not replace professional judgment, official regulations or technical documentation, or the determinations of classification societies and flag states.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">3. User Accounts</h3>
        <p>To access the Service, you must sign in using Google Sign-In or email and password. You are responsible for:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>All activities that occur under your account</li>
          <li>Maintaining the security of your sign-in credentials</li>
          <li>Notifying us immediately of any unauthorized use</li>
          <li>Providing accurate and complete profile information</li>
        </ul>
        <p>You may delete your account at any time through Settings. Upon deletion, your personal information will be anonymized and your authentication credentials removed.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">4. Acceptable Use</h3>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
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

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">5. Content and Documents</h3>
        <p>
          You retain ownership of all content you submit, including messages and uploaded documents. By uploading documents, you grant NaviMind a limited license to process, extract, chunk, embed, and store your documents solely to provide document-grounded AI responses to you.
        </p>
        <p>
          You are responsible for ensuring you have the right to upload any documents you submit. Supported file types include PDF, DOC/DOCX, PPT/PPTX, TXT, Markdown, RTF, HTML, and JSON, spreadsheets (XLSX/XLS/CSV), images, and vessel drawings, subject to size limits based on your subscription tier.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">6. Memory Feature</h3>
        <p>
          NaviMind's Memory feature allows the AI to automatically store and recall contextual information about you across conversations within a topic. This includes details such as your vessel type, role, preferences, and topics discussed. You can clear stored memory at any time, and you can disable memory referencing in Settings.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">7. Intellectual Property</h3>
        <p>
          The Service and its original content, features, and functionality are owned by NaviMind and are protected by international copyright, trademark, and other intellectual property laws. AI-generated responses are provided for your personal use and should not be treated as proprietary content of NaviMind.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">8. Disclaimer of Warranties</h3>
        <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. We do not guarantee that:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>The Service will meet your specific requirements</li>
          <li>The Service will be uninterrupted or error-free</li>
          <li>AI-generated responses will be accurate, complete, or current</li>
          <li>Web search results or document analysis will be comprehensive</li>
          <li>Any errors in the Service will be corrected</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">9. Limitation of Liability</h3>
        <p>
          In no event shall NaviMind, its directors, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Service.
        </p>
        <p>
          AI-generated content is for informational purposes only. Always verify critical information with official documentation and qualified professionals before making decisions that affect safety, vessel operations, or regulatory compliance.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">10. Subscription and Payments</h3>
        <p>NaviMind offers a free trial and paid subscription tiers with monthly AI-token allowances and document storage, shown on the Plans &amp; Pricing page. By subscribing, you agree to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Pay all applicable fees for your chosen plan</li>
          <li>Automatic renewal unless cancelled before the end of the current billing period</li>
          <li>Usage limits that reset each billing period</li>
        </ul>
        <p>Subscriptions are processed through Paddle, our Merchant of Record, which handles billing, taxes, and refunds. Refunds are handled according to our Refund &amp; Cancellation Policy.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">11. Data Export and Portability</h3>
        <p>
          You can export your data at any time through Settings. The export includes your profile information, conversation history, and memories in JSON format.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">12. Termination</h3>
        <p>
          We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including breach of these Terms. You may terminate your account at any time by deleting it through Settings.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">13. Changes to Terms</h3>
        <p>
          We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page and updating the "Last updated" date. Continued use of the Service after changes constitutes acceptance of the revised Terms.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">14. Contact Us</h3>
        <p>If you have any questions about these Terms, please contact us at: <a href="mailto:support@navimind.io" className="text-blue-500 hover:underline">support@navimind.io</a></p>
      </div>
    </div>
  );
}
