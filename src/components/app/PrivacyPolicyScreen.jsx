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
          This Privacy Policy explains how NaviMind ("Company", "we", "our", "us") collects, uses, and protects your information when you use our website, applications, and services (the "Service").
        </p>
        <p>
          By using the Service, you agree to the practices described in this Policy.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">1. Information We Collect</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account Information: name, email, profile photo, country, and sign-in method (Google or email/password).</li>
          <li>Content You Provide: chats, uploaded documents and drawings, your vessel profile, and memories generated from your conversations.</li>
          <li>Usage Data: feature usage and AI-token consumption used to meter your plan.</li>
          <li>Technical Data: IP address, browser type, device info.</li>
          <li>Payment Data: handled by Paddle. We do not store your card details.</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">2. How We Use Your Information</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Generate AI answers and analyze your documents and drawings</li>
          <li>Index your content so it can be searched to ground responses</li>
          <li>Personalize responses to your vessel profile</li>
          <li>Authenticate users and secure accounts</li>
          <li>Meter usage and process subscriptions</li>
          <li>Comply with legal obligations (GDPR)</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">3. AI Processing</h3>
        <p>
          To generate answers, relevant excerpts of your questions and uploaded content are sent to our AI providers — Anthropic (answer generation) and OpenAI (document indexing, OCR, drawing analysis, transcription). Document text may also be extracted via LlamaIndex (LlamaParse). These providers process your data only to deliver their part of the Service.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">4. Sharing Your Information</h3>
        <p>We do not sell your personal data. We may share only with:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Service providers (Google Firebase, Anthropic, OpenAI, LlamaIndex, Paddle)</li>
          <li>Legal authorities if required by law</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">5. Where Your Data Is Stored</h3>
        <p>
          Your content is stored in Firebase (file bytes in Storage; account data, chat history, and memories in Firestore) and, for searchable content, in OpenAI vector stores. Some providers process data outside your country, including in the United States, under their own safeguards.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">6. Data Retention</h3>
        <p>
          We keep your content while your account is active. If a trial ends without a subscription, associated storage may be removed after a grace period. You can delete individual chats, memories, and documents in the app, or delete your entire account, at any time.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">7. Your Rights (GDPR)</h3>
        <p>
          Access, correct, export, delete, or restrict processing of your data. You can export your data as JSON in the app. Contact us: support@navimind.io
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">8. Security</h3>
        <p>
          We use encryption in transit, restricted access, and reputable cloud infrastructure. But no system is 100% secure.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">9. Cookies</h3>
        <p>
          We use only essential cookies and local storage to keep you signed in and remember your preferences. We do not currently use third-party analytics, advertising, or tracking cookies.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">10. Children's Privacy</h3>
        <p>
          Service not for individuals under 18. We don't knowingly collect children's data.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">11. Changes</h3>
        <p>
          Policy may be updated. Continued use = acceptance of updates.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">12. Contact</h3>
        <p>Questions? <a href="mailto:support@navimind.io" className="text-blue-500 hover:underline">support@navimind.io</a></p>
      </div>
    </div>
  );
}
