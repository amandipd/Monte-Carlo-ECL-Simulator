import type { SimulationResults } from "@/lib/types";
import { formatCurrency, formatInt, formatPercent } from "@/lib/utils";

const METHOD_LABELS: Record<string, string> = {
  vectorized: "Vectorized NumPy",
  multicore: "Multicore (ProcessPool)",
  surrogate: "Neural Surrogate",
};

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 font-mono ${
          accent
            ? "text-xl font-semibold text-emerald-600 dark:text-emerald-400"
            : "text-lg text-slate-800 dark:text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function MetricsCard({ results }: { results: SimulationResults }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Key Metrics
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric
          label="Expected Credit Loss"
          value={formatCurrency(results.ecl)}
          accent
        />
        <Metric
          label="Defaults"
          value={`${formatInt(results.defaults)} / ${formatInt(results.n_loans)}`}
        />
        <Metric label="Default Rate" value={formatPercent(results.default_rate)} />
        <Metric label="Probability of Default" value={formatPercent(results.pd)} />
        <Metric label="Hazard Rate" value={formatPercent(results.hazard_rate)} />
        <Metric
          label="Method"
          value={METHOD_LABELS[results.method] ?? results.method}
        />
        <Metric
          label="Compute Time"
          value={`${results.elapsed_ms.toFixed(1)} ms`}
        />
      </div>
    </section>
  );
}
