// Shared by the server-rendered metrics page and the client-side chart, so it
// must stay free of "use client" and of any browser-only API.

export type ChartPoint = { t: number; v: number };
export type ChartUnit = "count" | "ms" | "score";
export type ChartThreshold = { value: number; label: string };

export function formatValue(v: number, unit: ChartUnit, compact = false): string {
  if (unit === "ms") {
    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10_000 ? 0 : 1).replace(/\.0$/, "")} s`;
    return `${Math.round(v)} ms`;
  }
  if (unit === "score") return v === 0 ? "0" : v.toFixed(v < 0.1 ? 3 : 2);
  if (compact && v >= 10_000) return `${(v / 1000).toFixed(0)}K`;
  if (compact && v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return Math.round(v).toLocaleString("en-US");
}
