// Number formatting + helpers shared across the dashboard.

export function roundToSignificant(value: number, sig = 3): number {
  if (!isFinite(value) || value <= 0) return 0;
  const digits = Math.ceil(Math.log10(value));
  const power = sig - digits;
  const mag = Math.pow(10, power);
  return Math.round(value * mag) / mag;
}

export function clampLoans(value: number): number {
  const rounded = Math.round(roundToSignificant(value, 3));
  return Math.min(100_000_000, Math.max(1_000, rounded));
}

export function formatInt(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  return `$${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)}`;
}

export function formatPercent(fraction: number, digits = 2): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}
