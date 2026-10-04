// Lambda entrypoint: scheduled evaluator (EventBridge rate(5 minutes)).
// Reads one aggregated value per rule from CloudWatch, evaluates the rules,
// and publishes breaches to the SEV2 / SEV3 SNS topics.
//
// Env: METRICS_NAMESPACE (default Vaishnora/App), SEV2_TOPIC_ARN, SEV3_TOPIC_ARN,
//      ALARM_RULES (optional JSON array of AlarmRule; replaces the built-in defaults).
//
// Known gap: this is stateless, so a rule that keeps breaching re-notifies on
// every run. Add a DynamoDB state table keyed by ruleId before using it for
// anything noisy, or prefer native CloudWatch alarms for infrastructure signals.

import type { AlarmRule } from "@vaishnora/shared-contracts";
import { Alarmist } from "./alarmist.js";
import { ConsoleNotifier, SnsNotifier, type AlarmNotifier } from "./notifier.js";
import { defaultRules, parseRules } from "./rules.js";
import { CloudWatchMetricSource, type MetricSource } from "./sources.js";

const NAMESPACE = process.env.METRICS_NAMESPACE || "Vaishnora/App";

export function loadRules(env: NodeJS.ProcessEnv = process.env): AlarmRule[] {
  return env.ALARM_RULES ? parseRules(env.ALARM_RULES) : defaultRules;
}

function defaultNotifier(): AlarmNotifier {
  const sev2 = process.env.SEV2_TOPIC_ARN;
  const sev3 = process.env.SEV3_TOPIC_ARN;
  if (sev2 && sev3) return new SnsNotifier({ SEV2: sev2, SEV3: sev3 });
  console.warn("[alarmist] SEV2_TOPIC_ARN / SEV3_TOPIC_ARN not set; logging alarms instead of publishing");
  return new ConsoleNotifier();
}

export type RunResult = { evaluated: number; sampled: number; triggered: number; alarms: string[] };

/** Core run, injectable for tests. */
export async function run(source: MetricSource, notifier: AlarmNotifier, rules: AlarmRule[], now = Date.now()): Promise<RunResult> {
  const samples = await source.fetch(rules, now);
  const triggered = new Alarmist(rules).evaluate(samples, now);
  if (triggered.length) await notifier.notify(triggered);
  return { evaluated: rules.length, sampled: samples.length, triggered: triggered.length, alarms: triggered.map((a) => a.name) };
}

export async function handler(): Promise<RunResult> {
  const result = await run(new CloudWatchMetricSource({ namespace: NAMESPACE }), defaultNotifier(), loadRules());
  console.log(JSON.stringify({ alarmist: result }));
  return result;
}
