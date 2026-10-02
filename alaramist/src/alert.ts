import type { AlarmRule, MetricSample, TriggeredAlarm } from "./types";

function compareValue(value: number, comparison: AlarmRule["comparison"], threshold: number): boolean {
  switch (comparison) {
    case "gt":
      return value > threshold;
    case "gte":
      return value >= threshold;
    case "lt":
      return value < threshold;
    case "lte":
      return value <= threshold;
    default:
      return false;
  }
}

export class Alarmist {
  private readonly rules: AlarmRule[];

  constructor(rules: AlarmRule[] = []) {
    this.rules = rules;
  }

  registerRule(rule: AlarmRule): void {
    this.rules.push(rule);
  }

  evaluate(samples: MetricSample[], now = Date.now()): TriggeredAlarm[] {
    const triggered: TriggeredAlarm[] = [];

    for (const rule of this.rules) {
      const sample = samples.find((item) => item.name === rule.metric);
      if (!sample) {
        continue;
      }

      const sampleValue = Number(sample.value);
      if (!Number.isFinite(sampleValue)) {
        continue;
      }

      if (!compareValue(sampleValue, rule.comparison, rule.threshold)) {
        continue;
      }

      const message = `${rule.name}: ${rule.metric} is ${sampleValue}${sample.unit ?? ""}, threshold ${rule.comparison} ${rule.threshold}${sample.unit ?? ""}`;

      triggered.push({
        ruleName: rule.name,
        metric: rule.metric,
        value: sampleValue,
        threshold: rule.threshold,
        severity: rule.severity,
        timestamp: sample.timestamp ?? now,
        message,
      });
    }

    return triggered;
  }
}

export function createAlertRule(rule: AlarmRule): AlarmRule {
  return rule;
}
