// Shared contracts between the metrics package (produces samples) and the
// alarmist package (evaluates rules against samples). Keep this file free of
// runtime dependencies so both packages can ship it inside a Lambda bundle.

// ---------------------------------------------------------------- metrics
export type MetricType = "counter" | "gauge" | "histogram" | "timer";

/** Subset of CloudWatch StandardUnit values the metrics package knows how to map. */
export type MetricUnit = "Count" | "Milliseconds" | "Seconds" | "Bytes" | "Percent" | "None";

export type MetricSample = {
  id?: string;
  name: string;
  type: MetricType;
  value: number;
  unit?: MetricUnit;
  /** Becomes CloudWatch dimensions. Keep cardinality low (no user ids, no URLs). */
  tags?: Record<string, string>;
  /** Epoch milliseconds. */
  timestamp: number;
};

// ---------------------------------------------------------------- alarms
export type AlarmSeverity = "info" | "warning" | "critical";

/** Operational severity bands used for routing notifications. */
export type SevLevel = "SEV2" | "SEV3";

export const SEVERITY_TO_SEV: Record<AlarmSeverity, SevLevel> = {
  critical: "SEV2",
  warning: "SEV3",
  info: "SEV3",
};

export type Comparison = "gt" | "gte" | "lt" | "lte";

export type MetricStatistic = "Sum" | "Average" | "Minimum" | "Maximum" | "SampleCount" | `p${number}`;

export type AlarmRule = {
  id: string;
  name: string;
  /** Metric name, e.g. "checkout.failure". */
  metric: string;
  comparison: Comparison;
  threshold: number;
  severity: AlarmSeverity;
  description?: string;
  /** CloudWatch namespace override; defaults to the evaluator's namespace. */
  namespace?: string;
  /** Only samples whose tags include all of these are considered. */
  dimensions?: Record<string, string>;
  /** How to reduce the window to one value when reading from CloudWatch. Default Sum for counters, Average otherwise. */
  statistic?: MetricStatistic;
  /** Look-back window in ms. Default 5 minutes. */
  windowMs?: number;
};

export type TriggeredAlarm = {
  id: string;
  ruleId: string;
  name: string;
  metric: string;
  value: number;
  threshold: number;
  severity: AlarmSeverity;
  timestamp: number;
  status: "active" | "resolved";
  message?: string;
};
