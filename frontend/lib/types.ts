// TypeScript interfaces mirroring the backend Pydantic models
// (see src/risk_engine/api/schemas.py and section 3.3 of CURSOR_PROMPT.md).

export type SimulationMethod = "vectorized" | "multicore";

export interface MacroCoordinates {
  unemployment_rate: number;
  interest_rate: number;
  housing_price_index: number;
}

export interface SimulationSubmitRequest {
  unemployment_rate: number; // 2.0 – 15.0
  interest_rate: number; // 0.0 – 12.0
  housing_price_index: number; // 70.0 – 130.0
  n_loans: number; // 1,000 – 100,000,000
  method: SimulationMethod;
}

export interface SimulationSubmitResponse {
  job_id: string;
  status: "queued" | "completed";
  ws_url: string | null;
}

export interface SimulationResults {
  job_id: string;
  status: "completed" | "running" | "failed";
  macro_inputs: MacroCoordinates;
  n_loans: number;
  method: string;
  defaults: number;
  default_rate: number;
  ecl: number; // in dollars (e.g. 5_487_562_500)
  hazard_rate: number; // e.g. 0.05
  pd: number; // e.g. 0.0488
  elapsed_ms: number;
  cached: boolean;
  ecl_distribution: number[] | null;
  percentiles: Record<string, number> | null;
}

export interface WSEvent {
  type: "progress" | "intermediate" | "final" | "error";
  completed?: number;
  total?: number;
  elapsed_ms?: number;
  defaults_so_far?: number;
  current_ecl?: number;
  ecl?: number;
  defaults?: number;
  default_rate?: number;
  detail?: string;
}
