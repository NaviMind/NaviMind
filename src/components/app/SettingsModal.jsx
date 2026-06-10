"use client";

import { useContext, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { UIContext } from "@/context/UIContext";
import { useCurrentUserDoc } from "@/hooks/useCurrentUserDoc";

// ——— Icons ———

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px] flex-shrink-0">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const IconCard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px] flex-shrink-0">
    <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const IconSliders = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px] flex-shrink-0">
    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px] flex-shrink-0">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconHelp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px] flex-shrink-0">
    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <circle cx="12" cy="17" r=".4" fill="currentColor" stroke="none" />
  </svg>
);

const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ——— Shared primitives ———

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-gray-200 dark:border-gray-700" />;
}

function InfoRow({ label, value, loading }) {
  return (
    <div>
      <dt className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800 dark:text-gray-200 break-all">
        {loading ? <span className="text-gray-400 dark:text-gray-600">—</span> : (value || "—")}
      </dd>
    </div>
  );
}

function GhostButton({ children, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
        danger
          ? "text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          : "bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 text-sm rounded-lg transition-colors font-medium ${
            value === opt.value
              ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ——— Tab panels ———

function AccountTab({ userDoc, loading }) {
  const firstName = userDoc?.firstName || "";
  const lastName = userDoc?.lastName || "";
  const displayName =
    userDoc?.displayName ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    null;

  const initials = (displayName || userDoc?.email || "?")
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <div className="space-y-4">
      {/* Avatar row */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-gray-600 dark:bg-gray-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 select-none">
          {loading ? "" : initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {loading ? "Loading…" : (displayName || "—")}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {loading ? "" : (userDoc?.email || "—")}
          </p>
        </div>
      </div>

      <Divider />

      {/* Fields */}
      <dl className="space-y-3">
        <InfoRow label="Display Name" value={displayName} loading={loading} />
        <InfoRow label="Email" value={userDoc?.email} loading={loading} />
        {userDoc?.country && <InfoRow label="Country" value={userDoc.country} loading={loading} />}
      </dl>

      <Divider />

      {/* Actions */}
      <div className="space-y-1.5">
        <GhostButton onClick={() => alert("Coming soon")}>Edit Profile</GhostButton>
        <GhostButton onClick={() => alert("Coming soon")}>Change Password</GhostButton>
      </div>

      <Divider />

      {/* Danger zone */}
      <div>
        <SectionLabel>Danger zone</SectionLabel>
        <GhostButton danger onClick={() => alert("Coming soon")}>Delete Account</GhostButton>
      </div>
    </div>
  );
}

function SubscriptionTab({ userDoc }) {
  const plan = userDoc?.plan || "free";
  const isPro = plan !== "free";

  return (
    <div className="space-y-4">
      {/* Plan badge */}
      <div className="flex items-center gap-2.5">
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isPro
              ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
          }`}
        >
          {isPro ? "Pro" : "Free"}
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {isPro ? "NaviMind Pro" : "NaviMind Free"}
        </span>
      </div>

      <Divider />

      <dl className="space-y-3">
        {userDoc?.renewalDate && (
          <InfoRow label="Next renewal" value={userDoc.renewalDate} />
        )}
      </dl>

      {!isPro && (
        <button
          onClick={() => alert("Coming soon")}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors font-medium"
        >
          Upgrade to Pro
        </button>
      )}

      {isPro && (
        <>
          <GhostButton onClick={() => alert("Coming soon")}>Manage Subscription</GhostButton>
          <Divider />
          <GhostButton danger onClick={() => alert("Coming soon")}>Cancel Subscription</GhostButton>
        </>
      )}
    </div>
  );
}

function PreferencesTab({ theme, setTheme, language, setLanguage }) {
  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>Theme</SectionLabel>
        <SegmentedControl
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
          ]}
          value={theme}
          onChange={setTheme}
        />
      </div>

      <Divider />

      <div>
        <SectionLabel>Language</SectionLabel>
        <SegmentedControl
          options={[
            { value: "EN", label: "English" },
            { value: "RU", label: "Русский" },
          ]}
          value={language}
          onChange={setLanguage}
        />
      </div>
    </div>
  );
}

function PrivacyTab() {
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Your data</SectionLabel>
        <div className="space-y-1.5">
          <GhostButton onClick={() => alert("Coming soon")}>Export Chat History</GhostButton>
        </div>
      </div>

      <Divider />

      <div>
        <SectionLabel>Danger zone</SectionLabel>
        <GhostButton danger onClick={() => alert("Coming soon")}>Delete All Chats</GhostButton>
      </div>

      <Divider />

      <div className="space-y-1.5">
        <SectionLabel>Legal</SectionLabel>
        <a
          href="#"
          className="block text-sm text-blue-500 hover:text-blue-400 transition-colors py-0.5"
        >
          Privacy Policy
        </a>
        <a
          href="#"
          className="block text-sm text-blue-500 hover:text-blue-400 transition-colors py-0.5"
        >
          Terms of Service
        </a>
      </div>
    </div>
  );
}

function SupportTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        Have questions or need help? Reach out to our team.
      </p>

      <Divider />

      <dl className="space-y-3">
        <div>
          <dt className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">Email</dt>
          <dd>
            <a
              href="mailto:support@navimind.com"
              className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
            >
              support@navimind.com
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">Telegram</dt>
          <dd>
            <a
              href="https://t.me/navimind_support"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
            >
              @navimind_support
            </a>
          </dd>
        </div>
      </dl>
    </div>
  );
}

// ——— Main modal ———

const TABS = [
  { id: "account",      label: "Account",      Icon: IconUser    },
  { id: "subscription", label: "Subscription", Icon: IconCard    },
  { id: "preferences",  label: "Preferences",  Icon: IconSliders },
  { id: "privacy",      label: "Privacy",      Icon: IconShield  },
  { id: "support",      label: "Support",      Icon: IconHelp    },
];

export default function SettingsModal() {
  const { isSettingsOpen, toggleSettings, theme, setTheme, language, setLanguage } =
    useContext(UIContext);
  const { data: userDoc, loading: userLoading } = useCurrentUserDoc();
  const [activeTab, setActiveTab] = useState("account");
  const modalRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = isSettingsOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isSettingsOpen]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const onOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) toggleSettings(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [isSettingsOpen, toggleSettings]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const onEsc = (e) => { if (e.key === "Escape") toggleSettings(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isSettingsOpen, toggleSettings]);

  if (!isSettingsOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="relative z-[2001] w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxWidth: 520, maxHeight: "min(88vh, 580px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-wide">
            Settings
          </h2>
          <button
            onClick={() => toggleSettings(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="Close"
          >
            <IconClose />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar nav */}
          <nav className="w-[130px] flex-shrink-0 border-r border-gray-200 dark:border-gray-700 py-2.5 px-2 flex flex-col gap-0.5">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                  activeTab === id
                    ? "bg-gray-900 dark:bg-gray-700 text-white"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                <Icon />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 min-w-0">
            {activeTab === "account" && (
              <AccountTab userDoc={userDoc} loading={userLoading} />
            )}
            {activeTab === "subscription" && (
              <SubscriptionTab userDoc={userDoc} />
            )}
            {activeTab === "preferences" && (
              <PreferencesTab
                theme={theme}
                setTheme={setTheme}
                language={language}
                setLanguage={setLanguage}
              />
            )}
            {activeTab === "privacy" && <PrivacyTab />}
            {activeTab === "support" && <SupportTab />}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
