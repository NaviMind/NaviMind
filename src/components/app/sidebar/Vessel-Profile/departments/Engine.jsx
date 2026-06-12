"use client";

import { useState } from "react";
import CustomSelect from "../../CustomSelect";

export default function EngineDepartment({ form, setForm }) {
  const [customRank, setCustomRank] = useState("");
  const [customVesselType, setCustomVesselType] = useState("");
  const [customFlag, setCustomFlag] = useState("");
  const [customClassification, setCustomClassification] = useState("");

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const rankOptions = [
    "Chief Engineer",
    "2nd Engineer",
    "3rd Engineer",
    "4th Engineer",
    "ETO",
    "Motorman",
    "Superintendent (Technical)",
    "Other",
  ];

  const vesselTypeOptions = [
    "LNG", "LPG", "Tanker", "Oil / Chemical", "Bulk Carrier",
    "General Cargo", "Container", "Ro-Ro", "Passenger", "Offshore", "Other",
  ];

  const lpgTypeOptions = [
    "Fully Pressurised", "Semi-Pressurised", "Fully Refrigerated", "Ethylene Carrier",
  ];

  const offshoreTypeOptions = [
    "PSV", "AHTS", "Platform Supply", "DSV",
    "Cable Layer", "Construction Vessel", "Drillship", "Jack-up",
  ];

  const dpClassOptions = ["Non-DP", "DP1", "DP2", "DP3"];

  const classificationOptions = [
    "DNV", "ABS", "LR", "BV", "RINA", "ClassNK", "CCS", "KR", "IRS", "Other",
  ];

  const flagOptions = [
    "Panama", "Liberia", "Marshall Islands", "Malta", "Cyprus", "Bahamas",
    "Belgium", "Netherlands", "Portugal", "Italy", "Greece", "Norway",
    "United Kingdom", "USA", "Canada", "Australia", "Brazil", "Turkey",
    "Singapore", "Hong Kong", "China", "Japan", "South Korea", "India",
    "Cayman Islands", "Isle of Man", "Antigua & Barbuda", "Other",
  ];

  const propulsionOptions = [
    "FPP (Fixed Pitch)",
    "CPP (Controllable Pitch)",
    "Pod / Azipod",
    "Voith-Schneider",
    "Waterjet",
  ];

  const thrusterOptions = [
    "No Thrusters", "Bow Thruster", "Stern Thruster", "Bow + Stern Thrusters",
  ];

  const shaftGenOptions = ["Installed", "Not Installed"];

  const fuelSystemOptions = [
    "HFO", "HFO + Scrubber", "MDO / MGO",
    "LNG – DFDE", "LNG – ME-GI", "LNG – X-DF",
    "Methanol", "Ammonia",
  ];

  const scrubberOptions = ["No Scrubber", "Open Loop", "Closed Loop", "Hybrid"];

  const bwtsOptions = [
    "Alfa Laval (PureBallast)", "Wärtsilä (Aquarius)", "Hyundai (HiBallast)",
    "Ecochlor", "Optimarin", "Erma First", "Panasia (GloEn-Patrol)",
    "Headway (OceanGuard)", "Desmi", "Other",
  ];

  const boilerOptions = [
    "No Boiler", "Auxiliary Boiler", "Composite Boiler",
    "Exhaust Gas Economiser", "Composite + Aux",
  ];

  const incineratorOptions = ["Installed", "Not Installed"];

  const inertGasOptions = [
    "Flue Gas Generator", "Inert Gas Generator", "N2 Generator", "Not Installed",
  ];

  const isGasTanker = form.vesselType === "LNG" || form.vesselType === "LPG";

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
            onClick={() => { handleChange("rank", ""); setCustomRank(""); }}
            className="px-3 rounded-lg border border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition"
          >
            Back
          </button>
        </div>
      )}

      {/* Vessel Type */}
      {form.vesselType !== "Other" ? (
        <CustomSelect
          value={form.vesselType}
          onChange={(val) => handleChange("vesselType", val)}
          options={vesselTypeOptions}
          placeholder="Vessel Type"
        />
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
            onClick={() => { handleChange("vesselType", ""); setCustomVesselType(""); }}
            className="px-3 rounded-lg border border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition"
          >
            Back
          </button>
        </div>
      )}

      {form.vesselType === "LPG" && (
        <CustomSelect
          value={form.lpgType}
          onChange={(val) => handleChange("lpgType", val)}
          options={lpgTypeOptions}
          placeholder="LPG Type"
        />
      )}

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
            options={["DWT", "CBM", "TEU", "PAX", "GT", "BHP", "m²"]}
            placeholder="Unit"
          />
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
            onClick={() => { handleChange("flag", ""); setCustomFlag(""); }}
            className="px-3 rounded-lg border border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition"
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
            onClick={() => { handleChange("classification", ""); setCustomClassification(""); }}
            className="px-3 rounded-lg border border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition"
          >
            Back
          </button>
        </div>
      )}

      {/* Engine Room section */}
      <p className="text-xs text-gray-500 uppercase tracking-wider pt-1">Engine Room</p>

      <input
        type="text"
        placeholder="Main Engine (e.g. MAN B&W 7G80ME-C)"
        value={form.engMainEngine}
        onChange={(e) => handleChange("engMainEngine", e.target.value)}
        className="input-style"
      />

      <input
        type="text"
        placeholder="Aux Engines (e.g. 3× Wärtsilä 6L26)"
        value={form.engAuxEngines}
        onChange={(e) => handleChange("engAuxEngines", e.target.value)}
        className="input-style"
      />

      <input
        type="text"
        placeholder="Emergency Generator (e.g. Caterpillar 3412)"
        value={form.engEdg}
        onChange={(e) => handleChange("engEdg", e.target.value)}
        className="input-style"
      />

      <CustomSelect
        value={form.engPropulsion}
        onChange={(val) => handleChange("engPropulsion", val)}
        options={propulsionOptions}
        placeholder="Propulsion Type"
      />

      <CustomSelect
        value={form.engThrusters}
        onChange={(val) => handleChange("engThrusters", val)}
        options={thrusterOptions}
        placeholder="Thrusters"
      />

      <CustomSelect
        value={form.engShaftGen}
        onChange={(val) => handleChange("engShaftGen", val)}
        options={shaftGenOptions}
        placeholder="Shaft Generator"
      />

      <CustomSelect
        value={form.engFuelSystem}
        onChange={(val) => handleChange("engFuelSystem", val)}
        options={fuelSystemOptions}
        placeholder="Fuel System Type"
      />

      <CustomSelect
        value={form.engScrubber}
        onChange={(val) => handleChange("engScrubber", val)}
        options={scrubberOptions}
        placeholder="Scrubber (EGCS)"
      />

      <CustomSelect
        value={form.ballastSystem}
        onChange={(val) => handleChange("ballastSystem", val)}
        options={bwtsOptions}
        placeholder="Ballast Water Treatment System"
      />

      <CustomSelect
        value={form.engBoiler}
        onChange={(val) => handleChange("engBoiler", val)}
        options={boilerOptions}
        placeholder="Boiler Type"
      />

      <CustomSelect
        value={form.engIncinerator}
        onChange={(val) => handleChange("engIncinerator", val)}
        options={incineratorOptions}
        placeholder="Incinerator"
      />

      {/* Gas-carrier-specific systems */}
      {isGasTanker && (
        <>
          <p className="text-xs text-gray-500 uppercase tracking-wider pt-1">Gas Systems</p>

          <CustomSelect
            value={form.engInertSystem}
            onChange={(val) => handleChange("engInertSystem", val)}
            options={inertGasOptions}
            placeholder="Inert Gas System"
          />

          <input
            type="text"
            placeholder="Cargo Compressors (e.g. 2× Cryostar TS300)"
            value={form.engCargoCompressor}
            onChange={(e) => handleChange("engCargoCompressor", e.target.value)}
            className="input-style"
          />
        </>
      )}

      {/* Notes */}
      <textarea
        placeholder="Engine-specific notes: known issues, maker preferences, certifications."
        value={form.engNotes}
        maxLength={300}
        onChange={(e) => handleChange("engNotes", e.target.value)}
        className="input-style resize-none custom-scroll min-h-[80px] flex-shrink-0"
        rows={2}
      />

      {form.engNotes?.length > 280 && form.engNotes?.length <= 300 && (
        <div className="text-xs text-yellow-400 mt-1">
          {300 - form.engNotes.length} characters remaining
        </div>
      )}
    </>
  );
}
