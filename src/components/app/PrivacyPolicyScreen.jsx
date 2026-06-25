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
          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-none mt-0.5">Last updated: September 2025</p>
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
          <li>Account Information: email address, name, password.</li>
          <li>Usage Data: chat history, preferences, activity logs.</li>
          <li>Technical Data: IP address, browser type, device info, cookies.</li>
          <li>Payment Data: billing details processed securely by providers (Stripe, Google, Apple).</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">2. How We Use Your Information</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide and maintain the Service</li>
          <li>Authenticate users and secure accounts</li>
          <li>Process payments and subscriptions</li>
          <li>Improve features and user experience</li>
          <li>Communicate updates and important notices</li>
          <li>Comply with legal obligations (GDPR)</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">3. Sharing Your Information</h3>
        <p>We do not sell your personal data. We may share only with:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Service providers (Firebase, Stripe, Google)</li>
          <li>Legal authorities if required by law</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">4. Data Retention</h3>
        <p>
          We keep your data only as long as necessary to provide the Service, comply with legal obligations, or resolve disputes. You may request deletion of your account and data at any time.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">5. Your Rights (GDPR)</h3>
        <p>
          Access, correct, request deletion, restrict processing, request data copy. Contact us: support@navimind.io
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">6. Security</h3>
        <p>
          We use encryption, secure hosting, restricted access. But no system is 100% secure.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">7. Cookies &amp; Tracking</h3>
        <p>
          Used to keep you signed in, remember preferences, analyze traffic. Can be controlled in browser settings.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">8. Children's Privacy</h3>
        <p>
          Service not for individuals under 18. We don't knowingly collect children's data.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">9. Changes</h3>
        <p>
          Policy may be updated. Continued use = acceptance of updates.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">10. Contact</h3>
        <p>Questions? <a href="mailto:support@navimind.io" className="text-blue-500 hover:underline">support@navimind.io</a></p>
      </div>
    </div>
  );
}
