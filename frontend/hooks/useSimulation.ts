"use client";

import { useCallback, useState } from "react";

import { getSimulationResults, submitSimulation } from "@/lib/api";
import type {
  SimulationResults,
  SimulationSubmitRequest,
  SimulationSubmitResponse,
} from "@/lib/types";

/**
 * Submit a simulation and (optionally) poll for its results.
 *
 * `submit` resolves with the submit response so the caller can navigate to
 * `/dashboard/{job_id}`. `poll` is provided for the dashboard to fetch results,
 * retrying while a multicore job is still running.
 */
export function useSimulation() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (
      request: SimulationSubmitRequest
    ): Promise<SimulationSubmitResponse | null> => {
      setIsSubmitting(true);
      setError(null);
      try {
        return await submitSimulation(request);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submission failed");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const poll = useCallback(
    async (
      jobId: string,
      { attempts = 30, intervalMs = 1000 }: { attempts?: number; intervalMs?: number } = {}
    ): Promise<SimulationResults> => {
      let last: SimulationResults | null = null;
      for (let i = 0; i < attempts; i++) {
        last = await getSimulationResults(jobId);
        if (last.status !== "running") return last;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
      if (last) return last;
      throw new Error(`Simulation ${jobId} did not complete in time`);
    },
    []
  );

  return { submit, poll, isSubmitting, error };
}
