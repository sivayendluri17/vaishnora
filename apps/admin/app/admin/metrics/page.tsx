import Link from "next/link";
import { requireAdmin } from "@/lib/guard";
import {
  RANGES,
  describeError,
  fetchAlarms,
  fetchSeries,
  isConfigured,
  parseRange,
  type MetricsWindow,
  type RangeKey,
  type Series,
} from "@vaishnora/core/cloudwatch";
import OpsShell, { OpsNotice } from "@/components/ops/OpsShell";
import MetricChart from "@/components/ops/MetricChart";
import LiveControls from "@/components/ops/LiveControls";
import { formatValue, type ChartThreshold } from "@/components/ops/chart-format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Metrics — Vaishnora Admin" };

// Google's Core Web Vitals bands, drawn as reference lines on the chart.
const THRESHOLDS: Record<string, ChartThreshold[]> = {
  lcp_p75: [{ value: 2500, label: "good, under 2.5 s" }, { value: 4000, label: "poor, over 4 s" }],
  cls_p75: [{ value: 0.1, label: "good, under 0.1" }, { value: 0.25, label: "poor, over 0.25" }],
};

type Status = { tone: "good" | "warn" | "bad"; label: string };

// A status is stated in words with a marker, never by colouring the number alone.
function statusFor(s: Series): Status | null {
  if (s.headline == null) return null;
  const band = THRESHOLDS[s.id];
  if (band) {
    if (s.headline > band[1].value) return { tone: "bad", label: "Poor" };
    if (s.headline > band[0].value) return { tone: "warn", label: "Needs work" };
    return { tone: "good", label: "Good" };
  }
  if (s.id === "e5xx" || s.id === "jserr" || s.id === "httperr") {
    return s.headline > 0 ? { tone: "warn", label: "Errors seen" } : { tone: "good", label: "None" };
  }
  return null;
}

/** Length of one datapoint in words: "5 minutes", "1 hour", "6 hours". */
function bucketLabel(periodMs: number): string {
  const min = Math.round(periodMs / 60_000);
  if (min < 60) return `${min} minutes`;
  const h = min / 60;
  return h === 1 ? "1 hour" : `${h} hours`;
}

export default async function MetricsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireAdmin("/admin/metrics");

  const range: RangeKey = parseRange((await searchParams).range);
  const cfg = isConfigured();

  let data: MetricsWindow | null = null;
  let alarmCount = { alarm: 0, total: 0 };
  let error: string | null = null;
  if (cfg.ok) {
    try {
      const [d, alarms] = await Promise.all([fetchSeries(range), fetchAlarms().catch(() => [])]);
      data = d;
      alarmCount = { alarm: alarms.filter((a) => a.state === "ALARM").length, total: alarms.length };
    } catch (e) {
      error = describeError(e);
    }
  }

  const series = data?.series ?? [];
  const requests = series.find((s) => s.id === "requests")?.headline ?? 0;
  const e5xx = series.find((s) => s.id === "e5xx")?.headline ?? 0;
  const errorRate = requests > 0 ? (e5xx / requests) * 100 : 0;

  // One control row above everything it scopes: every chart shares this range.
  const controls = (
    <LiveControls
      fetchedAt={data?.endMs ?? Date.now()}
      ranges={(Object.keys(RANGES) as RangeKey[]).map((k) => ({ key: k, label: RANGES[k].label }))}
      activeRange={range}
      basePath="/admin/metrics"
    />
  );

  return (
    <OpsShell active="metrics" title="Metrics" subtitle={`Live from CloudWatch · last ${RANGES[range].label} · times in your local time zone`} right={controls}>
      {!cfg.ok && (
        <OpsNotice tone="warn">
          Monitoring is not configured on this deployment. Set <code>{cfg.missing.join("</code> and <code>")}</code> in the Amplify environment
          variables (they are the same values you gave the CloudFormation stack), then redeploy. Setup steps: <code>infra/observability/README.md</code>.
        </OpsNotice>
      )}
      {error && <OpsNotice tone="error">{error}</OpsNotice>}

      {data && !error && (
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
              <div className="chart-grid-cards">
                {series.filter((s) => s.group === group).map((s) => {
                  const status = statusFor(s);
                  const isSum = s.summary === "sum";
                  return (
                    <article key={s.id} className="chart-card">
                      <header className="chart-card-head">
                        <h3 className="chart-card-title">{s.label}</h3>
                        {status && <span className={`chart-status is-${status.tone}`}>{status.label}</span>}
                      </header>
                      <p className="chart-card-figure">
                        <span className="chart-card-value">{s.headline == null ? "—" : formatValue(s.headline, s.unit)}</span>
                        <span className="chart-card-meta">{isSum ? `total, last ${RANGES[range].label}` : `latest ${s.stat}`}</span>
                      </p>
                      <MetricChart
                        title={s.label}
                        points={s.points}
                        unit={s.unit}
                        startMs={data.startMs}
                        endMs={data.endMs}
                        periodMs={data.periodMs}
                        pointLabel={isSum ? `in ${bucketLabel(data.periodMs)}` : `${s.stat} over ${bucketLabel(data.periodMs)}`}
                        thresholds={THRESHOLDS[s.id]}
                        fill={isSum}
                      />
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          <p className="ops-foot">
            Each point covers {bucketLabel(data.periodMs)}. The number above the line marks the highest point in the range;
            hover a chart, or focus it and use the arrow keys, to read any point. Source: Amplify Hosting (CDN edge) and CloudWatch RUM (real
            shoppers&apos; browsers).
          </p>
        </>
      )}
    </OpsShell>
  );
}
