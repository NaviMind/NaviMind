import { useState } from "react";
import CustomSelect from "../../CustomSelect";

export default function DeckDepartment({ 
  form, 
  setForm, 
  supportsAdvanced,
  advancedCompleted, 
  setStep,
}) {
  const [customRank, setCustomRank] = useState("");
  const [customClassification, setCustomClassification] = useState("");
  const [customVesselType, setCustomVesselType] = useState("");
  const [customFlag, setCustomFlag] = useState("");
  const [customBallastSystem, setCustomBallastSystem] = useState("");

  const finalVesselType =
    form.vesselType === "Other"
      ? customVesselType.trim()
      : form.vesselType;

  const finalClassification =
    form.classification === "Other"
      ? customClassification.trim()
      : form.classification;

  const finalRank =
    form.rank === "Other"
      ? customRank.trim()
      : form.rank;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const rankOptions = [
    "Master",
    "Chief Officer",
    "2nd Officer",
    "3rd Officer",
    "Junior Officer",
    "Superintendent",
    "Other",
  ];

  const vesselTypeOptions = [
    "LNG",
    "LPG",
    "Tanker",
    "Oil / Chemical",
    "Bulk Carrier",
    "General Cargo",
    "Container",
    "Ro-Ro",
    "Passenger",
    "Offshore",
    "Other",
  ];

  const lpgTypeOptions = [
  "Fully Pressurised",
  "Semi-Pressurised",
  "Fully Refrigerated",
  "Ethylene Carrier",
];

const offshoreTypeOptions = [
  "PSV",
  "AHTS",
  "Platform Supply",
  "DSV",
  "Cable Layer",
  "Construction Vessel",
  "Drillship",
  "Jack-up",
];

const dpClassOptions = [
  "Non-DP",
  "DP1",
  "DP2",
  "DP3",
];

  const classificationOptions = [
    "DNV",
    "ABS",
    "LR",
    "BV",
    "RINA",
    "ClassNK",
    "CCS",
    "KR",
    "IRS",
    "Other",
  ];

  const flagOptions = [
  "Panama",
  "Liberia",
  "Marshall Islands",
  "Malta",
  "Cyprus",
  "Bahamas",
  "Belgium",
  "Netherlands",
  "Portugal",
  "Italy",
  "Greece",
  "Norway",
  "United Kingdom",
  "USA",
  "Canada",
  "Australia",
  "Brazil",
  "Turkey",
  "Singapore",
  "Hong Kong",
  "China",
  "Japan",
  "South Korea",
  "India",
  "Cayman Islands",
  "Isle of Man",
  "Antigua & Barbuda",
  "Other",
];

  const ballastSystemOptions = [
  "Alfa Laval (PureBallast)",
  "Wärtsilä (Aquarius)",
  "Hyundai (HiBallast)",
  "Ecochlor",
  "Optimarin",
  "Erma First",
  "Panasia (GloEn-Patrol)",
  "Headway (OceanGuard)",
  "Desmi",
  "Other",
];

const iceClassOptions = [
  "No Ice Class",
  "1C",
  "1B",
  "1A",
  "1A Super",
  "Arc4",
  "Arc5",
  "Arc6",
  "Arc7",
  "Polar Class",
];

  return (
    <>
      {/* Rank */}
      {form.rank !== "Other" ? (
        <CustomSelect
          value={form.rank}
          onChange={(val) => handleChange("rank", val)}
          options={rankOptions}
          placeholder="Rank"
        />
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter your position"
            value={customRank}
            onChange={(e) => setCustomRank(e.target.value)}
            className="input-style flex-1"
          />
          <button
            type="button"
            onClick={() => {
              handleChange("rank", "");
              setCustomRank("");
            }}
            className="px-3 rounded-lg border border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition"
          >
            Back
          </button>
        </div>
      )}

      {/* Vessel Type */}
      {form.vesselType !== "Other" ? (
  <div className="flex gap-2">
    <div className={supportsAdvanced ? "flex-1" : "w-full"}>
      <CustomSelect
        value={form.vesselType}
        onChange={(val) => handleChange("vesselType", val)}
        options={vesselTypeOptions}
        placeholder="Vessel Type"
      />
    </div>

    {supportsAdvanced && (
  <button
    type="button"
    onClick={() => setStep("advanced")}
        className="px-3 rounded-xl border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition whitespace-nowrap"
      >
        {advancedCompleted ? "Edit Details" : "Add Details"}
      </button>
    )}
  </div>
) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter vessel type"
            value={customVesselType}
            onChange={(e) => setCustomVesselType(e.target.value)}
            className="input-style flex-1"
          />
          <button
            type="button"
            onClick={() => {
              handleChange("vesselType", "");
              setCustomVesselType("");
            }}
            className="px-3 rounded-lg border border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition"
          >
            Back
          </button>
        </div>
      )}

      {/* LPG Type (only if LPG selected) */}
{form.vesselType === "LPG" && (
  <CustomSelect
    value={form.lpgType}
    onChange={(val) => handleChange("lpgType", val)}
    options={lpgTypeOptions}
    placeholder="LPG Type"
  />
)}

{/* Offshore Type + DP (only if Offshore selected) */}
{form.vesselType === "Offshore" && (
  <>
    <CustomSelect
      value={form.offshoreType}
      onChange={(val) => handleChange("offshoreType", val)}
      options={offshoreTypeOptions}
      placeholder="Offshore Type"
    />

    <CustomSelect
      value={form.dpClass}
      onChange={(val) => handleChange("dpClass", val)}
      options={dpClassOptions}
      placeholder="DP Class"
    />
  </>
)}

      {/* Capacity */}
      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Capacity (75,000)"
              value={form.capacity}
              onChange={(e) => handleChange("capacity", e.target.value)}
              className="input-style"
            />
          </div>

          <div className="w-24">
            <CustomSelect
              value={form.capacityUnit}
              onChange={(val) => handleChange("capacityUnit", val)}
              options={[
                "DWT",
                "CBM",
                "TEU",
                "PAX",
                "GT",
                "BHP",
                "m²",
              ]}
              placeholder="Unit"
            />
          </div>
        </div>
      </div>

      {/* Flag */}
{form.flag !== "Other" ? (
  <CustomSelect
    value={form.flag}
    onChange={(val) => handleChange("flag", val)}
    options={flagOptions}
    placeholder="Flag"
  />
) : (
  <div className="flex gap-2">
    <input
      type="text"
      placeholder="Enter flag"
      value={customFlag}
      onChange={(e) => setCustomFlag(e.target.value)}
      className="input-style flex-1"
    />
    <button
      type="button"
      onClick={() => {
        handleChange("flag", "");
        setCustomFlag("");
      }}
      className="px-3 rounded-lg border border-gray-500 text-gray-300 hover:bg-gray-700 text-sm transition"
    >
      Back
    </button>
  </div>
)}

      {/* Classification */}
      {form.classification !== "Other" ? (
        <CustomSelect
          value={form.classification}
          onChange={(val) => handleChange("classification", val)}
          options={classificationOptions}
          placeholder="Classification Society"
        />
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter classification society"
            value={customClassification}
            onChange={(e) => setCustomClassification(e.target.value)}
            className="input-style flex-1"
          />
          <button
            type="button"
            onClick={() => {
              handleChange("classification", "");
              setCustomClassification("");
            }}
            className="px-3 rounded-lg border border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition"
          >
            Back
          </button>
        </div>
      )}

      {/* Ballast Water Management System */}
{form.ballastSystem !== "Other" ? (
  <CustomSelect
    value={form.ballastSystem}
    onChange={(val) => handleChange("ballastSystem", val)}
    options={ballastSystemOptions}
    placeholder="Ballast Water Treatment System"
  />
) : (
  <div className="flex gap-2">
    <input
      type="text"
      placeholder="Enter BWTS"
      value={customBallastSystem}
      onChange={(e) => setCustomBallastSystem(e.target.value)}
      className="input-style flex-1"
    />
    <button
      type="button"
      onClick={() => {
        handleChange("ballastSystem", "");
        setCustomBallastSystem("");
      }}
      className="px-3 rounded-lg border border-gray-500 text-gray-300 hover:bg-gray-700 text-sm transition"
    >
      Back
    </button>
  </div>
)}

{/* Ice Class */}
<CustomSelect
  value={form.iceClass}
  onChange={(val) => handleChange("iceClass", val)}
  options={iceClassOptions}
  placeholder="Ice Class"
/>

      {/* Notes */}
      <textarea
        placeholder="Add operational specifics: ECDIS model, or specific cargo certifications here for better context."
        value={form.specialNotes}
        maxLength={300}
        onChange={(e) => handleChange("specialNotes", e.target.value)}
        className="input-style resize-none custom-scroll min-h-[80px] flex-shrink-0"
        rows={2}
      />

      {form.specialNotes.length > 280 &&
        form.specialNotes.length <= 300 && (
          <div className="text-xs text-yellow-400 mt-1">
            {300 - form.specialNotes.length} characters remaining
          </div>
        )}
    </>
  );
}