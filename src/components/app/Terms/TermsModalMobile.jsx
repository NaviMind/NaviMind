"use client";

import { useRef, useState } from "react";

export default function TermsModalMobile({ onClose }) {
  const scrollRef = useRef(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
    if (nearBottom && !scrolledToEnd) setScrolledToEnd(true);
  };

  return (
    // Только карточка. Фон и fixed — снаружи, в WelcomeModal.
    <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-2xl 
                w-full max-w-sm max-h-[75vh] overflow-y-auto flex flex-col mt-16 mb-6">
      {/* Скролл ТОЛЬКО на контенте */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scroll p-5 space-y-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
      >
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Terms of Service</h2>
          <p className="text-gray-400 dark:text-gray-400 text-xs">
            Last updated: September 2025
          </p>
        </div>

        <p>
          Welcome to [Company Name] (“Company”, “we”, “our”, “us”). These Terms
          of Service (“Terms”) govern your use of our website, applications, and
          services (collectively, the “Service”). By using the Service, you agree
          to be bound by these Terms. If you do not agree, please do not use the
          Service.
        </p>

        <h3 className="font-semibold mt-4">1. Eligibility</h3>
        <p>
          You must be at least 18 years old to use the Service. By creating an
          account, you confirm that you are legally capable of entering into this
          agreement.
        </p>

        <h3 className="font-semibold mt-4">2. Accounts</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Maintain the confidentiality of your login credentials.</li>
          <li>Provide accurate and up-to-date information.</li>
          <li>We may suspend or terminate accounts for violations.</li>
        </ul>

        <h3 className="font-semibold mt-4">3. Use of the Service</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>No illegal or harmful activities.</li>
          <li>No hacking, disrupting, or overloading the system.</li>
          <li>No sharing or reselling your account without permission.</li>
        </ul>
        <p>The Service is provided “as is” and may change or be discontinued at any time.</p>

        <h3 className="font-semibold mt-4">4. Subscriptions & Payments</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Some features may require a paid subscription.</li>
          <li>Fees apply to subscriptions.</li>
          <li>Auto-renew unless cancelled before renewal.</li>
          <li>Refunds per our Refund Policy (to be defined).</li>
        </ul>

        <h3 className="font-semibold mt-4">5. Intellectual Property</h3>
        <p>
          All content and functionality (except user content) are the Company’s
          property and protected by IP laws.
        </p>

        <h3 className="font-semibold mt-4">6. Termination</h3>
        <p>We may suspend/terminate access if you:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Violate these Terms,</li>
          <li>Misuse the Service, or</li>
          <li>Fail to pay fees.</li>
        </ul>
        <p>You may terminate your account anytime by contacting us.</p>

        <h3 className="font-semibold mt-4">7. Limitation of Liability</h3>
        <p>To the maximum extent permitted by law, we are not liable for:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Indirect or consequential damages,</li>
          <li>Loss of data, profits, or business,</li>
          <li>Issues caused by third parties.</li>
        </ul>

        <h3 className="font-semibold mt-4">8. Governing Law</h3>
        <p>
          Governed by the laws of [Spain / EU], unless otherwise required by local law.
        </p>

        <h3 className="font-semibold mt-4">9. Changes to Terms</h3>
        <p>
          We may update these Terms. Updated versions will have a new “Last
          Updated” date. Continued use means acceptance.
        </p>

        <h3 className="font-semibold mt-4">10. Contact</h3>
        <p>Questions: support@[yourdomain].com</p>
      </div>

      {/* Кнопка (вне скролла, широкая для мобилки) */}
      <div className="p-5 pt-3">
        <button
          onClick={onClose}
          disabled={!scrolledToEnd}
          className={`w-full py-3 rounded-lg text-sm font-medium transition ${
            scrolledToEnd
              ? "bg-blue-600 hover:bg-blue-500 text-white"
              : "bg-blue-900/50 text-gray-400 cursor-not-allowed"
          }`}
        >
          Close
        </button>
      </div>
    </div>
  );
}
