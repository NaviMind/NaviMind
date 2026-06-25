"use client";

import { useContext, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UIContext } from "@/context/UIContext";
import { useCurrentUserDoc } from "@/hooks/useCurrentUserDoc";
import { auth } from "@/firebase/config";
import AccountScreen from "@/components/app/AccountScreen";
import PrivacyDataScreen from "@/components/app/PrivacyDataScreen";
import SupportScreen from "@/components/app/SupportScreen";
import PrivacyPolicyScreen from "@/components/app/PrivacyPolicyScreen";
import TermsScreen from "@/components/app/TermsScreen";

// ─── Navigation icons ─────────────────────────────────────────────────────────

const IcBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IcChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-[13px] h-[13px] text-gray-400 flex-shrink-0">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

// ─── SVG icon from /public ────────────────────────────────────────────────────

function SvgIcon({ name }) {
  return (
    <img
      src={`/${name}`}
      alt=""
      className="w-[28px] h-[28px] brightness-0 opacity-60 dark:invert dark:opacity-75 flex-shrink-0"
    />
  );
}

// ─── Theme picker (Light / System / Dark) ────────────────────────────────────

const IcSun = () => (
  <svg viewBox="0 -960 960 960" fill="currentColor" className="w-[17px] h-[17px]">
    <path d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z" />
  </svg>
);
const IcMonitor = () => (
  <svg viewBox="0 -960 960 960" fill="currentColor" className="w-[17px] h-[17px]">
    <path d="M80-160v-80h80v-480q0-33 23.5-56.5T240-800h480q33 0 56.5 23.5T800-720v480h80v80H80Zm240-80h320v-480H240v480Zm-80 0v-480 480Zm160-80h80v-80h80v-80h-80v-80h-80v80h-80v80h80v80Zm-80-320v320-320Z" />
  </svg>
);
const IcMoon = () => (
  <svg viewBox="0 -960 960 960" fill="currentColor" className="w-[17px] h-[17px]">
    <path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 30-126.5 100T200-480q0 116 82 198t198 82Zm-10-270Z" />
  </svg>
);

const THEME_OPTIONS = [
  { value: "light",  icon: <IcSun />,     label: "Light"  },
  { value: "system", icon: <IcMonitor />, label: "System" },
  { value: "dark",   icon: <IcMoon />,    label: "Dark"   },
];

function ThemeToggle({ themePreference, setThemePreference }) {
  return (
    <div className="flex items-center bg-gray-200/80 dark:bg-gray-700/60 border border-gray-300/40 dark:border-white/10 rounded-xl p-[3px] gap-[2px]">
      {THEME_OPTIONS.map(({ value, icon, label }) => (
        <button
          key={value}
          type="button"
          title={label}
          onClick={() => setThemePreference(value)}
          className={`flex items-center justify-center w-[32px] h-[28px] rounded-[9px] transition-all duration-200
            ${themePreference === value
              ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow shadow-blue-900/40 text-white"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

// ─── Individual setting cell ──────────────────────────────────────────────────

function SettingCell({ iconName, label, onPress, badge, right }) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 px-4 py-[13px] text-left rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06] transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.08] active:bg-gray-100 dark:active:bg-white/[0.07]"
    >
      <SvgIcon name={iconName} />
      <span className="flex-1 text-[14px] text-gray-800 dark:text-white/90">{label}</span>
      {badge && (
        <span className="text-[11px] px-2 py-[2px] rounded-full bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-gray-400 mr-1 leading-none">
          {badge}
        </span>
      )}
      {right}
    </button>
  );
}

// ─── Sub-screen ───────────────────────────────────────────────────────────────

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

// ─── Main settings list ───────────────────────────────────────────────────────

function SettingsMain({ userDoc, loading, theme, onNavigate, onClose, onLogout }) {
  const { themePreference, setThemePreference } = useContext(UIContext);

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
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-1 right-1 z-10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
        aria-label="Close"
      >
        ✕
      </button>

      <div className="overflow-y-auto flex-1 min-h-0 px-4 custom-scroll">
        {/* User header */}
        <div className="flex flex-col items-center pt-7 pb-5 pr-6">
          {photoURL ? (
            <img
              src={photoURL}
              alt={displayName || "User"}
              referrerPolicy="no-referrer"
              className="w-[58px] h-[58px] rounded-full object-cover mb-3 ring-2 ring-black/10 dark:ring-white/10"
            />
          ) : (
            <div className="w-[58px] h-[58px] rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[20px] font-semibold mb-3 select-none ring-2 ring-black/10 dark:ring-white/10">
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

        {/* Settings cells */}
        <div className="pb-4">
          {/* Account & Subscription */}
          <div className="space-y-2">
            <SettingCell
              iconName="Account_circle.svg"
              label="Account"
              right={<IcChevron />}
              onPress={() => onNavigate("account")}
            />
            <SettingCell
              iconName="Credit_card.svg"
              label="Billing"
              badge={plan === "free" ? "Free" : "Pro"}
              right={<IcChevron />}
              onPress={() => onNavigate("subscription")}
            />
          </div>

          {/* Theme */}
          <div className="mt-2.5 flex items-center gap-3 px-4 py-[13px] rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06]">
            <SvgIcon name="Contrast.svg" />
            <span className="flex-1 text-[14px] text-gray-800 dark:text-white/90">Theme</span>
            <ThemeToggle themePreference={themePreference} setThemePreference={setThemePreference} />
          </div>

          {/* Privacy & Data */}
          <div className="mt-2.5">
            <SettingCell
              iconName="Admin_panel.svg"
              label="Privacy & Data"
              right={<IcChevron />}
              onPress={() => onNavigate("privacy")}
            />
          </div>

          {/* Support / Legal */}
          <div className="mt-2.5 space-y-2">
            <SettingCell
              iconName="Contact_support.svg"
              label="Support & Help"
              right={<IcChevron />}
              onPress={() => onNavigate("support")}
            />
            <SettingCell
              iconName="Policy.svg"
              label="Privacy Policy"
              right={<IcChevron />}
              onPress={() => onNavigate("privacyPolicy")}
            />
            <SettingCell
              iconName="Article.svg"
              label="Terms of Service"
              right={<IcChevron />}
              onPress={() => onNavigate("terms")}
            />
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="mt-2.5 w-full flex items-center gap-3 px-4 py-[13px] text-left rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06] transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 active:bg-red-50 dark:active:bg-red-500/15"
          >
            <img
              src="/Logout.svg"
              alt=""
              className="w-[28px] h-[28px] flex-shrink-0"
              style={{ filter: "brightness(0) saturate(100%) invert(58%) sepia(45%) saturate(714%) hue-rotate(307deg) brightness(99%) contrast(102%)" }}
            />
            <span className="flex-1 text-[14px] text-red-400">Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

const SUB_TITLES = {
  account: "Account",
  subscription: "Billing",
  privacy: "Privacy & Data",
  support: "Support & Help",
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
  const { isSettingsOpen, toggleSettings, toggleLogout, theme } = useContext(UIContext);
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
            <div className="relative bg-white/95 dark:bg-[#0f1623]/90 backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/[0.08] rounded-[22px] shadow-2xl flex flex-col overflow-hidden max-h-[75vh] sm:max-h-[95vh]">
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
                    className="flex flex-col flex-1 min-h-0"
                  >
                    {step === "account" ? (
                      <AccountScreen userDoc={userDoc} onBack={() => setStep("main")} />
                    ) : step === "privacy" ? (
                      <PrivacyDataScreen userDoc={userDoc} onBack={() => setStep("main")} />
                    ) : step === "support" ? (
                      <SupportScreen onBack={() => setStep("main")} />
                    ) : step === "privacyPolicy" ? (
                      <PrivacyPolicyScreen onBack={() => setStep("main")} />
                    ) : step === "terms" ? (
                      <TermsScreen onBack={() => setStep("main")} />
                    ) : (
                      <SubScreen
                        title={SUB_TITLES[step] || step}
                        onBack={() => setStep("main")}
                      />
                    )}
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
