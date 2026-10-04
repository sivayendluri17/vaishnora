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
export type RangeKey = "1h" | "24h" | "7d";
export const RANGES: Record<RangeKey, { label: string; ms: number; period: number }> = {
  "1h": { label: "Last hour", ms: 60 * 60 * 1000, period: 300 },
  "24h": { label: "Last 24 hours", ms: 24 * 60 * 60 * 1000, period: 1800 },
  "7d": { label: "Last 7 days", ms: 7 * 24 * 60 * 60 * 1000, period: 6 * 3600 },
};
export function parseRange(v: string | undefined): RangeKey {
  return v === "1h" || v === "7d" ? v : "24h";
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
};

export const SERIES: SeriesDef[] = [
  { id: "requests", label: "CDN requests", namespace: "AWS/AmplifyHosting", metric: "Requests", stat: "Sum", unit: "count", group: "traffic", summary: "sum" },
  { id: "sessions", label: "Shopper sessions", namespace: "AWS/RUM", metric: "SessionCount", stat: "Sum", unit: "count", group: "traffic", summary: "sum" },
  { id: "e5xx", label: "5xx responses", namespace: "AWS/AmplifyHosting", metric: "5xxErrors", stat: "Sum", unit: "count", group: "errors", summary: "sum" },
  { id: "e4xx", label: "4xx responses", namespace: "AWS/AmplifyHosting", metric: "4xxErrors", stat: "Sum", unit: "count", group: "errors", summary: "sum" },
  { id: "jserr", label: "JavaScript errors", namespace: "AWS/RUM", metric: "JsErrorCount", stat: "Sum", unit: "count", group: "errors", summary: "sum" },
  { id: "httperr", label: "Browser HTTP errors", namespace: "AWS/RUM", metric: "HttpErrorCount", stat: "Sum", unit: "count", group: "errors", summary: "sum" },
  { id: "ttfb_p95", label: "CDN time-to-first-byte p95", namespace: "AWS/AmplifyHosting", metric: "Latency", stat: "p95", unit: "ms", group: "speed", summary: "latest" },
  { id: "lcp_p75", label: "Largest Contentful Paint p75", namespace: "AWS/RUM", metric: "WebVitalsLargestContentfulPaint", stat: "p75", unit: "ms", group: "speed", summary: "latest" },
  { id: "pageload_p75", label: "Page load p75", namespace: "AWS/RUM", metric: "PerformanceNavigationDuration", stat: "p75", unit: "ms", group: "speed", summary: "latest" },
  { id: "cls_p75", label: "Cumulative Layout Shift p75", namespace: "AWS/RUM", metric: "WebVitalsCumulativeLayoutShift", stat: "p75", unit: "score", group: "speed", summary: "latest" },
];

export type Point = { t: number; v: number };
export type Series = SeriesDef & { points: Point[]; headline: number | null };

function dimensionsFor(ns: SeriesDef["namespace"]) {
  return ns === "AWS/AmplifyHosting"
    ? [{ Name: "App", Value: AMPLIFY_APP_ID }]
    : [{ Name: "application_name", Value: RUM_APP }];
}

export async function fetchSeries(range: RangeKey): Promise<Series[]> {
  const { ms, period } = RANGES[range];
  const end = new Date();
  const start = new Date(end.getTime() - ms);

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
    new GetMetricDataCommand({ StartTime: start, EndTime: end, MetricDataQueries: queries, ScanBy: "TimestampAscending" })
  );

  const byId = new Map((res.MetricDataResults ?? []).map((r) => [r.Id!, r]));
  return SERIES.map((def) => {
    const r = byId.get(def.id);
    const ts = r?.Timestamps ?? [];
    const vals = r?.Values ?? [];
    const points: Point[] = ts.map((t, i) => ({ t: new Date(t).getTime(), v: vals[i] ?? 0 })).sort((a, b) => a.t - b.t);
    let headline: number | null = null;
    if (points.length) {
      if (def.summary === "sum") headline = points.reduce((a, p) => a + p.v, 0);
      else if (def.summary === "max") headline = Math.max(...points.map((p) => p.v));
      else headline = points[points.length - 1].v;
    } else if (def.summary === "sum") {
      headline = 0; // no datapoints for a Sum means nothing happened, not "unknown"
    }
    return { ...def, points, headline };
  });
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
