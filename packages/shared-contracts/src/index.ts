export type MetricType = "counter" | "gauge" | "histogram" | "timer";

export type MetricSample = {
  id?: string;
  name: string;
  type: MetricType;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp: number;
};

export type AlarmSeverity = "info" | "warning" | "critical";

export type AlarmRule = {
  id: string;
  name: string;
  metric: string;
  comparison: "gt" | "gte" | "lt" | "lte";
  threshold: number;
  severity: AlarmSeverity;
  description?: string;
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
};
