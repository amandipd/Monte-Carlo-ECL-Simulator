"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import ECLDistribution from "@/components/charts/ECLDistribution";
import HazardSurface from "@/components/charts/HazardSurface";
import MetricsCard from "@/components/charts/MetricsCard";
import { DashboardSkeleton } from "@/components/Skeleton";
import { useWebSocket } from "@/hooks/useWebSocket";
import { getSimulationResults } from "@/lib/api";
import type { SimulationResults } from "@/lib/types";
import { formatCompactCurrency } from "@/lib/utils";

function ProgressBar({
  progress,
  liveEcl,
  connecting,
}: {
  progress: number;
  liveEcl: number | null;
  connecting: boolean;
}) {
  const pct = Math.round(progress * 100);
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {connecting ? "Connecting to simulation…" : "Running multicore simulation…"}
        </h2>
        <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
          {pct}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {liveEcl !== null && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Accumulated ECL so far:{" "}
          <span className="font-mono text-slate-700 dark:text-slate-200">
            {formatCompactCurrency(liveEcl)}
          </span>
        </p>
      )}
    </section>
  );
}

export default function DashboardPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);

  const [results, setResults] = useState<SimulationResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isRunning = results?.status === "running";
  const { events, progress, status: wsStatus, finalEvent } = useWebSocket(
    isRunning ? jobId : null
  );

  // Initial fetch.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSimulationResults(jobId)
      .then((r) => {
        if (!cancelled) {
          setResults(r);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load results");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // When the stream finishes, refetch the full (completed) results incl. distribution.
  useEffect(() => {
    if (!finalEvent && wsStatus !== "closed") return;
    let cancelled = false;
    getSimulationResults(jobId)
      .then((r) => {
        if (!cancelled) setResults(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [finalEvent, wsStatus, jobId]);

  const liveEcl = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      const value = events[i].current_ecl;
      if (value != null) return value;
    }
    return null;
  }, [events]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/"
        className="text-sm text-emerald-600 hover:underline dark:text-emerald-400"
      >
        ← New simulation
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-50">
        Simulation Results
      </h1>
      <p className="mt-1 font-mono text-xs text-slate-400 dark:text-slate-500">
        {jobId}
      </p>

      {error && (
        <p className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}

      {loading && !results && <DashboardSkeleton />}

      {isRunning && (
        <ProgressBar
          progress={progress}
          liveEcl={liveEcl}
          connecting={wsStatus === "connecting" || wsStatus === "idle"}
        />
      )}

      {results && results.status === "failed" && (
        <p className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
          This simulation failed. Try submitting it again.
        </p>
      )}

      {results && results.status === "completed" && (
        <div className="mt-6 space-y-6">
          <MetricsCard results={results} />
          <ECLDistribution
            distribution={results.ecl_distribution}
            percentiles={results.percentiles}
          />
          <HazardSurface
            unemployment={results.macro_inputs.unemployment_rate}
            interest={results.macro_inputs.interest_rate}
            hpi={results.macro_inputs.housing_price_index}
          />
        </div>
      )}
    </main>
  );
}
