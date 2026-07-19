"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCompactCurrency } from "@/lib/utils";

interface Bin {
  label: string;
  count: number;
  x0: number;
  x1: number;
}

function buildHistogram(values: number[], nbins = 24): Bin[] {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (!(max > min)) {
    return [{ label: formatCompactCurrency(min), count: values.length, x0: min, x1: min }];
  }

  const width = (max - min) / nbins;
  const bins: Bin[] = Array.from({ length: nbins }, (_, i) => {
    const x0 = min + i * width;
    const x1 = x0 + width;
    return { label: formatCompactCurrency(x0 + width / 2), count: 0, x0, x1 };
  });

  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx < 0) idx = 0;
    if (idx >= nbins) idx = nbins - 1;
    bins[idx].count += 1;
  }
  return bins;
}

function labelForValue(bins: Bin[], value: number): string {
  const bin = bins.find((b) => value >= b.x0 && value <= b.x1);
  return (bin ?? bins[bins.length - 1]).label;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
        ECL Distribution
      </h2>
      {children}
    </section>
  );
}

export default function ECLDistribution({
  distribution,
  percentiles,
}: {
  distribution: number[] | null;
  percentiles: Record<string, number> | null;
}) {
  if (!distribution || distribution.length === 0) {
    return (
      <Shell>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The surrogate is deterministic, so there is no sampling distribution.
          Distribution charts are available for the vectorized and multicore
          Monte Carlo methods.
        </p>
      </Shell>
    );
  }

  if (distribution.length < 2) {
    return (
      <Shell>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Single-sample estimate:{" "}
          <span className="font-mono text-slate-800 dark:text-slate-100">
            {formatCompactCurrency(distribution[0])}
          </span>
        </p>
      </Shell>
    );
  }

  const bins = buildHistogram(distribution);
  const p5 = percentiles?.p5;
  const p50 = percentiles?.p50;
  const p95 = percentiles?.p95;

  return (
    <Shell>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bins} margin={{ top: 16, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-700"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              width={32}
            />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              contentStyle={{
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 8,
                fontSize: 12,
                color: "#e2e8f0",
              }}
              formatter={(value) => [`${value} samples`, "Frequency"]}
              labelFormatter={(label) => `ECL ≈ ${label}`}
            />
            <Bar dataKey="count" fill="#10b981" radius={[3, 3, 0, 0]} />

            {p5 !== undefined && (
              <ReferenceLine
                x={labelForValue(bins, p5)}
                stroke="#38bdf8"
                strokeDasharray="4 2"
                label={{ value: "p5", fill: "#38bdf8", fontSize: 10, position: "insideTopLeft" }}
              />
            )}
            {p50 !== undefined && (
              <ReferenceLine
                x={labelForValue(bins, p50)}
                stroke="#f59e0b"
                strokeDasharray="4 2"
                label={{ value: "p50", fill: "#f59e0b", fontSize: 10, position: "top" }}
              />
            )}
            {p95 !== undefined && (
              <ReferenceLine
                x={labelForValue(bins, p95)}
                stroke="#ef4444"
                strokeDasharray="4 2"
                label={{ value: "p95", fill: "#ef4444", fontSize: 10, position: "insideTopRight" }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        {p5 !== undefined && (
          <span>
            <span className="text-sky-400">p5</span> (worst-case 5%):{" "}
            <span className="font-mono">{formatCompactCurrency(p5)}</span>
          </span>
        )}
        {p50 !== undefined && (
          <span>
            <span className="text-amber-400">p50</span> (median):{" "}
            <span className="font-mono">{formatCompactCurrency(p50)}</span>
          </span>
        )}
        {p95 !== undefined && (
          <span>
            <span className="text-red-400">p95</span>:{" "}
            <span className="font-mono">{formatCompactCurrency(p95)}</span>
          </span>
        )}
      </div>
    </Shell>
  );
}
