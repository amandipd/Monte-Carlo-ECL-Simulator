"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useSimulation } from "@/hooks/useSimulation";
import type { SimulationMethod } from "@/lib/types";
import { clampLoans, formatCompact, formatInt } from "@/lib/utils";

// Baselines from config.py (MACRO_BASELINE_*).
const DEFAULTS = {
  unemployment_rate: 4.0,
  interest_rate: 3.0,
  housing_price_index: 100.0,
  n_loans: 1_000_000,
  method: "vectorized" as SimulationMethod,
};

// Preset scenarios — exact values from section 3.4 of CURSOR_PROMPT.md.
const PRESETS: {
  id: string;
  label: string;
  unemployment_rate: number;
  interest_rate: number;
  housing_price_index: number;
}[] = [
  { id: "custom", label: "Custom", unemployment_rate: DEFAULTS.unemployment_rate, interest_rate: DEFAULTS.interest_rate, housing_price_index: DEFAULTS.housing_price_index },
  { id: "baseline", label: "Baseline", unemployment_rate: 4.0, interest_rate: 3.0, housing_price_index: 100.0 },
  { id: "mild_recession", label: "Mild Recession", unemployment_rate: 7.0, interest_rate: 5.0, housing_price_index: 90.0 },
  { id: "severe_recession", label: "Severe Recession", unemployment_rate: 12.0, interest_rate: 8.0, housing_price_index: 75.0 },
  { id: "housing_crash", label: "Housing Crash", unemployment_rate: 6.0, interest_rate: 4.0, housing_price_index: 72.0 },
  { id: "rate_spike", label: "Rate Spike", unemployment_rate: 5.0, interest_rate: 11.0, housing_price_index: 95.0 },
];

const METHODS: { id: SimulationMethod; label: string; hint: string }[] = [
  { id: "vectorized", label: "Vectorized NumPy", hint: "Single-process Monte Carlo, synchronous" },
  { id: "multicore", label: "Multicore", hint: "ProcessPool + live WebSocket progress" },
  { id: "surrogate", label: "Neural Surrogate", hint: "PyTorch MLP, <1ms inference" },
];

// n_loans slider works on a log10 scale: 1K (10^3) → 100M (10^8).
const LOG_MIN = 3;
const LOG_MAX = 8;

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  displayValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  displayValue: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="font-mono text-sm text-emerald-400">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-emerald-500"
      />
      <div className="flex justify-between text-xs text-slate-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function SimulationForm() {
  const router = useRouter();
  const { submit, isSubmitting, error } = useSimulation();

  const [unemployment, setUnemployment] = useState(DEFAULTS.unemployment_rate);
  const [interest, setInterest] = useState(DEFAULTS.interest_rate);
  const [hpi, setHpi] = useState(DEFAULTS.housing_price_index);
  const [nLoans, setNLoans] = useState(DEFAULTS.n_loans);
  const [method, setMethod] = useState<SimulationMethod>(DEFAULTS.method);
  const [presetId, setPresetId] = useState("baseline");

  const logLoans = useMemo(() => Math.log10(nLoans), [nLoans]);

  function applyPreset(id: string) {
    setPresetId(id);
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset || id === "custom") return;
    setUnemployment(preset.unemployment_rate);
    setInterest(preset.interest_rate);
    setHpi(preset.housing_price_index);
  }

  // Any manual macro edit switches the preset selector back to "Custom".
  function onMacroChange(setter: (v: number) => void) {
    return (v: number) => {
      setter(v);
      setPresetId("custom");
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const response = await submit({
      unemployment_rate: unemployment,
      interest_rate: interest,
      housing_price_index: hpi,
      n_loans: nLoans,
      method,
    });
    if (response) {
      router.push(`/dashboard/${response.job_id}`);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur"
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">
          Preset Scenario
        </label>
        <select
          value={presetId}
          onChange={(e) => applyPreset(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
              {p.id !== "custom"
                ? ` — U ${p.unemployment_rate}% · I ${p.interest_rate}% · HPI ${p.housing_price_index}`
                : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-5">
        <Slider
          label="Unemployment Rate"
          value={unemployment}
          min={2}
          max={15}
          step={0.1}
          onChange={onMacroChange(setUnemployment)}
          displayValue={`${unemployment.toFixed(1)}%`}
        />
        <Slider
          label="Interest Rate"
          value={interest}
          min={0}
          max={12}
          step={0.25}
          onChange={onMacroChange(setInterest)}
          displayValue={`${interest.toFixed(2)}%`}
        />
        <Slider
          label="Housing Price Index"
          value={hpi}
          min={70}
          max={130}
          step={1}
          onChange={onMacroChange(setHpi)}
          displayValue={hpi.toFixed(0)}
        />
        <Slider
          label="Number of Loans (log scale)"
          value={logLoans}
          min={LOG_MIN}
          max={LOG_MAX}
          step={0.01}
          onChange={(v) => setNLoans(clampLoans(Math.pow(10, v)))}
          displayValue={`${formatCompact(nLoans)} (${formatInt(nLoans)})`}
        />
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-slate-300">Method</span>
        <div className="grid gap-2">
          {METHODS.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                method === m.id
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-slate-700 bg-slate-950 hover:border-slate-600"
              }`}
            >
              <input
                type="radio"
                name="method"
                value={m.id}
                checked={method === m.id}
                onChange={() => setMethod(m.id)}
                className="accent-emerald-500"
              />
              <span className="flex-1">
                <span className="block text-sm font-medium text-slate-100">
                  {m.label}
                </span>
                <span className="block text-xs text-slate-400">{m.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Running simulation…" : "Run Simulation"}
      </button>
    </form>
  );
}
