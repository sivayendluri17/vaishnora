import Link from "next/link";
import { requireAdmin } from "@/lib/guard";
import {
  RANGES,
  describeError,
  fetchAlarms,
  fetchSeries,
  isConfigured,
  parseRange,
  type RangeKey,
  type Series,
} from "@vaishnora/core/cloudwatch";
import OpsShell, { OpsNotice } from "@/components/ops/OpsShell";
import Sparkline from "@/components/ops/Sparkline";

export const dynamic = "force-dynamic";
export const metadata = { title: "Metrics — Vaishnora Admin" };

function fmt(v: number | null, unit: Series["unit"]): string {
  if (v == null) return "—";
  if (unit === "ms") return v >= 10_000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v).toLocaleString("en-IN")} ms`;
  if (unit === "score") return v.toFixed(3);
  return Math.round(v).toLocaleString("en-IN");
}

function toneFor(s: Series): "neutral" | "good" | "bad" {
  if (s.headline == null) return "neutral";
  if (s.group === "errors") return s.headline > 0 ? "bad" : "good";
  if (s.id === "lcp_p75") return s.headline > 4000 ? "bad" : s.headline > 2500 ? "neutral" : "good";
  if (s.id === "cls_p75") return s.headline > 0.25 ? "bad" : s.headline > 0.1 ? "neutral" : "good";
  return "neutral";
}

export default async function MetricsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const admin = await requireAdmin("/admin/metrics");

  const range: RangeKey = parseRange((await searchParams).range);
  const cfg = isConfigured();

  let series: Series[] = [];
  let alarmCount = { alarm: 0, total: 0 };
  let error: string | null = null;
  if (cfg.ok) {
    try {
      const [s, alarms] = await Promise.all([fetchSeries(range), fetchAlarms().catch(() => [])]);
      series = s;
      alarmCount = { alarm: alarms.filter((a) => a.state === "ALARM").length, total: alarms.length };
    } catch (e) {
      error = describeError(e);
    }
  }

  const requests = series.find((s) => s.id === "requests")?.headline ?? 0;
  const e5xx = series.find((s) => s.id === "e5xx")?.headline ?? 0;
  const errorRate = requests > 0 ? (e5xx / requests) * 100 : 0;

  const picker = (
    <div className="ops-range" role="tablist" aria-label="Time range">
      {(Object.keys(RANGES) as RangeKey[]).map((k) => (
        <Link key={k} href={`/admin/metrics?range=${k}`} className={`ops-range-btn ${k === range ? "is-active" : ""}`} role="tab" aria-selected={k === range}>
          {RANGES[k].label}
        </Link>
      ))}
    </div>
  );

  return (
    <OpsShell active="metrics" title="Metrics" subtitle={`Live from CloudWatch · ${RANGES[range].label.toLowerCase()}`} right={picker}>
      {!cfg.ok && (
        <OpsNotice tone="warn">
          Monitoring is not configured on this deployment. Set <code>{cfg.missing.join("</code> and <code>")}</code> in the Amplify environment
          variables (they are the same values you gave the CloudFormation stack), then redeploy. Setup steps: <code>infra/observability/README.md</code>.
        </OpsNotice>
      )}
      {error && <OpsNotice tone="error">{error}</OpsNotice>}

      {cfg.ok && !error && (
        <>
          <div className="ops-summary">
            <div className={`ops-pill ${alarmCount.alarm ? "is-bad" : "is-good"}`}>
              {alarmCount.alarm ? `${alarmCount.alarm} of ${alarmCount.total} alarms firing` : `All ${alarmCount.total} alarms OK`}
              {" · "}
              <Link href="/admin/alarms">view</Link>
            </div>
            <div className={`ops-pill ${errorRate > 5 ? "is-bad" : errorRate > 1 ? "is-warn" : "is-good"}`}>
              5xx error rate {errorRate.toFixed(2)}%
            </div>
          </div>

          {(["traffic", "errors", "speed"] as const).map((group) => (
            <section key={group} className="ops-group">
              <h2 className="ops-group-title">
                {group === "traffic" ? "Traffic" : group === "errors" ? "Errors" : "Speed & Web Vitals"}
              </h2>
              <div className="ops-grid">
                {series.filter((s) => s.group === group).map((s) => (
                  <article key={s.id} className={`ops-card tone-${toneFor(s)}`}>
                    <div className="ops-card-label">{s.label}</div>
                    <div className="ops-card-value">{fmt(s.headline, s.unit)}</div>
                    <div className="ops-card-meta">
                      {s.summary === "sum" ? "total in range" : `latest ${s.stat}`}
                      {s.points.length === 0 && " · no data yet"}
                    </div>
                    <Sparkline points={s.points} tone={toneFor(s)} />
                  </article>
                ))}
              </div>
            </section>
          ))}

          <p className="ops-foot">
            Source: Amplify Hosting (CDN edge) and CloudWatch RUM (real shoppers&apos; browsers). Percentiles are per datapoint; the
            headline shows the most recent one. Open the CloudWatch dashboard for full charts and zoom.
          </p>
        </>
      )}
    </OpsShell>
  );
}
