"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const fadeSlide = {
  initial: { opacity: 0, x: 18 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -18 },
};

// ─── icons ────────────────────────────────────────────────────────────────────

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
    <path d="M480-200q66 0 113-47t47-113v-160q0-66-47-113t-113-47q-66 0-113 47t-47 113v160q0 66 47 113t113 47Zm-80-120h160v-80H400v80Zm0-160h160v-80H400v80Zm80 40Zm0 320q-65 0-120.5-32T272-240H160v-80h84q-3-20-3.5-40t-.5-40h-80v-80h80q0-20 .5-40t3.5-40h-84v-80h112q14-23 31.5-43t40.5-35l-64-66 56-56 86 86q28-9 57-9t57 9l88-86 56 56-66 66q23 15 41.5 34.5T688-640h112v80h-84q3 20 3.5 40t.5 40h80v80h-80q0 20-.5 40t-3.5 40h84v80H688q-32 56-87.5 88T480-120Z" />
  </svg>
);
const IcTelegram = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[20px] h-[20px]">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);
const IcFaq = () => (
  <svg viewBox="0 -960 960 960" fill="currentColor" className="w-[20px] h-[20px]">
    <path d="M478-240q21 0 35.5-14.5T528-290q0-21-14.5-35.5T478-340q-21 0-35.5 14.5T428-290q0 21 14.5 35.5T478-240Zm-36-154h74q0-33 7.5-52t42.5-52q26-26 41-49.5t15-56.5q0-56-41-86t-97-30q-57 0-92.5 30T342-618l66 26q5-18 22.5-39t53.5-21q32 0 48 17.5t16 38.5q0 20-12 37.5T506-526q-44 39-54 59t-10 73Zm38 314q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
  </svg>
);
const IcChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-[13px] h-[13px] text-gray-400 flex-shrink-0">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IcClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px]">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IcChevronDown = ({ open }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
    className={`w-[13px] h-[13px] text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const FAQ = [
  {
    section: "Using NaviMind",
    items: [
      {
        q: "How does memory work?",
        a: "NaviMind automatically builds a memory of key facts from your conversations — vessel context, recurring questions, past decisions. This memory is used to give you more relevant answers over time without you having to repeat yourself. You can manage or clear memory in Settings → Privacy & Data → Memory.",
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
    ],
  },
  {
    section: "Subscription & Billing",
    items: [
      {
        q: "What's included in the free plan?",
        a: "The free plan gives you access to core chat features, vessel profile setup, and a limited number of messages per month. Uploaded documents and topic memory are available on paid plans.",
      },
      {
        q: "How do I upgrade my plan?",
        a: "Go to Settings → Plan & Billing to view available plans and upgrade. Changes take effect immediately and are billed pro-rata for the current period.",
      },
      {
        q: "Can I cancel my subscription anytime?",
        a: "Yes. You can cancel at any time from Settings → Plan & Billing. Your access continues until the end of the current billing period, after which you revert to the free plan.",
      },
      {
        q: "What happens to my data if I cancel?",
        a: "All your chats, topics, and uploaded documents remain in your account. Nothing is deleted when you cancel — you keep access to everything, just with free plan limits going forward.",
      },
    ],
  },
  {
    section: "Privacy & Security",
    items: [
      {
        q: "Is my data secure?",
        a: "Your chats and documents are stored in your private account and are never used to train AI models. You can export or permanently delete all your data at any time from Settings → Privacy & Data.",
      },
      {
        q: "Can NaviMind see my conversations?",
        a: "Your conversations are private. NaviMind's team does not review individual chats. Data is stored securely and access is governed by our Privacy Policy.",
      },
    ],
  },
];

// ─── FAQ sub-screen ───────────────────────────────────────────────────────────

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06] overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-4 py-[13px] text-left">
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

function FaqView({ onBack }) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-1 px-3 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-white/70 mr-1" aria-label="Back">
          <IcBack />
        </button>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">FAQ</h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-5 py-5 space-y-5">
        {FAQ.map((section) => (
          <div key={section.section} className="space-y-1.5">
            <p className="px-1 text-[11.5px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
              {section.section}
            </p>
            {section.items.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── bug report overlay ───────────────────────────────────────────────────────

const MAX_BUG_CHARS = 2000;

function BugReportOverlay({ onClose }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    const subject = encodeURIComponent("Bug Report — NaviMind");
    const body = encodeURIComponent(text.trim());
    window.open(`mailto:support@navimind.io?subject=${subject}&body=${body}`, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-[480px] rounded-2xl bg-white dark:bg-[#141c2b] ring-1 ring-black/10 dark:ring-white/10 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[16px] font-semibold text-gray-900 dark:text-white">What happened?</h4>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <IcClose />
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_BUG_CHARS))}
          placeholder="Tell us about the issue you encountered"
          rows={9}
          autoFocus
          className="w-full px-3.5 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-400 dark:focus:border-blue-500 resize-none"
        />
        <p className="text-right text-[11.5px] text-gray-400 mt-2 mb-4">
          {text.length} / {MAX_BUG_CHARS} characters used
        </p>
        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="px-6 py-2.5 rounded-xl text-[14px] font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-40 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── contact row ─────────────────────────────────────────────────────────────

function ContactRow({ icon, label, sub, href, onClick, disabled }) {
  const base = "w-full flex items-center gap-3 px-4 py-[13px] text-left rounded-2xl ring-1 transition-colors";
  const enabled = "bg-gray-50 dark:bg-white/[0.05] ring-gray-200 dark:ring-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.08] text-gray-800 dark:text-white/90";
  const disabledCls = "bg-gray-50 dark:bg-white/[0.05] ring-gray-200 dark:ring-white/[0.06] text-gray-400 dark:text-gray-600 cursor-default";

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

  if (disabled) return <div className={`${base} ${disabledCls}`}>{inner}</div>;
  if (onClick) return <button onClick={onClick} className={`${base} ${enabled}`}>{inner}</button>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={`${base} ${enabled}`}>{inner}</a>;
}

// ─── keyboard shortcuts ───────────────────────────────────────────────────────

const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

const SHORTCUTS = [
  { label: "Send message",    keys: ["Enter"] },
  { label: "New line",        keys: ["Shift", "Enter"] },
  { label: "Open search",     keys: [mod, "K"] },
  { label: "Close / go back", keys: ["Esc"] },
];

function ShortcutRow({ label, keys }) {
  return (
    <div className="flex items-center justify-between px-4 py-[11px]">
      <span className="text-[13.5px] text-gray-700 dark:text-white/80">{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-[11px] text-gray-400 dark:text-gray-500">+</span>}
            <kbd className="px-1.5 py-0.5 rounded-md text-[11.5px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.08] ring-1 ring-gray-200 dark:ring-white/[0.10]">
              {k}
            </kbd>
          </span>
        ))}
      </span>
    </div>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function SupportScreen({ onBack }) {
  const [view, setView] = useState("main"); // "main" | "faq"
  const [showBugReport, setShowBugReport] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {view === "faq" ? (
        <motion.div key="faq" variants={fadeSlide} initial="initial" animate="animate" exit="exit"
          transition={{ duration: 0.16 }} className="flex flex-col flex-1 min-h-0">
          <FaqView onBack={() => setView("main")} />
        </motion.div>
      ) : (
        <motion.div key="main" variants={fadeSlide} initial="initial" animate="animate" exit="exit"
          transition={{ duration: 0.16 }} className="flex flex-col flex-1 min-h-0">
          <div className="relative flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-1 px-3 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
              <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-white/70 mr-1" aria-label="Back">
                <IcBack />
              </button>
              <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Support & Help</h3>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll px-5 py-5 space-y-2">
              <ContactRow
                icon={<IcMail />}
                label="Email support"
                sub="support@navimind.io"
                href="mailto:support@navimind.io?subject=NaviMind%20Support"
              />
              <ContactRow
                icon={<IcTelegram />}
                label="Telegram support"
                sub="Chat with us directly"
                disabled
              />
              <ContactRow
                icon={<IcBug />}
                label="Report a bug"
                sub="Tell us what went wrong"
                onClick={() => setShowBugReport(true)}
              />
              <ContactRow
                icon={<IcFaq />}
                label="FAQ"
                sub="Common questions answered"
                onClick={() => setView("faq")}
              />

              <div className="pt-3">
                <p className="px-1 text-[11.5px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Keyboard shortcuts</p>
                <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06] divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {SHORTCUTS.map((s, i) => (
                    <ShortcutRow key={i} label={s.label} keys={s.keys} />
                  ))}
                </div>
              </div>
            </div>

            {showBugReport && <BugReportOverlay onClose={() => setShowBugReport(false)} />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
