import type { Point } from "@vaishnora/core/cloudwatch";

// Tiny inline SVG trend line. Server-renderable, no JS.
export default function Sparkline({
  points,
  width = 160,
  height = 40,
  tone = "neutral",
}: {
  points: Point[];
  width?: number;
  height?: number;
  tone?: "neutral" | "good" | "bad";
}) {
  if (points.length < 2) {
    return (
      <svg className="ops-spark" viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
        <line x1="0" y1={height - 1} x2={width} y2={height - 1} className="ops-spark-base" />
      </svg>
    );
  }
  const xs = points.map((p) => p.t);
  const ys = points.map((p) => p.v);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys, 0);
  const minY = Math.min(...ys, 0);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const pad = 2;
  const sx = (t: number) => pad + ((t - minX) / spanX) * (width - pad * 2);
  const sy = (v: number) => height - pad - ((v - minY) / spanY) * (height - pad * 2);
  const d = points.map((p, i) => `${i ? "L" : "M"}${sx(p.t).toFixed(1)},${sy(p.v).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const area = `${d} L${sx(last.t).toFixed(1)},${height - pad} L${sx(points[0].t).toFixed(1)},${height - pad} Z`;

  return (
    <svg className={`ops-spark ops-spark-${tone}`} viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
      <path d={area} className="ops-spark-area" />
      <path d={d} className="ops-spark-line" fill="none" />
      <circle cx={sx(last.t)} cy={sy(last.v)} r="2.5" className="ops-spark-dot" />
    </svg>
  );
}
