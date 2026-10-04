import type { AlarmRule } from "@vaishnora/shared-contracts";
import { defineRule } from "./alarmist.js";

/**
 * Default rule set for custom application metrics emitted via @vaishnora/metrics
 * into the Vaishnora/App namespace. Override at deploy time with the ALARM_RULES
 * env var (JSON array of AlarmRule) without rebuilding.
 *
 * Infrastructure-level alarms (5xx rate, uptime, Web Vitals) are NOT here: they
 * are native CloudWatch alarms in infra/observability/.
 */
export const defaultRules: AlarmRule[] = [
  defineRule({
    id: "checkout-failures",
    name: "Checkout failures",
    metric: "checkout.failure",
    comparison: "gte",
    threshold: 3,
    severity: "critical",
    statistic: "Sum",
    windowMs: 5 * 60 * 1000,
    description: "Three or more failed checkouts in 5 minutes.",
  }),
  defineRule({
    id: "order-api-slow",
    name: "Order API slow",
    metric: "api.latency.ms",
    dimensions: { route: "/api/orders" },
    comparison: "gt",
    threshold: 2000,
    severity: "warning",
    statistic: "p95",
    windowMs: 15 * 60 * 1000,
    description: "p95 latency of order placement above 2 s over 15 minutes.",
  }),
  defineRule({
    id: "password-reset-storm",
    name: "Password reset storm",
    metric: "auth.reset_code.sent",
    comparison: "gt",
    threshold: 50,
    severity: "warning",
    statistic: "Sum",
    windowMs: 15 * 60 * 1000,
    description: "Unusual volume of reset codes; possible abuse of SES/SNS spend.",
  }),
];

/** Parses ALARM_RULES JSON; throws with a readable message when malformed. */
export function parseRules(json: string): AlarmRule[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("ALARM_RULES is not valid JSON");
  }
  if (!Array.isArray(parsed)) throw new Error("ALARM_RULES must be a JSON array");
  return parsed.map((r, i) => {
    const o = r as Partial<AlarmRule>;
    if (!o || typeof o.id !== "string" || typeof o.name !== "string" || typeof o.metric !== "string") {
      throw new Error(`ALARM_RULES[${i}] needs id, name and metric`);
    }
    if (!["gt", "gte", "lt", "lte"].includes(o.comparison as string)) throw new Error(`ALARM_RULES[${i}].comparison invalid`);
    if (typeof o.threshold !== "number") throw new Error(`ALARM_RULES[${i}].threshold must be a number`);
    if (!["info", "warning", "critical"].includes(o.severity as string)) throw new Error(`ALARM_RULES[${i}].severity invalid`);
    return o as AlarmRule;
  });
}
