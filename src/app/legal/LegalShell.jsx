"use client";

import Link from "next/link";

// Shared wrapper for the public legal pages (Terms, Privacy, Refund). Plain,
// readable, no app chrome — this is what Paddle's domain review and end users see.
export default function LegalShell({ title, updated, children }) {
  return (
    <main className="min-h-screen bg-white px-4 py-12 text-gray-800">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-gray-900 hover:text-blue-600">
          NaviMind
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
        {updated && <p className="mt-1 text-sm text-gray-500">Last updated: {updated}</p>}
        <div className="prose prose-sm mt-6 max-w-none text-gray-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-900 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1">
          {children}
        </div>
        <footer className="mt-12 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-6 text-xs text-gray-500">
          <Link href="/subscription" className="underline hover:text-gray-700">Plans &amp; Pricing</Link>
          <Link href="/legal/terms" className="underline hover:text-gray-700">Terms</Link>
          <Link href="/legal/privacy" className="underline hover:text-gray-700">Privacy</Link>
          <Link href="/legal/refund" className="underline hover:text-gray-700">Refund &amp; Cancellation</Link>
          <a href="mailto:support@navimind.io" className="underline hover:text-gray-700">support@navimind.io</a>
        </footer>
      </div>
    </main>
  );
}
