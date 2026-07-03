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
        <p>
          At NaviMind we take your privacy seriously. This Privacy Policy explains how NaviMind ("we", "our", "us") collects, uses, shares, and protects your information when you use our AI-powered copilot for maritime professionals (the "Service"). By using the Service, you agree to the practices described here.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">1. Information We Collect</h3>
        <p><strong>Account information.</strong> When you sign in with Google or with email and password (managed by Firebase Authentication), we collect your name, email address, profile photo, country, email-verification status, and the authentication identifiers for your account.</p>
        <p><strong>Vessel profile &amp; preferences.</strong> To personalize answers to your ship, you may provide a vessel profile — your rank/role, vessel type, flag state, classification society, ice class, capacity, engine and machinery details, LNG containment details, ship particulars, and notes — as well as interface preferences such as language, theme, and whether past-conversation memory is used.</p>
        <p><strong>Conversations &amp; content.</strong> Chat messages, threads, topics, and folders; AI-generated memories; uploaded documents, manuals, spreadsheets, images, and vessel drawings; voice recordings you submit for transcription; and web-search queries made during a conversation.</p>
        <p><strong>Usage &amp; billing data.</strong> AI-token consumption (per billing period, per day, and during your trial), feature usage such as document uploads and web searches, your plan tier and status, billing-period dates, and your Paddle customer and subscription identifiers.</p>
        <p><strong>Technical data.</strong> IP address and device/browser information used to operate and secure the Service. Payments are handled entirely by Paddle — we never receive or store your card details.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">2. Files You Upload and How We Process Them</h3>
        <p>You can upload the following file types: PDF, DOC/DOCX, PPT/PPTX, TXT, Markdown, RTF, HTML, JSON, spreadsheets (XLSX/XLS/CSV), images (JPG/PNG/TIFF), and vessel drawings and plans. We process them as follows:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Files are stored in your private space in Firebase Storage, subject to a per-file size limit.</li>
          <li>We extract the text (scanned PDFs and images are read using OCR), split it into chunks, create embeddings, and store them in a private OpenAI vector store so your documents can be searched.</li>
          <li>When you ask a question, the most relevant excerpts are retrieved and sent to Anthropic to generate an answer grounded in your documents, with citations back to the source file.</li>
          <li>Vessel drawings are converted to page images and analyzed to build a searchable index; relevant pages are sent to the AI's vision model when you ask about a drawing.</li>
          <li>Voice input is sent to OpenAI to be transcribed into text.</li>
        </ul>
        <p>You can delete any uploaded file, and its stored content, at any time.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">3. AI Processing and Providers</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Anthropic</strong> generates the answers; it receives your questions and the relevant excerpts and context.</li>
          <li><strong>OpenAI</strong> indexes your documents for search, performs OCR, analyzes drawings, and transcribes voice input.</li>
          <li><strong>LlamaIndex (LlamaParse)</strong> extracts text from complex documents.</li>
          <li><strong>Web search:</strong> for questions about current regulations, NaviMind searches the web through Anthropic, limited to trusted maritime sources such as the IMO, flag registries, classification societies, port-state-control regimes, and industry bodies.</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">4. Memory</h3>
        <p>NaviMind builds a memory of key facts, decisions, and vessel details discussed in each topic so answers stay consistent across conversations. Memory is stored with your account and used only to help you. You can turn off memory referencing and clear stored memory at any time.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">5. How We Use Your Information</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Generate AI answers and analyze your documents and drawings</li>
          <li>Index your content so it can be searched to ground responses</li>
          <li>Personalize responses based on your vessel profile and preferences</li>
          <li>Authenticate you and secure your account</li>
          <li>Meter AI-token usage, enforce plan limits, and process your subscription</li>
          <li>Diagnose technical issues and protect against fraud and abuse</li>
          <li>Comply with legal obligations (including GDPR)</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">6. Third-Party Services</h3>
        <p>We use the following providers to run NaviMind, each receiving only the data needed for its function:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Google Firebase</strong> — authentication, database (Firestore), and file storage</li>
          <li><strong>Anthropic</strong> — AI answer generation and web search</li>
          <li><strong>OpenAI</strong> — document indexing and search, OCR, drawing analysis, and voice transcription</li>
          <li><strong>LlamaIndex (LlamaParse)</strong> — document text extraction</li>
          <li><strong>Paddle (Paddle.com Market Ltd)</strong> — payment processing and subscription management as our Merchant of Record</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">7. Data Sharing and Disclosure</h3>
        <p>We do not sell your personal information. We share it only with the providers listed above to operate the Service, to comply with legal obligations, to protect our rights and prevent fraud, or in connection with a merger or acquisition.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">8. Where Your Data Is Stored</h3>
        <p>Your content is stored in Firebase (file bytes in Storage; account data, vessel profile, chat history, and memories in Firestore) and, for searchable content, in OpenAI vector stores. Some providers process data in other countries, including the United States, under their own safeguards.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">9. Data Retention and Deletion</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>We keep your content while your account is active.</li>
          <li>You can delete individual conversations, memories, and documents from within the app at any time.</li>
          <li>You can export all your data (profile, conversations, memories) as JSON from within the app.</li>
          <li>When you delete your account, your personal information is anonymized or removed and your authentication credentials are removed.</li>
          <li>If a free trial ends without a subscription, associated storage may be removed after a grace period.</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">10. Your Rights</h3>
        <p>Depending on your location, you may have the right to access, correct, delete, export, or restrict processing of your personal data, to object to processing, and to withdraw consent. You can use the in-app controls or contact us at <a href="mailto:support@navimind.io" className="text-blue-500 hover:underline">support@navimind.io</a> to exercise these rights.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">11. Security</h3>
        <p>We protect your data with encryption in transit (TLS/SSL), authentication via Firebase with email verification, per-user access controls that ensure you can only access your own data, and file-type and file-size limits on uploads. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">12. Cookies</h3>
        <p>We use only essential cookies and local storage to keep you signed in and remember your preferences. We do not use third-party analytics, advertising, or tracking cookies.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">13. International Data Transfers</h3>
        <p>Your information may be transferred to and processed in countries other than your own, including the United States, through the providers listed above, which apply appropriate safeguards for such transfers.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">14. Children's Privacy</h3>
        <p>The Service is not intended for users under 18. We do not knowingly collect data from children, and we will delete such data promptly if we learn we have collected it.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">15. Changes to This Policy</h3>
        <p>We may update this Policy from time to time. We will post the updated Policy here and update the "Last updated" date. Continued use of the Service after changes constitutes acceptance of the updated Policy.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">16. Contact</h3>
        <p>NaviMind — <a href="mailto:support@navimind.io" className="text-blue-500 hover:underline">support@navimind.io</a> · navimind.io</p>
      </div>
    </div>
  );
}
