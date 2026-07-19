// Fetch wrapper + base URL for the FastAPI backend (port 8080).
import type {
  SimulationResults,
  SimulationSubmitRequest,
  SimulationSubmitResponse,
} from "@/lib/types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    return JSON.stringify(data.detail ?? data);
  } catch {
    return res.statusText || `Request failed (${res.status})`;
  }
}

export async function submitSimulation(
  request: SimulationSubmitRequest
): Promise<SimulationSubmitResponse> {
  const res = await fetch(`${API_BASE}/api/v3/simulations/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as SimulationSubmitResponse;
}

export async function getSimulationResults(
  jobId: string
): Promise<SimulationResults> {
  const res = await fetch(
    `${API_BASE}/api/v3/simulations/${jobId}/results`
  );
  if (res.status === 404) {
    throw new Error(`Simulation ${jobId} not found`);
  }
  // 202 (still running) also returns JSON with a "status" field.
  const data = await res.json();
  return data as SimulationResults;
}
