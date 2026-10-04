import type { AlarmRule, Comparison, MetricSample, TriggeredAlarm } from "@vaishnora/shared-contracts";

function compare(value: number, comparison: Comparison, threshold: number): boolean {
  switch (comparison) {
    case "gt": return value > threshold;
    case "gte": return value >= threshold;
    case "lt": return value < threshold;
    case "lte": return value <= threshold;
    default: return false;
  }
}

const SYMBOL: Record<Comparison, string> = { gt: ">", gte: ">=", lt: "<", lte: "<=" };

/** True when every rule dimension is present with the same value in the sample tags. */
function matchesDimensions(rule: AlarmRule, sample: MetricSample): boolean {
  if (!rule.dimensions) return true;
  const tags = sample.tags ?? {};
  return Object.entries(rule.dimensions).every(([k, v]) => tags[k] === v);
}

/**
 * Pure rule evaluator: no I/O, no AWS. Feed it samples from any source
 * (CloudWatch, the metrics ingest, a test) and it tells you which rules breach.
 */
export class Alarmist {
  private readonly rules: AlarmRule[];

  constructor(rules: AlarmRule[] = []) {
    this.rules = [...rules];
  }

  registerRule(rule: AlarmRule): void {
    this.rules.push(rule);
  }

  listRules(): readonly AlarmRule[] {
    return this.rules;
  }

  /** Evaluates each rule against the LATEST matching sample. */
  evaluate(samples: MetricSample[], now = Date.now()): TriggeredAlarm[] {
    const triggered: TriggeredAlarm[] = [];

    for (const rule of this.rules) {
      const sample = samples
        .filter((s) => s.name === rule.metric && matchesDimensions(rule, s))
        .reduce<MetricSample | undefined>((latest, s) => (!latest || s.timestamp > latest.timestamp ? s : latest), undefined);
      if (!sample) continue;

      const value = Number(sample.value);
      if (!Number.isFinite(value) || !compare(value, rule.comparison, rule.threshold)) continue;

      const unit = sample.unit && sample.unit !== "None" && sample.unit !== "Count" ? ` ${sample.unit}` : "";
      const timestamp = sample.timestamp ?? now;
      triggered.push({
        id: `${rule.id}:${timestamp}`,
        ruleId: rule.id,
        name: rule.name,
        metric: rule.metric,
        value,
        threshold: rule.threshold,
        severity: rule.severity,
        timestamp,
        status: "active",
        message: `${rule.name}: ${rule.metric} is ${value}${unit}, threshold ${SYMBOL[rule.comparison]} ${rule.threshold}${unit}`,
      });
    }

    return triggered;
  }
}

/** Identity helper that gives rule literals type-checking and autocomplete. */
export function defineRule(rule: AlarmRule): AlarmRule {
  return rule;
}
