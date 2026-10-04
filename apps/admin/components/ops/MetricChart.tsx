"use client";

// Time-series chart for one metric: value axis (y), time axis (x), a label on
// the peak so a spike is readable at a glance, and a crosshair readout on hover
// or arrow keys. Plain SVG, no chart library.
//
// Rendered at the container's real pixel width (ResizeObserver) so text stays
// crisp, and only after mount, because tick labels use the viewer's time zone.

import { useEffect, useMemo, useRef, useState } from "react";
import { formatValue, type ChartPoint, type ChartThreshold, type ChartUnit } from "./chart-format";

type Props = {
  title: string;
  points: ChartPoint[];
  unit: ChartUnit;
  startMs: number;
  endMs: number;
  periodMs: number;
  /** What one point represents, e.g. "per 30 min" or "p75". Shown in the readout. */
  pointLabel: string;
  thresholds?: ChartThreshold[];
  /** Shade under the line. Right for counts (zero-filled); wrong for sparse percentiles. */
  fill?: boolean;
};

const HEIGHT = 190;
const M = { top: 18, right: 14, bottom: 26, left: 46 };

/** Round axis step: 1, 2, 2.5 or 5 times a power of ten. */
function niceStep(rough: number): number {
  if (rough <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const n = rough / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

function yScale(maxValue: number, unit: ChartUnit): { max: number; ticks: number[] } {
  const floor = unit === "score" ? 0.05 : unit === "ms" ? 100 : 4;
  let step = niceStep(Math.max(maxValue, floor) / 4);
  if (unit === "count") step = Math.max(1, Math.ceil(step)); // counts never get fractional ticks
  const count = Math.max(1, Math.ceil(Math.max(maxValue, floor) / step));
  return { max: step * count, ticks: Array.from({ length: count + 1 }, (_, i) => +(step * i).toPrecision(12)) };
}

const HOUR = 3600_000;
const X_STEPS = [5 * 60_000, 10 * 60_000, 15 * 60_000, 30 * 60_000, HOUR, 2 * HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR, 24 * HOUR, 48 * HOUR];

/** Ticks on local-clock boundaries (on the hour, at midnight), not at arbitrary offsets. */
function xTicks(startMs: number, endMs: number, plotWidth: number): number[] {
  const want = Math.max(2, Math.min(8, Math.floor(plotWidth / 52)));
  const step = X_STEPS.find((s) => (endMs - startMs) / s <= want) ?? X_STEPS[X_STEPS.length - 1];
  const offset = new Date(startMs).getTimezoneOffset() * 60_000;
  const first = Math.ceil((startMs - offset) / step) * step + offset;
  const out: number[] = [];
  for (let t = first; t <= endMs; t += step) out.push(t);
  return out;
}

function tickLabel(t: number, spanMs: number): string {
  const d = new Date(t);
  if (spanMs > 2 * 24 * HOUR) return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: d.getMinutes() ? "2-digit" : undefined });
}

function fullTime(t: number): string {
  return new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function MetricChart({ title, points, unit, startMs, endMs, periodMs, pointLabel, thresholds = [], fill = true }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0); // 0 until mounted and measured
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.round(el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const model = useMemo(() => {
    if (!width) return null;
    const plotW = Math.max(40, width - M.left - M.right);
    const plotH = HEIGHT - M.top - M.bottom;
    const dataMax = points.reduce((m, p) => Math.max(m, p.v), 0);
    const visibleThresholds = thresholds.filter((th) => th.value <= Math.max(dataMax, th.value * 0.45) * 1.6);
    const y = yScale(Math.max(dataMax, ...visibleThresholds.map((th) => th.value)), unit);
    const sx = (t: number) => M.left + ((t - startMs) / (endMs - startMs || 1)) * plotW;
    const sy = (v: number) => M.top + plotH - (v / y.max) * plotH;

    // Break the line where data is missing rather than drawing across the gap.
    const segments: ChartPoint[][] = [];
    for (const p of points) {
      const seg = segments[segments.length - 1];
      if (seg && p.t - seg[seg.length - 1].t <= periodMs * 2.5) seg.push(p);
      else segments.push([p]);
    }
    const isolated = segments.filter((seg) => seg.length === 1).map((seg) => seg[0]);
    const line = segments.filter((seg) => seg.length > 1).map((seg) => seg.map((p, i) => `${i ? "L" : "M"}${sx(p.t).toFixed(1)},${sy(p.v).toFixed(1)}`).join(" ")).join(" ");
    const area = segments
      .filter((seg) => seg.length > 1)
      .map((seg) => `${seg.map((p, i) => `${i ? "L" : "M"}${sx(p.t).toFixed(1)},${sy(p.v).toFixed(1)}`).join(" ")} L${sx(seg[seg.length - 1].t).toFixed(1)},${sy(0)} L${sx(seg[0].t).toFixed(1)},${sy(0)} Z`)
      .join(" ");

    let peak: number | null = null;
    points.forEach((p, i) => { if (p.v > 0 && (peak === null || p.v > points[peak].v)) peak = i; });

    return { plotW, plotH, y, sx, sy, line, area, isolated, peak: peak as number | null, ticksX: xTicks(startMs, endMs, plotW), visibleThresholds };
  }, [width, points, unit, startMs, endMs, periodMs, thresholds]);

  function nearest(clientX: number): number | null {
    const el = wrapRef.current;
    if (!el || !model || !points.length) return null;
    const x = clientX - el.getBoundingClientRect().left;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(model.sx(points[i].t) - x) < Math.abs(model.sx(points[best].t) - x)) best = i;
    }
    return best;
  }

  function onKey(e: React.KeyboardEvent) {
    if (!points.length) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const cur = active ?? (e.key === "ArrowRight" ? -1 : points.length);
      setActive(Math.max(0, Math.min(points.length - 1, cur + (e.key === "ArrowRight" ? 1 : -1))));
    } else if (e.key === "Escape") setActive(null);
  }

  const empty = points.length === 0;
  const act = active !== null && model ? points[active] : null;
  const peakPoint = model && model.peak !== null ? points[model.peak] : null;
  const last = points[points.length - 1];

  return (
    <div className="chart">
      <div
        ref={wrapRef}
        className="chart-plot"
        style={{ height: HEIGHT }}
        tabIndex={empty ? -1 : 0}
        role="img"
        aria-label={
          empty
            ? `${title}: no data in this range`
            : `${title}. Peak ${peakPoint ? `${formatValue(peakPoint.v, unit)} at ${fullTime(peakPoint.t)}` : "0"}. Use left and right arrow keys to read values.`
        }
        onPointerMove={(e) => setActive(nearest(e.clientX))}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={onKey}
      >
        {model && (
          <svg width={width} height={HEIGHT} aria-hidden="true">
            {/* value axis: gridlines + tick labels */}
            {model.y.ticks.map((tick) => (
              <g key={tick}>
                <line className={tick === 0 ? "chart-axis" : "chart-grid"} x1={M.left} x2={M.left + model.plotW} y1={model.sy(tick)} y2={model.sy(tick)} />
                <text className="chart-tick" x={M.left - 8} y={model.sy(tick)} dy="0.32em" textAnchor="end">{formatValue(tick, unit, true)}</text>
              </g>
            ))}
            {/* time axis */}
            {model.ticksX.map((t) => (
              <g key={t}>
                <line className="chart-axis" x1={model.sx(t)} x2={model.sx(t)} y1={model.sy(0)} y2={model.sy(0) + 4} />
                <text className="chart-tick" x={model.sx(t)} y={HEIGHT - 6} textAnchor="middle">{tickLabel(t, endMs - startMs)}</text>
              </g>
            ))}
            {/* reference levels (e.g. Web Vitals bands) */}
            {model.visibleThresholds.map((th) => (
              <g key={th.label}>
                <line className="chart-threshold" x1={M.left} x2={M.left + model.plotW} y1={model.sy(th.value)} y2={model.sy(th.value)} />
                <text className="chart-threshold-label" x={M.left + model.plotW} y={model.sy(th.value) - 4} textAnchor="end">{th.label}</text>
              </g>
            ))}

            {!empty && (
              <>
                {fill && <path className="chart-area" d={model.area} />}
                <path className="chart-line" d={model.line} fill="none" />
                {/* isolated points (no neighbour to draw a line to) still need a mark */}
                {model.isolated.map((p) => (
                  <circle key={p.t} className="chart-dot" cx={model.sx(p.t)} cy={model.sy(p.v)} r="4" />
                ))}
                {/* peak: the one direct label, so a spike reads without hovering */}
                {peakPoint && act === null && (
                  <g>
                    <circle className="chart-dot" cx={model.sx(peakPoint.t)} cy={model.sy(peakPoint.v)} r="4" />
                    <text
                      className="chart-peak"
                      x={Math.min(Math.max(model.sx(peakPoint.t), M.left + 30), M.left + model.plotW - 30)}
                      y={Math.max(model.sy(peakPoint.v) - 9, 11)}
                      textAnchor="middle"
                    >
                      {formatValue(peakPoint.v, unit)}
                    </text>
                  </g>
                )}
                {last && act === null && last !== peakPoint && points.length > 1 && (
                  <circle className="chart-dot" cx={model.sx(last.t)} cy={model.sy(last.v)} r="4" />
                )}
                {act && (
                  <g>
                    <line className="chart-crosshair" x1={model.sx(act.t)} x2={model.sx(act.t)} y1={M.top} y2={model.sy(0)} />
                    <circle className="chart-dot" cx={model.sx(act.t)} cy={model.sy(act.v)} r="4.5" />
                  </g>
                )}
              </>
            )}
            {empty && (
              <text className="chart-empty" x={M.left + model.plotW / 2} y={M.top + model.plotH / 2} textAnchor="middle">No data in this range</text>
            )}
          </svg>
        )}

        {act && model && (
          <div
            className="chart-tip"
            style={{
              left: Math.min(Math.max(model.sx(act.t), 78), width - 78),
              top: Math.max(model.sy(act.v) - 12, 44),
            }}
          >
            <strong>{formatValue(act.v, unit)}</strong>
            <span>{pointLabel}</span>
            <span>{fullTime(act.t)}</span>
          </div>
        )}
      </div>

      {!empty && (
        <details className="chart-table">
          <summary>View as table</summary>
          <div className="chart-table-scroll">
            <table>
              <thead><tr><th scope="col">Time</th><th scope="col">{title} ({pointLabel})</th></tr></thead>
              <tbody>
                {width > 0 && points.map((p) => (
                  <tr key={p.t}><td>{fullTime(p.t)}</td><td>{formatValue(p.v, unit)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
