"use client";

import { useState, useEffect, useRef } from "react";

export default function PrivacyPolicyModal({ onClose }) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    const el = contentRef.current;
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
        <h2 className="text-2xl font-bold mb-2">Privacy Policy</h2>
        <p className="text-gray-400 dark:text-gray-400 text-xs">
          Last updated: September 2025
        </p>
      </div>

      {/* Content (scrollable) */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto custom-scroll px-6 pb-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-4"
      >
        <p>
          This Privacy Policy explains how [Company Name] (“Company”, “we”,
          “our”, “us”) collects, uses, and protects your information when you
          use our website, applications, and services (the “Service”).
        </p>
        <p>
          By using the Service, you agree to the practices described in this
          Policy.
        </p>

        <h3 className="font-semibold mt-4">1. Information We Collect</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Account Information: email address, name, password.</li>
          <li>Usage Data: chat history, preferences, activity logs.</li>
          <li>Technical Data: IP address, browser type, device info, cookies.</li>
          <li>
            Payment Data: billing details processed securely by providers
            (Stripe, Google, Apple).
          </li>
        </ul>

        <h3 className="font-semibold mt-4">2. How We Use Your Information</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Provide and maintain the Service</li>
          <li>Authenticate users and secure accounts</li>
          <li>Process payments and subscriptions</li>
          <li>Improve features and user experience</li>
          <li>Communicate updates and important notices</li>
          <li>Comply with legal obligations (GDPR)</li>
        </ul>

        <h3 className="font-semibold mt-4">3. Sharing Your Information</h3>
        <p>We do not sell your personal data. We may share only with:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Service providers (Firebase, Stripe, Google)</li>
          <li>Legal authorities if required by law</li>
        </ul>

        <h3 className="font-semibold mt-4">4. Data Retention</h3>
        <p>
          We keep your data only as long as necessary to provide the Service,
          comply with legal obligations, or resolve disputes. You may request
          deletion of your account and data at any time.
        </p>

        <h3 className="font-semibold mt-4">5. Your Rights (GDPR)</h3>
        <p>
          Access, correct, request deletion, restrict processing, request data
          copy. Contact us: support@[yourdomain].com
        </p>

        <h3 className="font-semibold mt-4">6. Security</h3>
        <p>
          We use encryption, secure hosting, restricted access. But no system is
          100% secure.
        </p>

        <h3 className="font-semibold mt-4">7. Cookies & Tracking</h3>
        <p>
          Used to keep you signed in, remember preferences, analyze traffic.
          Can be controlled in browser settings.
        </p>

        <h3 className="font-semibold mt-4">8. Children’s Privacy</h3>
        <p>
          Service not for individuals under 18. We don’t knowingly collect
          children’s data.
        </p>

        <h3 className="font-semibold mt-4">9. Changes</h3>
        <p>
          Policy may be updated. Continued use = acceptance of updates.
        </p>

        <h3 className="font-semibold mt-4">10. Contact</h3>
        <p>Questions? support@[yourdomain].com</p>
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
