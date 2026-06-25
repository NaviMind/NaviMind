"use client";

import { useState } from "react";

const IcBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IcMail = () => (
  <svg viewBox="0 -960 960 960" fill="currentColor" className="w-[20px] h-[20px]">
    <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z" />
  </svg>
);
const IcBug = () => (
  <svg viewBox="0 -960 960 960" fill="currentColor" className="w-[20px] h-[20px]">
    <path d="M480-120q-75 0-128.5-53.5T298-302v-2l-62 62q-11 11-28 11t-28-11q-11-11-11-28t11-28l78-78q0-24-.5-48T257-472H160q-17 0-28.5-11.5T120-512q0-17 11.5-28.5T160-552h97q3-22 7.5-42t10.5-38l-56-56q-11-11-11-28t11-28q11-11 28-11t28 11l42 42q20-32 50-56t66-38q-4-7-5.5-14.5T428-824q0-20 14-34t34-14q20 0 34 14t14 34q0 8-1.5 15.5T517-794q36 14 66 38t50 56l42-42q11-11 28-11t28 11q11 11 11 28t-11 28l-56 56q6 18 10.5 38t7.5 42h97q17 0 28.5 11.5T840-512q0 17-11.5 28.5T800-472h-97q-1 24-1.5 48t-.5 48l78 78q11 11 11 28t-11 28q-11 11-28 11t-28-11l-62-62v2q0 75-53.5 128.5T480-120Zm0-80q42 0 71-29t29-71v-220q0-42-29-71t-71-29q-42 0-71 29t-29 71v220q0 42 29 71t71 29Zm0-180Z" />
  </svg>
);
const IcTelegram = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[20px] h-[20px]">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);
const IcChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-[13px] h-[13px] text-gray-400 flex-shrink-0">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IcChevronDown = ({ open }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
    className={`w-[13px] h-[13px] text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: "How does memory work?",
    a: "NaviMind automatically builds a memory of key facts from your conversations — vessel context, recurring questions, past decisions. This memory is used to give you more relevant answers over time without repeating yourself. You can manage or clear memory in Settings → Privacy & Data → Memory.",
  },
  {
    q: "What is a Topic and when should I use one?",
    a: "Topics are focused workspaces for a specific area of work — a port call, a compliance audit, a cargo operation. Each Topic has its own chat history, uploaded documents, and memory. Use Topics when you want to keep work separate and build up dedicated context over time.",
  },
  {
    q: "What file types can I upload?",
    a: "PDF, Word (.docx), Excel (.xlsx), plain text (.txt), and common image formats (JPEG, PNG, WebP). Images are processed visually and via OCR. All uploaded documents are indexed and remain searchable across your chats.",
  },
  {
    q: "How do I set up my vessel profile?",
    a: "Open the sidebar and tap 'Vessel Profile'. Fill in your rank, vessel type, flag state, and classification society. NaviMind uses this silently to give you regulation-specific, vessel-specific answers without you having to repeat it every time.",
  },
  {
    q: "Is my data secure?",
    a: "Your chats and documents are stored in your private account and are never used to train AI models. You can export or permanently delete all your data at any time from Settings → Privacy & Data.",
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-[13px] text-left"
      >
        <span className="flex-1 text-[14px] text-gray-800 dark:text-white/90 leading-snug">{q}</span>
        <IcChevronDown open={open} />
      </button>
      {open && (
        <p className="px-4 pb-4 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-white/[0.06] pt-3">
          {a}
        </p>
      )}
    </div>
  );
}

// ─── contact row (renders as <a> link) ───────────────────────────────────────

function ContactRow({ icon, label, sub, href, disabled }) {
  const base = "w-full flex items-center gap-3 px-4 py-[13px] text-left rounded-2xl ring-1 transition-colors";
  const enabled = "bg-gray-50 dark:bg-white/[0.05] ring-gray-200 dark:ring-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.08] text-gray-800 dark:text-white/90";
  const soon = "bg-gray-50 dark:bg-white/[0.05] ring-gray-200 dark:ring-white/[0.06] text-gray-400 dark:text-gray-600 cursor-default";

  const inner = (
    <>
      <span className={disabled ? "text-gray-300 dark:text-gray-600" : "text-gray-500 dark:text-gray-400"}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] leading-tight">{label}</span>
        {sub && <span className="block text-[11.5px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</span>}
      </span>
      {disabled
        ? <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">Soon</span>
        : <IcChevron />}
    </>
  );

  if (disabled) {
    return <div className={`${base} ${soon}`}>{inner}</div>;
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${base} ${enabled}`}>
      {inner}
    </a>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function SupportScreen({ onBack }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-white/70 mr-1" aria-label="Back">
          <IcBack />
        </button>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Support</h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-5 py-5 space-y-2">
        <ContactRow
          icon={<IcMail />}
          label="Email support"
          sub="support@navimind.io"
          href="mailto:support@navimind.io?subject=NaviMind%20Support"
        />
        <ContactRow
          icon={<IcBug />}
          label="Report a bug"
          sub="Tell us what went wrong"
          href="mailto:support@navimind.io?subject=Bug%20Report%20%E2%80%94%20NaviMind"
        />
        <ContactRow
          icon={<IcTelegram />}
          label="Telegram support"
          sub="Chat with us directly"
          disabled
        />

        <div className="pt-3 space-y-1.5">
          <p className="px-1 text-[11.5px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">FAQ</p>
          {FAQ.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </div>
  );
}
