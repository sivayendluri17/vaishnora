import { test } from "node:test";
import assert from "node:assert/strict";
import type { MetricSample, TriggeredAlarm } from "@vaishnora/shared-contracts";
import { Alarmist, StaticSource, defineRule, parseRules, run, formatSubject } from "../src/index.js";

const latency = defineRule({ id: "lat", name: "High latency", metric: "api.latency.ms", comparison: "gt", threshold: 2000, severity: "warning" });
const failures = defineRule({ id: "fail", name: "Checkout failures", metric: "checkout.failure", comparison: "gte", threshold: 3, severity: "critical" });

function sample(name: string, value: number, timestamp = 1000, tags?: Record<string, string>): MetricSample {
  return { name, type: "gauge", value, timestamp, tags, unit: name.endsWith(".ms") ? "Milliseconds" : undefined };
}

test("triggers when the comparison holds and reports a readable message", () => {
  const out = new Alarmist([latency, failures]).evaluate([sample("api.latency.ms", 2600), sample("checkout.failure", 1)]);
  assert.equal(out.length, 1);
  assert.equal(out[0].ruleId, "lat");
  assert.equal(out[0].status, "active");
  assert.equal(out[0].message, "High latency: api.latency.ms is 2600 Milliseconds, threshold > 2000 Milliseconds");
});

test("evaluates against the latest sample when several match", () => {
  const out = new Alarmist([latency]).evaluate([sample("api.latency.ms", 3000, 10), sample("api.latency.ms", 100, 20)]);
  assert.equal(out.length, 0);
});

test("rule dimensions filter samples by tags", () => {
  const rule = defineRule({ ...latency, dimensions: { route: "/api/orders" } });
  const a = new Alarmist([rule]);
  assert.equal(a.evaluate([sample("api.latency.ms", 5000, 1, { route: "/api/cart" })]).length, 0);
  assert.equal(a.evaluate([sample("api.latency.ms", 5000, 1, { route: "/api/orders" })]).length, 1);
});

test("ignores rules with no matching sample and non-finite values", () => {
  const out = new Alarmist([latency]).evaluate([sample("other", 1), sample("api.latency.ms", Number.NaN)]);
  assert.equal(out.length, 0);
});

test("parseRules validates shape and rejects garbage", () => {
  assert.throws(() => parseRules("nope"), /valid JSON/);
  assert.throws(() => parseRules("{}"), /array/);
  assert.throws(() => parseRules(JSON.stringify([{ id: "x", name: "y", metric: "m", comparison: "??", threshold: 1, severity: "info" }])), /comparison/);
  assert.equal(parseRules(JSON.stringify([latency])).length, 1);
});

test("run() wires source -> evaluator -> notifier", async () => {
  const sent: TriggeredAlarm[] = [];
  const notifier = { notify: async (a: TriggeredAlarm[]) => { sent.push(...a); } };
  const result = await run(new StaticSource([sample("checkout.failure", 4)]), notifier, [latency, failures], 5000);
  assert.deepEqual(result, { evaluated: 2, sampled: 1, triggered: 1, alarms: ["Checkout failures"] });
  assert.equal(sent.length, 1);
  assert.equal(formatSubject(sent[0]), "[SEV2] Checkout failures");
});
