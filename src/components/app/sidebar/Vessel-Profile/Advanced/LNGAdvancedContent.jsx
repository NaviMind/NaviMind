"use client";

import CustomSelect from "../../CustomSelect";

export default function LNGAdvancedContent({ form, setForm }) {

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const containmentOptions = [
    "Moss",
    "Membrane (NO96)",
    "Membrane (Mark III)",
    "Type C (Small scale)",
  ];

  const reliqOptions = [
    "Installed",
    "Not Installed",
  ];

  const fuelOptions = [
    "Steam Turbine",
    "DFDE",
    "ME-GI",
    "X-DF",
    "Conventional Diesel",
  ];

  const gcuOptions = [
    "Installed",
    "Not Installed",
  ];

  const sloshingOptions = [
    "Yes (Partial filling restricted)",
    "No",
  ];

  return (
    <>
      {/* Cargo Containment */}
      <CustomSelect
        value={form.lngContainment}
        onChange={(val) => handleChange("lngContainment", val)}
        options={containmentOptions}
        placeholder="Cargo Containment System"
      />

      {/* Tank Design Pressure */}
      <input
        type="text"
        placeholder="Tank Design Pressure (bar)"
        value={form.lngTankPressure}
        onChange={(e) => handleChange("lngTankPressure", e.target.value)}
        className="input-style"
      />

      {/* Natural BOR */}
      <input
        type="text"
        placeholder="Natural Boil-Off Rate (% per day)"
        value={form.lngBor}
        onChange={(e) => handleChange("lngBor", e.target.value)}
        className="input-style"
      />

      {/* Reliquefaction */}
      <CustomSelect
        value={form.lngReliq}
        onChange={(val) => handleChange("lngReliq", val)}
        options={reliqOptions}
        placeholder="Reliquefaction Plant"
      />

      {/* Fuel System */}
      <CustomSelect
        value={form.lngFuelSystem}
        onChange={(val) => handleChange("lngFuelSystem", val)}
        options={fuelOptions}
        placeholder="Fuel System Type"
      />

      {/* GCU */}
      <CustomSelect
        value={form.lngGcu}
        onChange={(val) => handleChange("lngGcu", val)}
        options={gcuOptions}
        placeholder="Gas Combustion Unit (GCU)"
      />

      {/* Sloshing */}
      <CustomSelect
        value={form.lngSloshing}
        onChange={(val) => handleChange("lngSloshing", val)}
        options={sloshingOptions}
        placeholder="Sloshing Restrictions"
      />

      {/* Max Filling */}
      <input
        type="text"
        placeholder="Maximum Filling Limit (%)"
        value={form.lngMaxFilling}
        onChange={(e) => handleChange("lngMaxFilling", e.target.value)}
        className="input-style"
      />
    </>
  );
}