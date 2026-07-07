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
import BillingScreen from "@/components/app/BillingScreen";
import PlanPicker from "@/components/app/PlanPicker";
import PlanChip from "@/components/common/PlanChip";

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

// ─── Inline settings icons ────────────────────────────────────────────────────
// Rendered inline instead of <img src="/x.svg"> so they paint instantly — the
// external SVGs were fetched on every open and flashed in a few seconds later.
// Same artwork as the files in /public, just embedded.

const SETTINGS_ICONS = {
  "Account_circle.svg": <path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm146.5-204.5Q340-521 340-580t40.5-99.5Q421-720 480-720t99.5 40.5Q620-639 620-580t-40.5 99.5Q539-440 480-440t-99.5-40.5ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm100-95.5q47-15.5 86-44.5-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160q53 0 100-15.5ZM523-537q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm-43-43Zm0 360Z" />,
  "Credit_card.svg": <path d="M880-720v480q0 33-23.5 56.5T800-160H160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720Zm-720 80h640v-80H160v80Zm0 160v240h640v-240H160Zm0 240v-480 480Z" />,
  "Admin_panel.svg": <path d="M722.5-297.5Q740-315 740-340t-17.5-42.5Q705-400 680-400t-42.5 17.5Q620-365 620-340t17.5 42.5Q655-280 680-280t42.5-17.5ZM680-160q31 0 57-14.5t42-38.5q-22-13-47-20t-52-7q-27 0-52 7t-47 20q16 24 42 38.5t57 14.5ZM480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v227q-19-8-39-14.5t-41-9.5v-147l-240-90-240 90v188q0 47 12.5 94t35 89.5Q310-290 342-254t71 60q11 32 29 61t41 52q-1 0-1.5.5t-1.5.5Zm200 0q-83 0-141.5-58.5T480-280q0-83 58.5-141.5T680-480q83 0 141.5 58.5T880-280q0 83-58.5 141.5T680-80ZM480-494Z" />,
  "Contact_support.svg": <path d="m480-80-10-120h-10q-142 0-241-99t-99-241q0-142 99-241t241-99q71 0 132.5 26.5t108 73q46.5 46.5 73 108T800-540q0 75-24.5 144t-67 128q-42.5 59-101 107T480-80Zm80-146q71-60 115.5-140.5T720-540q0-109-75.5-184.5T460-800q-109 0-184.5 75.5T200-540q0 109 75.5 184.5T460-280h100v54Zm-72-107q12-12 12-29t-12-29q-12-12-29-12t-29 12q-12 12-12 29t12 29q12 12 29 12t29-12Zm-58-115h60q0-30 6-42t38-44q18-18 30-39t12-45q0-51-34.5-76.5T460-720q-44 0-74 24.5T344-636l56 22q5-17 19-33.5t41-16.5q27 0 40.5 15t13.5 33q0 17-10 30.5T480-558q-35 30-42.5 47.5T430-448Zm30-65Z" />,
  "Policy.svg": <path d="M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 85-29 163.5T688-214L560-342q-18 11-38.5 16.5T480-320q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 22-5.5 42.5T618-398l60 60q20-41 31-86t11-92v-189l-240-90-240 90v189q0 121 68 220t172 132q26-8 49.5-20.5T576-214l56 56q-33 27-71.5 47T480-80Zm56.5-343.5Q560-447 560-480t-23.5-56.5Q513-560 480-560t-56.5 23.5Q400-513 400-480t23.5 56.5Q447-400 480-400t56.5-23.5ZM488-477Z" />,
  "Article.svg": <path d="M280-280h280v-80H280v80Zm0-160h400v-80H280v80Zm0-160h400v-80H280v80Zm-80 480q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z" />,
};

const THEME_ICONS = {
  light: <path d="M565-395q35-35 35-85t-35-85q-35-35-85-35t-85 35q-35 35-35 85t35 85q35 35 85 35t85-35Zm-226.5 56.5Q280-397 280-480t58.5-141.5Q397-680 480-680t141.5 58.5Q680-563 680-480t-58.5 141.5Q563-280 480-280t-141.5-58.5ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z" />,
  system: <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80v-640q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Z" />,
  dark: <path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z" />,
};

function SvgIcon({ name }) {
  const path = SETTINGS_ICONS[name];
  if (!path) return null;
  return (
    <svg
      viewBox="0 -960 960 960"
      fill="currentColor"
      className="w-[28px] h-[28px] flex-shrink-0 text-black/[0.55] dark:text-white/[0.72]"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

// ─── Theme picker cards (Light / System / Dark) ───────────────────────────────

const IcLogout = () => (
  <svg viewBox="0 -960 960 960" fill="currentColor" className="w-[28px] h-[28px] flex-shrink-0">
    <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-56-58 102-102H360v-80h326L584-622l56-58 200 200-200 200Z" />
  </svg>
);

const THEME_OPTIONS = [
  { value: "light",  label: "Light"  },
  { value: "system", label: "System" },
  { value: "dark",   label: "Dark"   },
];

// Compact segmented control — sits in the settings list like a normal row, with
// the active option highlighted as a pill.
function ThemeToggle({ themePreference, setThemePreference }) {
  return (
    <div className="flex items-stretch gap-1 p-1 rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06]">
      {THEME_OPTIONS.map(({ value, label }) => {
        const active = themePreference === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setThemePreference(value)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-colors
              ${active
                ? "bg-white dark:bg-white/10 text-blue-500 dark:text-blue-400 shadow-sm ring-1 ring-blue-500/30"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
              }`}
          >
            <svg viewBox="0 -960 960 960" fill="currentColor" width={18} height={18} className="flex-shrink-0" aria-hidden="true">
              {THEME_ICONS[value]}
            </svg>
            <span className="text-[13px] font-medium leading-none">{label}</span>
          </button>
        );
      })}
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
        typeof badge === "string" ? (
          <span className="text-[11px] px-2 py-[2px] rounded-full bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-gray-400 mr-1 leading-none">
            {badge}
          </span>
        ) : (
          <span className="mr-1">{badge}</span>
        )
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
          {!loading && (
            <div className="mt-2.5">
              <PlanChip plan={plan} size="lg" />
            </div>
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
              right={<IcChevron />}
              onPress={() => onNavigate("subscription")}
            />
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

          {/* Appearance — compact segmented control, no separate heading */}
          <div className="mt-2.5">
            <ThemeToggle themePreference={themePreference} setThemePreference={setThemePreference} />
          </div>

          {/* Divider — sets the exit action apart from the rest */}
          <div className="my-3 h-px bg-gray-100 dark:bg-white/[0.07]" />

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-[13px] text-left rounded-2xl bg-gray-50 dark:bg-white/[0.05] ring-1 ring-gray-200 dark:ring-white/[0.06] transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 active:bg-red-50 dark:active:bg-red-500/15 text-red-400"
          >
            <IcLogout />
            <span className="flex-1 text-[14px]">Log Out</span>
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

  // Let other parts of the app (upgrade nudges, quota blocks) open the plan
  // picker directly: window.dispatchEvent(new CustomEvent("navimind-open-plans")).
  useEffect(() => {
    const openPlans = () => {
      toggleSettings(true);
      setStep("planpicker");
    };
    window.addEventListener("navimind-open-plans", openPlans);
    return () => window.removeEventListener("navimind-open-plans", openPlans);
  }, [toggleSettings]);

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
            className={`w-full transition-[max-width] duration-300 ${
              step === "planpicker" ? "max-w-5xl" : "max-w-[360px] sm:max-w-lg"
            }`}
          >
            <div className="relative bg-white/95 dark:bg-[#0f1623]/90 backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/[0.08] rounded-[22px] shadow-2xl flex flex-col overflow-hidden max-h-[75dvh] sm:max-h-[95dvh]">
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
                    ) : step === "subscription" ? (
                      <BillingScreen
                        userDoc={userDoc}
                        onBack={() => setStep("main")}
                        onChangePlan={() => setStep("planpicker")}
                      />
                    ) : step === "planpicker" ? (
                      <PlanPicker
                        currentPlanKey={userDoc?.plan || "free"}
                        user={auth.currentUser}
                        onBack={() => setStep("subscription")}
                        onDone={() => toggleSettings(false)}
                      />
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
