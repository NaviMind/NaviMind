"use client";

const IcBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export default function PrivacyPolicyScreen({ onBack }) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-1 px-3 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-white/70 mr-1" aria-label="Back">
          <IcBack />
        </button>
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Privacy Policy</h3>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-none mt-0.5">Last updated: July 2026</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-6 py-5 text-[13.5px] text-gray-700 dark:text-gray-300 leading-relaxed space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">1. Introduction</h3>
        <p>
          At NaviMind, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered copilot for maritime professionals, including ship masters, senior officers, marine engineers, and watchkeeping officers.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">2. Information We Collect</h3>
        <p className="font-medium text-gray-900 dark:text-white">Account Information</p>
        <p>When you create an account via Google Sign-In or email and password, we collect:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Name and email address</li>
          <li>Profile photo URL (if provided by your sign-in provider)</li>
          <li>Authentication identifiers managed by Firebase Authentication</li>
        </ul>
        <p className="font-medium text-gray-900 dark:text-white">Profile &amp; Personalization Data</p>
        <p>To personalize your experience, you may optionally provide:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Your vessel profile — rank/role, vessel type, flag state, classification society, ice class, capacity, engine and machinery details, LNG containment details, ship particulars, and notes</li>
          <li>Interface preferences (language and theme)</li>
          <li>Memory and chat-history referencing preferences</li>
        </ul>
        <p className="font-medium text-gray-900 dark:text-white">Conversation &amp; Content Data</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Chat messages and conversation threads</li>
          <li>AI-generated memories (contextual information the assistant remembers about you)</li>
          <li>Uploaded documents (PDF, DOC/DOCX, PPT/PPTX, TXT, Markdown, RTF, HTML, JSON), spreadsheets (XLSX/XLS/CSV), images, and vessel drawings</li>
          <li>Voice recordings you submit for transcription</li>
          <li>Web search queries initiated during conversations</li>
        </ul>
        <p className="font-medium text-gray-900 dark:text-white">Usage Data</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Token usage metrics (input/output tokens) per billing period, per day, and during your trial</li>
          <li>Feature usage counts (web searches, document uploads)</li>
        </ul>
        <p className="font-medium text-gray-900 dark:text-white">Subscription Data</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Subscription tier, status, and renewal information</li>
          <li>Billing-period dates and Paddle customer and subscription identifiers</li>
          <li>Payment processing is handled entirely by Paddle. We do not store credit card or payment details</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">3. How We Use Your Information</h3>
        <p>We use the information we collect to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide, maintain, and improve the NaviMind service</li>
          <li>Personalize AI responses based on your vessel profile and preferences</li>
          <li>Ground answers in your uploaded documents and drawings</li>
          <li>Process and manage your subscription</li>
          <li>Enforce usage limits based on your subscription tier</li>
          <li>Monitor service health and diagnose technical issues</li>
          <li>Protect against fraudulent or illegal activity</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">4. Chat Data and AI Processing</h3>
        <p>When you send a message, your conversation history and relevant context are processed by third-party AI model providers to generate responses. Important details:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Conversations are sent to Anthropic solely to generate responses</li>
          <li>Uploaded documents are extracted, chunked, embedded, and stored in a vector database (OpenAI vector stores) to enable document-grounded answers; document text may also be extracted using LlamaParse, and OpenAI performs OCR, drawing analysis, and voice transcription</li>
          <li>The Memory feature allows the AI to store and recall contextual information about you across conversations — you can view and delete memories at any time</li>
          <li>Web search queries are sent through Anthropic's web search and limited to trusted maritime sources when you use the Web Search feature</li>
          <li>You can delete your chat history, memories, and documents at any time</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">5. Third-Party Services</h3>
        <p>We use the following third-party services to operate NaviMind. Each service receives only the data necessary for its function:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Firebase (Google)</strong> — Authentication, database (Firestore), and file storage</li>
          <li><strong>Anthropic</strong> — AI model inference; receives conversation messages and context to generate responses, and performs web search</li>
          <li><strong>OpenAI</strong> — Document indexing and vector search, OCR, drawing analysis, and voice transcription</li>
          <li><strong>LlamaIndex (LlamaParse)</strong> — Document text extraction</li>
          <li><strong>Paddle</strong> — Payment processing and subscription management for the web application; processes billing information, invoices, and handles tax compliance</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">6. Data Sharing and Disclosure</h3>
        <p>We do not sell your personal information. We may share your information only:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>With your consent</li>
          <li>With the third-party service providers listed above, solely to operate the Service</li>
          <li>To comply with legal obligations</li>
          <li>To protect our rights and prevent fraud</li>
          <li>In connection with a merger or acquisition</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">7. Data Security</h3>
        <p>We implement appropriate technical and organizational measures to protect your data:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Encryption in transit (TLS/SSL) for all communications</li>
          <li>Secure authentication via Firebase with Google sign-in and email verification</li>
          <li>Per-user access controls (Firebase security rules) ensuring users can only access their own data</li>
          <li>File validation and size limits for uploads</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">8. Data Retention and Deletion</h3>
        <p>We retain your personal information for as long as your account is active or as needed to provide you services.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You can delete individual conversations, memories, and documents at any time from within the app</li>
          <li>You can export all your data (profile, conversations, memories) in JSON format via Settings</li>
          <li>When you delete your account, your personal information is anonymized and your Firebase authentication is removed</li>
          <li>If a free trial ends without a subscription, associated storage may be removed after a grace period</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">9. Your Rights</h3>
        <p>Depending on your location, you may have the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data (available in-app via Settings)</li>
          <li>Export your data in a portable format (available in-app via Settings)</li>
          <li>Object to processing of your data</li>
          <li>Withdraw consent at any time</li>
        </ul>
        <p>To exercise these rights, use the in-app controls or contact us at <a href="mailto:support@navimind.io" className="text-blue-500 hover:underline">support@navimind.io</a></p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">10. Cookies and Tracking</h3>
        <p>Our web application uses essential cookies and local storage to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Keep you logged in</li>
          <li>Remember your preferences</li>
        </ul>
        <p>We do not use third-party analytics, advertising, or tracking cookies. You can control cookies through your browser settings, though this may affect functionality.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">11. International Data Transfers</h3>
        <p>Your information may be transferred to and processed in countries other than your own, including through the third-party services listed in Section 5. We ensure appropriate safeguards are in place for such transfers, including standard contractual clauses where applicable.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">12. Children's Privacy</h3>
        <p>Our Service is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we learn we have collected such information, we will delete it promptly.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">13. Changes to This Policy</h3>
        <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">14. Contact Us</h3>
        <p>If you have questions about this Privacy Policy or our data practices, please contact us at <a href="mailto:support@navimind.io" className="text-blue-500 hover:underline">support@navimind.io</a>.</p>
      </div>
    </div>
  );
}
