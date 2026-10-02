export type AlarmSeverity = "info" | "warning" | "critical";

export type MetricSample = {
  name: string;
  value: number;
  unit?: string;
  timestamp?: number;
  tags?: Record<string, string>;
};

export type AlarmRule = {
  name: string;
  metric: string;
  comparison: "gt" | "gte" | "lt" | "lte";
  threshold: number;
  severity: AlarmSeverity;
  description?: string;
  windowMs?: number;
};

export type TriggeredAlarm = {
  ruleName: string;
  metric: string;
  value: number;
  threshold: number;
  severity: AlarmSeverity;
  timestamp: number;
  message: string;
};
