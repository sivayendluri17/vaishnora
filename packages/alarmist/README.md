# @vaishnora/alarmist

Evaluates alarm rules against metric samples and routes breaches to SEV2 / SEV3
SNS topics. Self-contained: builds, tests and bundles on its own, and ships a
scheduled Lambda evaluator with a starter CloudFormation template in `infra/`.

Shares its types with `@vaishnora/metrics` through `@vaishnora/shared-contracts`.
Nothing in the storefront imports this package; changing it never redeploys the site.

## Where it fits

| Signal | Alarmed by |
|---|---|
| Infrastructure: 5xx rate, uptime, Web Vitals, CDN latency | Native CloudWatch alarms in `infra/observability/` (no code) |
| Application: checkout failures, order API p95, reset-code storms | **This package**, over custom metrics emitted by `@vaishnora/metrics` |

Severity mapping: `critical → SEV2` (email + SMS), `warning` / `info → SEV3` (email).

## Library

```ts
import { Alarmist, defineRule } from "@vaishnora/alarmist";

const alarmist = new Alarmist([
  defineRule({ id: "checkout-failures", name: "Checkout failures", metric: "checkout.failure",
               comparison: "gte", threshold: 3, severity: "critical" }),
]);

const triggered = alarmist.evaluate([{ name: "checkout.failure", type: "counter", value: 4, timestamp: Date.now() }]);
// -> [{ ruleId: "checkout-failures", severity: "critical", message: "Checkout failures: checkout.failure is 4, threshold >= 3", ... }]
```

The evaluator is pure. `sources.ts` fetches samples (CloudWatch or static) and
`notifier.ts` delivers alarms (SNS or console); swap either without touching rules.

## Rules

Defaults live in `src/rules.ts`. Override at deploy time with the `ALARM_RULES`
env var (JSON array) so thresholds can change without a rebuild. Each rule can
set `namespace`, `dimensions`, `statistic` (`Sum`, `Average`, `p95`...) and `windowMs`.

## Commands

```bash
npm run build  -w packages/alarmist
npm test       -w packages/alarmist
npm run bundle -w packages/alarmist   # -> dist/lambda/handler.mjs
```

## Deploy

1. `npm run bundle -w packages/alarmist`
2. Zip `dist/lambda/handler.mjs` as `handler.zip`, upload to S3.
3. CloudFormation → `infra/template.yaml` with `CodeBucket`, `CodeKey`, `Sev2TopicArn`, `Sev3TopicArn`
   (both ARNs are outputs of the `vaishnora-observability` stack).
4. It runs every 5 minutes (`ScheduleExpression`). Check CloudWatch Logs for `{"alarmist": {...}}` lines.

## Known gap

The evaluator is stateless: a rule that stays breached re-notifies every run.
Before relying on it for noisy signals, add a DynamoDB table keyed by `ruleId`
that records last state and only notifies on transitions (the template header
lists this as the first extension).
