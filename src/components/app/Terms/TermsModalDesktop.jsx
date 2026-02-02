"use client";

import { useRef, useState, useEffect } from "react";

export default function TermsModalDesktop({ onClose }) {
  const scrollRef = useRef(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        setScrolledToEnd(true);
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Terms of Service</h2>
        <p className="text-gray-400 dark:text-gray-400 text-xs">
          Last updated: September 2025
        </p>
      </div>

      {/* Content (scrollable) */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scroll px-6 pb-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-4"
      >
        <p>
          Welcome to [Company Name] (“Company”, “we”, “our”, “us”).
          These Terms of Service (“Terms”) govern your use of our website,
          applications, and services (collectively, the “Service”).
          By using the Service, you agree to be bound by these Terms.
          If you do not agree, please do not use the Service.
        </p>

        <h3 className="font-semibold mt-4">1. Eligibility</h3>
        <p>
          You must be at least 18 years old to use the Service.
          By creating an account, you confirm that you are legally capable of entering into this agreement.
        </p>

        <h3 className="font-semibold mt-4">2. Accounts</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
          <li>You agree to provide accurate and up-to-date information when creating an account.</li>
          <li>We may suspend or terminate your account if you violate these Terms.</li>
        </ul>

        <h3 className="font-semibold mt-4">3. Use of the Service</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Do not use the Service for any illegal or harmful activities.</li>
          <li>Do not attempt to hack, disrupt, or overload the system.</li>
          <li>Do not share or resell your account without permission.</li>
        </ul>
        <p>The Service is provided “as is” and may change or be discontinued at any time.</p>

        <h3 className="font-semibold mt-4">4. Subscriptions & Payments</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Some features may require a paid subscription.</li>
          <li>By subscribing, you agree to pay the applicable fees.</li>
          <li>Subscriptions automatically renew unless cancelled before the renewal date.</li>
          <li>Refunds may be provided in accordance with our Refund Policy (to be defined).</li>
        </ul>

        <h3 className="font-semibold mt-4">5. Intellectual Property</h3>
        <p>
          All content, features, and functionality of the Service (except for user-generated content) 
          are the exclusive property of the Company and protected by copyright and trademark laws.
        </p>

        <h3 className="font-semibold mt-4">6. Termination</h3>
        <p>We may suspend or terminate your access if you:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Violate these Terms,</li>
          <li>Misuse the Service, or</li>
          <li>Fail to pay subscription fees.</li>
        </ul>
        <p>You may terminate your account at any time by contacting us.</p>

        <h3 className="font-semibold mt-4">7. Limitation of Liability</h3>
        <p>To the maximum extent permitted by law, we are not liable for:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Any indirect, incidental, or consequential damages,</li>
          <li>Loss of data, profits, or business,</li>
          <li>Issues caused by third-party providers.</li>
        </ul>

        <h3 className="font-semibold mt-4">8. Governing Law</h3>
        <p>
          These Terms shall be governed by and interpreted in accordance with the laws of [Spain / EU],
          unless otherwise required by local law.
        </p>

        <h3 className="font-semibold mt-4">9. Changes to Terms</h3>
        <p>
          We may update these Terms from time to time.
          Updated versions will be posted with a new “Last Updated” date.
          Continued use of the Service means you accept the new Terms.
        </p>

        <h3 className="font-semibold mt-4">10. Contact</h3>
        <p>If you have any questions, contact us: support@[yourdomain].com</p>
      </div>

      {/* Button (fixed bottom) */}
      <div className="p-6">
  <button
  onClick={onClose}
  disabled={!scrolledToEnd}
  className={`w-full py-2 px-4 bg-blue-600 text-white text-sm font-normal rounded-lg shadow hover:bg-blue-700 transition
    ${
      scrolledToEnd
        ? "bg-blue-600 hover:bg-blue-500 text-white"
        : "bg-blue-900/40 text-gray-400 cursor-not-allowed"
    }`}
>
  Close
</button>
</div>
    </div>
  );
}
