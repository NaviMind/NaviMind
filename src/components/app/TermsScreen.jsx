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
          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-none mt-0.5">Last updated: September 2025</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-6 py-5 text-[13.5px] text-gray-700 dark:text-gray-300 leading-relaxed space-y-4">
        <p>
          Welcome to NaviMind ("Company", "we", "our", "us"). These Terms of Service ("Terms") govern your use of our website, applications, and services (collectively, the "Service"). By using the Service, you agree to be bound by these Terms. If you do not agree, please do not use the Service.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">1. Eligibility</h3>
        <p>
          You must be at least 18 years old to use the Service. By creating an account, you confirm that you are legally capable of entering into this agreement.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">2. Accounts</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
          <li>You agree to provide accurate and up-to-date information when creating an account.</li>
          <li>We may suspend or terminate your account if you violate these Terms.</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">3. Use of the Service</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Do not use the Service for any illegal or harmful activities.</li>
          <li>Do not attempt to hack, disrupt, or overload the system.</li>
          <li>Do not share or resell your account without permission.</li>
        </ul>
        <p>The Service is provided "as is" and may change or be discontinued at any time.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">4. Subscriptions &amp; Payments</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Some features may require a paid subscription.</li>
          <li>By subscribing, you agree to pay the applicable fees.</li>
          <li>Subscriptions automatically renew unless cancelled before the renewal date.</li>
          <li>Refunds may be provided in accordance with our Refund Policy.</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">5. Intellectual Property</h3>
        <p>
          All content, features, and functionality of the Service (except for user-generated content) are the exclusive property of the Company and protected by copyright and trademark laws.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">6. Termination</h3>
        <p>We may suspend or terminate your access if you:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Violate these Terms,</li>
          <li>Misuse the Service, or</li>
          <li>Fail to pay subscription fees.</li>
        </ul>
        <p>You may terminate your account at any time by contacting us.</p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">7. Limitation of Liability</h3>
        <p>To the maximum extent permitted by law, we are not liable for:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Any indirect, incidental, or consequential damages,</li>
          <li>Loss of data, profits, or business,</li>
          <li>Issues caused by third-party providers.</li>
        </ul>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">8. Governing Law</h3>
        <p>
          These Terms shall be governed by and interpreted in accordance with the laws of the European Union, unless otherwise required by local law.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">9. Changes to Terms</h3>
        <p>
          We may update these Terms from time to time. Updated versions will be posted with a new "Last Updated" date. Continued use of the Service means you accept the new Terms.
        </p>

        <h3 className="font-semibold text-gray-900 dark:text-white mt-2">10. Contact</h3>
        <p>If you have any questions, contact us: <a href="mailto:support@navimind.io" className="text-blue-500 hover:underline">support@navimind.io</a></p>
      </div>
    </div>
  );
}
