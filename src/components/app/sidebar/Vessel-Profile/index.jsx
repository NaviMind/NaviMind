import { useEffect, useRef, useState } from "react";
import { useContext } from "react";
import { UIContext } from "@/context/UIContext";
import DeckDepartment from "./departments/Deck";
import { motion, AnimatePresence } from "framer-motion";
import ProfileCard from "./ProfileCard";
import AdvancedCard from "./AdvancedCard";

export default function VesselProfileModal({ open, onClose, onSave }) {
  const firstInputRef = useRef(null);

  const {
  advancedTouched,
  setAdvancedTouched,
  advancedCompleted,
  setAdvancedCompleted,
  setVesselProfileSaved,
  openAdvancedDirectly,
  setOpenAdvancedDirectly,
} = useContext(UIContext);

  const [form, setForm] = useState({
    rank: "",
    vesselType: "",
    lpgType: "",
    offshoreType: "",
    dpClass: "",
    capacity: "",
    capacityUnit: "DWT",
    flag: "",
    classification: "",
    ballastSystem: "",
    iceClass: "",
    specialNotes: "",

    // LNG Advanced
lngContainment: "",
lngTankPressure: "",
lngBor: "",
lngReliq: "",
lngFuelSystem: "",
lngGcu: "",
lngSloshing: "",
lngMaxFilling: "",
  });

const advancedSupportedTypes = ["LNG"]; 

const supportsAdvanced = advancedSupportedTypes.includes(form.vesselType);
const [department, setDepartment] = useState("deck");
const [step, setStep] = useState("profile"); 
const [showAdvancedOverlay, setShowAdvancedOverlay] = useState(false);

  useEffect(() => {
  if (form.vesselType === "LNG") {
    setShowAdvancedOverlay(true);
  }
}, [form.vesselType]);

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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.rank || !form.vesselType || !form.capacity.trim()) return;
    setVesselProfileSaved(true);
    onSave(form);
  };

  if (!open) return null;

  const slideVariants = {
  initial: { y: "100%", opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: "100%", opacity: 0 },
};

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
        <AnimatePresence mode="wait">
  {step === "profile" && (
    <ProfileCard
      key="profile"
      form={form}
      setForm={setForm}
      department={department}
      setDepartment={setDepartment}
      supportsAdvanced={supportsAdvanced}
      advancedCompleted={advancedCompleted}
      setAdvancedTouched={setAdvancedTouched}
      onSubmit={handleSubmit}
      onClose={onClose}
      showAdvancedOverlay={showAdvancedOverlay}
      setShowAdvancedOverlay={setShowAdvancedOverlay}
      setStep={setStep}
      slideVariants={slideVariants}
    />
  )}

  {step === "advanced" && (
  <AdvancedCard
  slideVariants={slideVariants}
  form={form}
  setForm={setForm}
  onBack={() => setStep("profile")}
  onSave={() => {
    setAdvancedCompleted(true);
    setAdvancedTouched(true);
    setStep("profile");
  }}
/>
)}
</AnimatePresence>
    </div>
  );
}