"use client";

import { useContext, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UIContext } from "@/context/UIContext";
import { useCurrentUserDoc } from "@/hooks/useCurrentUserDoc";
import { auth } from "@/firebase/config";
import Icon from "@/components/common/Icon";

// ─── Icons ───────────────────────────────────────────────────────────────────

const IcUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IcCard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);
const IcAppearance = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
    <circle cx="12" cy="12" r="10" stroke="currentColor"/>
    <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" stroke="none"/>
  </svg>
);
const IcGlobe = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const IcShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IcHeadset = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
  </svg>
);
const IcLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IcDoc = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);
const IcChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-[13px] h-[13px] text-gray-600 flex-shrink-0">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IcBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IcX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── Primitives ──────────────────────────────────────────────────────────────

function SettingIcon({ bg, children }) {
  return (
    <div className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center flex-shrink-0 text-white ${bg}`}>
      {children}
    </div>
  );
}

function SettingRow({ icon, label, value, badge, onPress, last = false }) {
  return (
    <button
      onClick={onPress}
      className={`w-full flex items-center gap-3 px-4 py-[13px] text-left transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.04] active:bg-gray-100 dark:active:bg-white/[0.07] ${
        !last ? "border-b border-gray-100 dark:border-white/[0.06]" : ""
      }`}
    >
      {icon}
      <span className="flex-1 text-[14px] text-gray-800 dark:text-white/90">{label}</span>
      {badge && (
        <span className="text-[11px] px-2 py-[2px] rounded-full bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-gray-400 mr-1 leading-none">
          {badge}
        </span>
      )}
      {value && (
        <span className="text-[13px] text-gray-400 mr-1 flex-shrink-0">{value}</span>
      )}
      <IcChevron />
    </button>
  );
}

function SectionGroup({ label, children }) {
  return (
    <div className="mb-3">
      {label && (
        <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500 px-1 mb-1.5">
          {label}
        </p>
      )}
      <div className="rounded-2xl overflow-hidden bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06]">
        {children}
      </div>
    </div>
  );
}

// ─── Sub-screen stub (each section opens this for now) ───────────────────────

function SubScreen({ title, onBack }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-white/70 mr-1"
          aria-label="Back"
        >
          <IcBack />
        </button>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center">Coming soon</p>
      </div>
    </div>
  );
}

// ─── Main list ───────────────────────────────────────────────────────────────

function SettingsMain({ userDoc, loading, theme, language, onNavigate, onClose, onLogout }) {
  const displayName =
    userDoc?.displayName ||
    [userDoc?.firstName, userDoc?.lastName].filter(Boolean).join(" ") ||
    null;

  const initials = (displayName || userDoc?.email || "?")
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  const plan = userDoc?.plan || "free";
  const photoURL = userDoc?.photoURL || auth.currentUser?.photoURL || null;

  return (
    <div className="relative flex flex-col min-h-0 flex-1">
      {/* Close button — always visible, outside scroll */}
      <button
        onClick={onClose}
        className="absolute top-1 right-1 z-10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
        aria-label="Close"
      >
        ✕
      </button>

      {/* Single scrollable area — header + sections scroll together */}
      <div className="overflow-y-auto flex-1 min-h-0 px-4 custom-scroll">
        {/* User header — scrolls with content */}
        <div className="flex flex-col items-center pt-7 pb-5 pr-6">
          {photoURL ? (
            <img
              src={photoURL}
              alt={displayName || "User"}
              referrerPolicy="no-referrer"
              className="w-[58px] h-[58px] rounded-full object-cover mb-3 ring-2 ring-black/10 dark:ring-white/10"
            />
          ) : (
            <div className="w-[58px] h-[58px] rounded-full bg-gradient-to-br from-gray-400 to-gray-600 dark:from-gray-500 dark:to-gray-700 flex items-center justify-center text-white text-[20px] font-semibold mb-3 select-none ring-2 ring-black/10 dark:ring-white/10">
              {loading ? "" : initials}
            </div>
          )}

          <p className="text-[16px] font-semibold text-gray-900 dark:text-white leading-tight">
            {loading ? "Loading…" : (displayName || "—")}
          </p>
          {userDoc?.email && (
            <p className="text-[12px] text-gray-400 mt-0.5 max-w-[200px] truncate">
              {userDoc.email}
            </p>
          )}
        </div>
        {/* Account */}
        <SectionGroup>
          <SettingRow
            icon={<SettingIcon bg="bg-blue-600"><IcUser /></SettingIcon>}
            label="Account"
            onPress={() => onNavigate("account")}
          />
          <SettingRow
            icon={<SettingIcon bg="bg-purple-600"><IcCard /></SettingIcon>}
            label="Subscription"
            badge={plan === "free" ? "Free" : "Pro"}
            onPress={() => onNavigate("subscription")}
            last
          />
        </SectionGroup>

        {/* App */}
        <SectionGroup label="App">
          <SettingRow
            icon={<SettingIcon bg="bg-gray-600"><IcAppearance /></SettingIcon>}
            label="Appearance"
            value={theme === "dark" ? "Dark" : "Light"}
            onPress={() => onNavigate("appearance")}
          />
          <SettingRow
            icon={<SettingIcon bg="bg-teal-600"><IcGlobe /></SettingIcon>}
            label="Language"
            value={language}
            onPress={() => onNavigate("language")}
            last
          />
        </SectionGroup>

        {/* Privacy */}
        <SectionGroup label="Privacy">
          <SettingRow
            icon={<SettingIcon bg="bg-indigo-600"><IcShield /></SettingIcon>}
            label="Privacy & Data"
            onPress={() => onNavigate("privacy")}
            last
          />
        </SectionGroup>

        {/* About */}
        <SectionGroup label="About">
          <SettingRow
            icon={<SettingIcon bg="bg-orange-500"><IcHeadset /></SettingIcon>}
            label="Support"
            onPress={() => onNavigate("support")}
          />
          <SettingRow
            icon={<SettingIcon bg="bg-slate-600"><IcLock /></SettingIcon>}
            label="Privacy Policy"
            onPress={() => onNavigate("privacyPolicy")}
          />
          <SettingRow
            icon={<SettingIcon bg="bg-slate-600"><IcDoc /></SettingIcon>}
            label="Terms of Service"
            onPress={() => onNavigate("terms")}
            last
          />
        </SectionGroup>

        {/* Logout */}
        <div className="mt-1 mb-4">
          <div className="rounded-2xl overflow-hidden bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06]">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-[13px] text-left transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 active:bg-red-50 dark:active:bg-red-500/15"
            >
              <div className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center flex-shrink-0 bg-red-600/80">
                <Icon name="logout" size={16} className="text-white" />
              </div>
              <span className="flex-1 text-[14px] text-red-400">Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

const SUB_TITLES = {
  account: "Account",
  subscription: "Subscription",
  appearance: "Appearance",
  language: "Language",
  privacy: "Privacy & Data",
  support: "Support",
  privacyPolicy: "Privacy Policy",
  terms: "Terms of Service",
};

const slideUp = {
  initial: { y: "100%", opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit:    { y: "100%", opacity: 0 },
};
const slideTransition = { duration: 0.8, ease: [0.16, 1, 0.3, 1] };

const crossFadeIn  = { initial: { opacity: 0, x: 18 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 18 } };
const crossFadeOut = { initial: { opacity: 0, x: -18 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -18 } };

export default function SettingsModal() {
  const { isSettingsOpen, toggleSettings, toggleLogout, theme, language } = useContext(UIContext);
  const { data: userDoc, loading } = useCurrentUserDoc();
  const [step, setStep] = useState("main");
  const [mounted, setMounted] = useState(false);
  const backdropRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isSettingsOpen) setStep("main");
  }, [isSettingsOpen]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (step !== "main") setStep("main");
        else toggleSettings(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSettingsOpen, step, toggleSettings]);

  const handleBackdrop = (e) => {
    if (e.target === backdropRef.current) toggleSettings(false);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isSettingsOpen && (
        <div
          ref={backdropRef}
          className={`fixed inset-0 z-[2000] flex items-center justify-center backdrop-blur-sm p-4 ${theme === "dark" ? "bg-black/60" : "bg-black/25"}`}
          onClick={handleBackdrop}
        >
          <motion.div
            key="settings-shell"
            variants={slideUp}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={slideTransition}
            className="w-full max-w-[360px] sm:max-w-lg"
          >
            {/* Modal card */}
            <div
              className="relative bg-white/95 dark:bg-[#0f1623]/90 backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/[0.08] rounded-[22px] shadow-2xl flex flex-col overflow-hidden max-h-[75vh] sm:max-h-[95vh]"
            >
              <AnimatePresence mode="wait">
                {step === "main" ? (
                  <motion.div
                    key="main"
                    variants={crossFadeOut}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.18 }}
                    className="flex flex-col min-h-0 flex-1"
                  >
                    <SettingsMain
                      userDoc={userDoc}
                      loading={loading}
                      theme={theme}
                      language={language}
                      onNavigate={setStep}
                      onClose={() => toggleSettings(false)}
                      onLogout={() => toggleLogout(true)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key={step}
                    variants={crossFadeIn}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.18 }}
                    className="flex flex-col"
                    style={{ minHeight: 320 }}
                  >
                    <SubScreen
                      title={SUB_TITLES[step] || step}
                      onBack={() => setStep("main")}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
