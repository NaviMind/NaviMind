import { useEffect, useRef, useState } from "react";
import { useContext } from "react";
import { UIContext } from "@/context/UIContext";
import { motion, AnimatePresence } from "framer-motion";
import ProfileCard from "./ProfileCard";
import AdvancedCard from "./AdvancedCard";
import { auth } from "@/firebase/config";
import { saveVesselProfile } from "@/firebase/userRepo";

const VESSEL_STORAGE_KEY = "navimind_vessel_profile";
const VESSEL_DEPT_KEY = "navimind_vessel_department";

const ADVANCED_KEYS = [
  "lngContainment", "lngTankPressure", "lngBor", "lngReliq",
  "lngFuelSystem", "lngGcu", "lngSloshing", "lngMaxFilling",
];

const emptyForm = {
  rank: "", vesselType: "", lpgType: "", offshoreType: "", dpClass: "",
  capacity: "", capacityUnit: "DWT", flag: "", classification: "",
  ballastSystem: "", iceClass: "", specialNotes: "",
  lngContainment: "", lngTankPressure: "", lngBor: "", lngReliq: "",
  lngFuelSystem: "", lngGcu: "", lngSloshing: "", lngMaxFilling: "",
  engMainEngine: "", engAuxEngines: "", engEdg: "", engPropulsion: "",
  engThrusters: "", engShaftGen: "", engFuelSystem: "", engScrubber: "",
  engBoiler: "", engIncinerator: "", engInertSystem: "", engCargoCompressor: "",
  engNotes: "",
};

export default function VesselProfileModal({ open, onClose, onSave }) {
  const firstInputRef = useRef(null);

  const {
    advancedTouched, setAdvancedTouched,
    advancedCompleted, setAdvancedCompleted,
    setVesselProfileSaved,
    vesselProfileData,
    setVesselProfileData,
    openAdvancedDirectly, setOpenAdvancedDirectly,
  } = useContext(UIContext);

  const [form, setForm] = useState(emptyForm);
  const [savedForm, setSavedForm] = useState(null);
  const [advancedSavedForm, setAdvancedSavedForm] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAdvancedSuccess, setShowAdvancedSuccess] = useState(false);

  // Track whether the authoritative Firestore data has been applied once
  const syncedRef = useRef(false);

  const applyProfile = (data) => {
    setForm({ ...emptyForm, ...data });
    setSavedForm({ ...emptyForm, ...data });
    const hasAdvanced = ADVANCED_KEYS.some((k) => data[k]);
    if (hasAdvanced) {
      setAdvancedSavedForm(
        Object.fromEntries(ADVANCED_KEYS.map((k) => [k, data[k] || ""]))
      );
    }
  };

  // On mount: use localStorage for instant display while Firestore loads
  useEffect(() => {
    try {
      const raw = localStorage.getItem(VESSEL_STORAGE_KEY);
      if (raw) applyProfile(JSON.parse(raw));
      const savedDept = localStorage.getItem(VESSEL_DEPT_KEY);
      if (savedDept === "engine" || savedDept === "deck") setDepartment(savedDept);
    } catch {}
  }, []);

  // When UIContext receives Firestore data, overwrite stale localStorage cache once
  useEffect(() => {
    if (!vesselProfileData || syncedRef.current) return;
    syncedRef.current = true;
    applyProfile(vesselProfileData);
    try {
      const savedDept = localStorage.getItem(VESSEL_DEPT_KEY);
      if (savedDept === "engine" || savedDept === "deck") setDepartment(savedDept);
    } catch {}
  }, [vesselProfileData]);

  const isSaved = Boolean(savedForm);
  const isDirty = isSaved
    ? Object.keys(emptyForm).some((k) => form[k] !== savedForm[k])
    : true;

  const advancedIsSaved = Boolean(advancedSavedForm);
  const advancedIsDirty = advancedIsSaved
    ? ADVANCED_KEYS.some((k) => form[k] !== (advancedSavedForm[k] ?? ""))
    : true;
  const advancedIsEditMode = advancedIsSaved && !advancedIsDirty;

  const advancedSupportedTypes = ["LNG"];
  const supportsAdvanced = advancedSupportedTypes.includes(form.vesselType);
  const [department, setDepartment] = useState("deck");
  const [step, setStep] = useState("profile");

  useEffect(() => {
    if (open && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [open]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    if (openAdvancedDirectly) {
      setStep("advanced");
      setOpenAdvancedDirectly(false);
    }
  }, [openAdvancedDirectly]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rank || !form.vesselType || !form.capacity.trim()) return;

    localStorage.setItem(VESSEL_STORAGE_KEY, JSON.stringify(form));
    localStorage.setItem(VESSEL_DEPT_KEY, department);
    setSavedForm({ ...form });
    setVesselProfileSaved(true);
    setVesselProfileData({ ...form });

    const user = auth.currentUser;
    if (user?.uid) {
      saveVesselProfile(user.uid, form).catch(() => {});
    }

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onSave(form);
      onClose();
    }, 2500);
  };

  const handleAdvancedSave = async () => {
    localStorage.setItem(VESSEL_STORAGE_KEY, JSON.stringify(form));
    localStorage.setItem(VESSEL_DEPT_KEY, department);
    setSavedForm({ ...form });

    const snap = Object.fromEntries(ADVANCED_KEYS.map((k) => [k, form[k] || ""]));
    setAdvancedSavedForm(snap);

    setVesselProfileData({ ...form });
    setAdvancedCompleted(true);
    setAdvancedTouched(true);

    const user = auth.currentUser;
    if (user?.uid) {
      saveVesselProfile(user.uid, form).catch(() => {});
    }

    setShowAdvancedSuccess(true);
    setTimeout(() => {
      setShowAdvancedSuccess(false);
      setStep("profile");
    }, 2000);
  };

  if (!open) return null;

  const slideVariants = {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
  };

  const slideTransition = { duration: 0.5, ease: [0.16, 1, 0.3, 1] };

  return (
    <div
      className="fixed inset-0 overflow-hidden z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <AnimatePresence mode="wait">
        {step === "profile" && (
          <motion.div
            key="profile"
            className="relative w-full max-w-sm sm:max-w-lg"
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={slideTransition}
          >
            <ProfileCard
              form={form}
              setForm={setForm}
              department={department}
              setDepartment={setDepartment}
              supportsAdvanced={supportsAdvanced}
              advancedCompleted={advancedCompleted}
              onSubmit={handleSubmit}
              onClose={onClose}
              setStep={setStep}
              isSaved={isSaved}
              isDirty={isDirty}
              showSuccess={showSuccess}
            />
          </motion.div>
        )}

        {step === "advanced" && (
          <motion.div
            key="advanced"
            className="relative w-full max-w-sm sm:max-w-lg"
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={slideTransition}
          >
            <AdvancedCard
              form={form}
              setForm={setForm}
              onBack={() => setStep("profile")}
              onSave={handleAdvancedSave}
              showSuccess={showAdvancedSuccess}
              isEditMode={advancedIsEditMode}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
