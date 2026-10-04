// Read-only CloudWatch access for the admin monitoring pages
// (/admin/metrics and /admin/alarms). The alarms themselves live in CloudWatch
// (see infra/observability/) so they keep firing even when this app is down;
// these helpers only READ what CloudWatch already has.
//
// Env: AWS_REGION, AMPLIFY_APP_ID, RUM_APP_MONITOR_NAME, CW_ALARM_PREFIX (optional).
// IAM: attach the vaishnora-observability-read managed policy (created by the
// CloudFormation stack) to the Amplify compute role and the local-dev IAM user.

import {
  CloudWatchClient,
  DescribeAlarmsCommand,
  GetMetricDataCommand,
  type MetricDataQuery,
} from "@aws-sdk/client-cloudwatch";

export const REGION = process.env.AWS_REGION || "us-west-2";
const AMPLIFY_APP_ID = process.env.AMPLIFY_APP_ID || "";
const RUM_APP = process.env.RUM_APP_MONITOR_NAME || "";
export const ALARM_PREFIX = process.env.CW_ALARM_PREFIX || "vaishnora-";

const credentials =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
    : undefined;

const cw = new CloudWatchClient({ region: REGION, ...(credentials ? { credentials } : {}) });

export function isConfigured(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!AMPLIFY_APP_ID) missing.push("AMPLIFY_APP_ID");
  if (!RUM_APP) missing.push("RUM_APP_MONITOR_NAME");
  return { ok: missing.length === 0, missing };
}

// ---------------------------------------------------------------- ranges
const HOUR = 60 * 60 * 1000;
// `period` is the size of each datapoint in seconds (must be a multiple of 60).
// Chosen so every range draws roughly 12 to 48 points on the sparklines.
export const RANGES = {
  "1h": { label: "1 hour", ms: 1 * HOUR, period: 300 },
  "5h": { label: "5 hours", ms: 5 * HOUR, period: 900 },
  "8h": { label: "8 hours", ms: 8 * HOUR, period: 1200 },
  "1d": { label: "1 day", ms: 24 * HOUR, period: 1800 },
  "7d": { label: "7 days", ms: 7 * 24 * HOUR, period: 6 * 3600 },
} as const satisfies Record<string, { label: string; ms: number; period: number }>;
export type RangeKey = keyof typeof RANGES;
export const DEFAULT_RANGE: RangeKey = "1d";

export function parseRange(v: string | undefined): RangeKey {
  if (v === "24h") return "1d"; // old bookmarks
  return v && v in RANGES ? (v as RangeKey) : DEFAULT_RANGE;
}

// ---------------------------------------------------------------- series
export type SeriesDef = {
  id: string;
  label: string;
  namespace: "AWS/AmplifyHosting" | "AWS/RUM";
  metric: string;
  stat: string; // Sum | p50 | p75 | p95 ...
  unit: "count" | "ms" | "score";
  group: "traffic" | "errors" | "speed";
  // How to summarise the window into one headline number.
  summary: "sum" | "latest" | "max";
  // Multiply raw CloudWatch values by this before display. Amplify Hosting reports
  // Latency in SECONDS, while the UI and RUM metrics use milliseconds.
  scale?: number;
};

export const SERIES: SeriesDef[] = [
  { id: "requests", label: "CDN requests", namespace: "AWS/AmplifyHosting", metric: "Requests", stat: "Sum", unit: "count", group: "traffic", summary: "sum" },
  { id: "sessions", label: "Shopper sessions", namespace: "AWS/RUM", metric: "SessionCount", stat: "Sum", unit: "count", group: "traffic", summary: "sum" },
  { id: "e5xx", label: "5xx responses", namespace: "AWS/AmplifyHosting", metric: "5xxErrors", stat: "Sum", unit: "count", group: "errors", summary: "sum" },
  { id: "e4xx", label: "4xx responses", namespace: "AWS/AmplifyHosting", metric: "4xxErrors", stat: "Sum", unit: "count", group: "errors", summary: "sum" },
  { id: "jserr", label: "JavaScript errors", namespace: "AWS/RUM", metric: "JsErrorCount", stat: "Sum", unit: "count", group: "errors", summary: "sum" },
  { id: "httperr", label: "Browser HTTP errors", namespace: "AWS/RUM", metric: "HttpErrorCount", stat: "Sum", unit: "count", group: "errors", summary: "sum" },
  { id: "ttfb_p95", label: "CDN time-to-first-byte p95", namespace: "AWS/AmplifyHosting", metric: "Latency", stat: "p95", unit: "ms", group: "speed", summary: "latest", scale: 1000 },
  { id: "lcp_p75", label: "Largest Contentful Paint p75", namespace: "AWS/RUM", metric: "WebVitalsLargestContentfulPaint", stat: "p75", unit: "ms", group: "speed", summary: "latest" },
  { id: "pageload_p75", label: "Page load p75", namespace: "AWS/RUM", metric: "PerformanceNavigationDuration", stat: "p75", unit: "ms", group: "speed", summary: "latest" },
  { id: "cls_p75", label: "Cumulative Layout Shift p75", namespace: "AWS/RUM", metric: "WebVitalsCumulativeLayoutShift", stat: "p75", unit: "score", group: "speed", summary: "latest" },
];

export type Point = { t: number; v: number };
export type Series = SeriesDef & { points: Point[]; headline: number | null };
/** One fetch of every series, plus the window it covers so charts share one time axis. */
export type MetricsWindow = { series: Series[]; startMs: number; endMs: number; periodMs: number };

function dimensionsFor(ns: SeriesDef["namespace"]) {
  return ns === "AWS/AmplifyHosting"
    ? [{ Name: "App", Value: AMPLIFY_APP_ID }]
    : [{ Name: "application_name", Value: RUM_APP }];
}

// CloudWatch omits periods in which nothing was recorded. For a count that means
// zero, so fill those buckets: otherwise a spike is drawn as a slope between two
// distant points instead of a peak that rises from and returns to the baseline.
function zeroFill(points: Point[], startMs: number, endMs: number, periodMs: number): Point[] {
  const have = new Map(points.map((p) => [p.t, p.v]));
  const anchor = points[0]?.t ?? startMs;
  const first = anchor - Math.floor((anchor - startMs) / periodMs) * periodMs;
  const out: Point[] = [];
  for (let t = first; t < endMs; t += periodMs) out.push({ t, v: have.get(t) ?? 0 });
  return out;
}

export async function fetchSeries(range: RangeKey): Promise<MetricsWindow> {
  const { ms, period } = RANGES[range];
  const periodMs = period * 1000;
  const endMs = Date.now();
  // Start on a period boundary so buckets line up with CloudWatch's own.
  const startMs = Math.floor((endMs - ms) / periodMs) * periodMs;

  const queries: MetricDataQuery[] = SERIES.map((s) => ({
    Id: s.id,
    ReturnData: true,
    MetricStat: {
      Metric: { Namespace: s.namespace, MetricName: s.metric, Dimensions: dimensionsFor(s.namespace) },
      Period: period,
      Stat: s.stat,
    },
  }));

  const res = await cw.send(
    new GetMetricDataCommand({ StartTime: new Date(startMs), EndTime: new Date(endMs), MetricDataQueries: queries, ScanBy: "TimestampAscending" })
  );

  const byId = new Map((res.MetricDataResults ?? []).map((r) => [r.Id!, r]));
  const series = SERIES.map((def): Series => {
    const r = byId.get(def.id);
    const ts = r?.Timestamps ?? [];
    const vals = r?.Values ?? [];
    const scale = def.scale ?? 1;
    const raw: Point[] = ts.map((t, i) => ({ t: new Date(t).getTime(), v: (vals[i] ?? 0) * scale })).sort((x, y) => x.t - y.t);
    const points = def.summary === "sum" ? zeroFill(raw, startMs, endMs, periodMs) : raw;
    let headline: number | null = null;
    if (def.summary === "sum") headline = raw.reduce((acc, p) => acc + p.v, 0); // no datapoints means nothing happened
    else if (raw.length) headline = def.summary === "max" ? Math.max(...raw.map((p) => p.v)) : raw[raw.length - 1].v;
    return { ...def, points, headline };
  });
  return { series, startMs, endMs, periodMs };
}

// ---------------------------------------------------------------- alarms
export type Severity = "SEV2" | "SEV3" | "OTHER";
export type AlarmView = {
  name: string;
  shortName: string;
  severity: Severity;
  state: "ALARM" | "OK" | "INSUFFICIENT_DATA";
  description: string;
  reason: string;
  updatedAt: number | null;
  metric: string;
  threshold: string;
  consoleUrl: string;
};

export function severityOf(name: string): Severity {
  if (/\bSEV2\b/i.test(name)) return "SEV2";
  if (/\bSEV3\b/i.test(name)) return "SEV3";
  return "OTHER";
}

export async function fetchAlarms(): Promise<AlarmView[]> {
  const res = await cw.send(new DescribeAlarmsCommand({ AlarmNamePrefix: ALARM_PREFIX, MaxRecords: 100 }));
  const list = res.MetricAlarms ?? [];
  const order: Record<string, number> = { ALARM: 0, INSUFFICIENT_DATA: 1, OK: 2 };
  return list
    .map((a): AlarmView => {
      const name = a.AlarmName ?? "";
      const metric = a.MetricName ? `${a.Namespace} · ${a.MetricName}` : (a.Metrics?.find((m) => m.ReturnData !== false)?.Label ?? "metric math");
      const cmp = (a.ComparisonOperator ?? "").replace("GreaterThanThreshold", ">").replace("LessThanThreshold", "<")
        .replace("GreaterThanOrEqualToThreshold", ">=").replace("LessThanOrEqualToThreshold", "<=");
      return {
        name,
        shortName: name.replace(ALARM_PREFIX, "").replace(/^SEV[23]-/i, ""),
        severity: severityOf(name),
        state: (a.StateValue as AlarmView["state"]) ?? "INSUFFICIENT_DATA",
        description: a.AlarmDescription ?? "",
        reason: a.StateReason ?? "",
        updatedAt: a.StateUpdatedTimestamp ? new Date(a.StateUpdatedTimestamp).getTime() : null,
        metric,
        threshold: a.Threshold != null ? `${cmp} ${a.Threshold}` : "",
        consoleUrl: `https://${REGION}.console.aws.amazon.com/cloudwatch/home?region=${REGION}#alarmsV2:alarm/${encodeURIComponent(name)}`,
      };
    })
    .sort((x, y) => order[x.state] - order[y.state] || x.severity.localeCompare(y.severity) || x.name.localeCompare(y.name));
}

export const DASHBOARD_URL = `https://${REGION}.console.aws.amazon.com/cloudwatch/home?region=${REGION}#dashboards:name=vaishnora-prod`;
export const ALARMS_CONSOLE_URL = `https://${REGION}.console.aws.amazon.com/cloudwatch/home?region=${REGION}#alarmsV2:?~(search~'${ALARM_PREFIX})`;

// Turn an SDK error into a one-line hint the admin can act on.
export function describeError(err: unknown): string {
  const e = err as { name?: string; message?: string };
  if (e?.name === "AccessDenied" || e?.name === "AccessDeniedException") {
    return "CloudWatch access denied. Attach the vaishnora-observability-read policy (see infra/observability/README.md) to the Amplify compute role, or to the local-dev IAM user when running locally.";
  }
  if (e?.name === "CredentialsProviderError") {
    return "No AWS credentials found. Locally, set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in .env.local.";
  }
  return e?.message || "Unknown error talking to CloudWatch.";
}
