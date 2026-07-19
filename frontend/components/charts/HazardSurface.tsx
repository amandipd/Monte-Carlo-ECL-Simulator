"use client";

import { useMemo } from "react";

// Client-side mirror of macro_to_hazard_rate() in ecl_engine.py.
function hazardRate(u: number, i: number, hpi: number): number {
  return (
    0.05 *
    (1 + 0.5 * (u - 4) / 4) *
    (1 + 0.25 * (i - 3) / 3) *
    (1 + 0.5 * (100 - hpi) / 100)
  );
}

// Green (low) → yellow → red (high) via HSL hue sweep 120° → 0°.
function colorFor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const hue = 120 * (1 - clamped);
  return `hsl(${hue}, 70%, 45%)`;
}

const UNEMPLOYMENT = Array.from({ length: 14 }, (_, k) => 15 - k); // 15 → 2 (top → bottom)
const INTEREST = Array.from({ length: 13 }, (_, k) => k); // 0 → 12

export default function HazardSurface({
  unemployment,
  interest,
  hpi,
}: {
  unemployment: number;
  interest: number;
  hpi: number;
}) {
  const { cells, min, max } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    const grid = UNEMPLOYMENT.map((u) =>
      INTEREST.map((i) => {
        const h = hazardRate(u, i, hpi);
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
        return h;
      })
    );
    return { cells: grid, min: lo, max: hi };
  }, [hpi]);

  const currentU = Math.max(2, Math.min(15, Math.round(unemployment)));
  const currentI = Math.max(0, Math.min(12, Math.round(interest)));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Hazard Surface
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          HPI fixed at {hpi.toFixed(0)}
        </span>
      </div>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Annual hazard rate across the unemployment × interest-rate macro space.
        The ⬤ marks this simulation.
      </p>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {cells.map((row, r) => {
            const u = UNEMPLOYMENT[r];
            return (
              <div key={u} className="flex items-center">
                <span className="w-7 pr-1 text-right font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  {u}
                </span>
                {row.map((h, c) => {
                  const i = INTEREST[c];
                  const t = max > min ? (h - min) / (max - min) : 0.5;
                  const isCurrent = u === currentU && i === currentI;
                  return (
                    <div
                      key={i}
                      title={`unemployment=${u}%, interest=${i}%, hazard=${(h * 100).toFixed(2)}%`}
                      style={{ backgroundColor: colorFor(t) }}
                      className={`flex h-7 w-7 items-center justify-center border border-black/10 ${
                        isCurrent ? "z-10 ring-2 ring-white dark:ring-slate-100" : ""
                      }`}
                    >
                      {isCurrent && (
                        <span className="text-xs font-bold text-slate-900">⬤</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* x-axis (interest rate) labels */}
          <div className="flex">
            <span className="w-7" />
            {INTEREST.map((i) => (
              <span
                key={i}
                className="w-7 text-center font-mono text-[10px] text-slate-500 dark:text-slate-400"
              >
                {i}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>← Interest rate (%) · Unemployment (%) ↑</span>
        <span className="flex items-center gap-2">
          Low
          <span
            className="h-2.5 w-24 rounded-full"
            style={{
              background:
                "linear-gradient(to right, hsl(120,70%,45%), hsl(60,70%,45%), hsl(0,70%,45%))",
            }}
          />
          High
        </span>
      </div>
    </section>
  );
}
