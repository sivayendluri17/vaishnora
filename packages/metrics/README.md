# @vaishnora/metrics

Record application metrics (counters, gauges, histograms, timers) and publish
them to a CloudWatch custom namespace. Self-contained: builds, tests and
bundles on its own, and ships a Lambda ingest endpoint with a starter
CloudFormation template in `infra/`.

Shares its types with `@vaishnora/alarmist` through `@vaishnora/shared-contracts`.

## Use as a library

```ts
import { Metrics, CloudWatchSink } from "@vaishnora/metrics";

const metrics = new Metrics(new CloudWatchSink("Vaishnora/App"), {
  defaultTags: { service: "storefront", env: "prod" },
});

metrics.counter("checkout.failure", 1, { reason: "payment" });
metrics.gauge("cart.size", 3);
const order = await metrics.time("db.create_order", () => createOrder(input));
await metrics.flush(); // end of request / end of Lambda invocation
```

Sinks: `CloudWatchSink` (prod), `ConsoleSink` (local dev, logs), `MemorySink` (tests).
Tags become CloudWatch dimensions. Keep them low-cardinality: never put user ids,
order ids or URLs in tags, each unique combination is a separately billed metric.

## Use as a service (Lambda ingest)

Clients that cannot call CloudWatch directly POST samples to the ingest URL:

```http
POST https://<function-url>/
Authorization: Bearer <INGEST_TOKEN>
Content-Type: application/json

{ "samples": [
  { "name": "checkout.failure", "type": "counter", "value": 1, "tags": { "reason": "payment" } },
  { "name": "api.latency.ms", "type": "timer", "value": 184, "tags": { "route": "/api/orders" } }
] }
```

Responses: `202 {accepted, rejected}`, `400` bad JSON or no valid samples,
`401` bad token, `413` too many samples, `503` token not configured.

## Commands

```bash
npm run build   -w packages/metrics   # tsc -> dist/
npm test        -w packages/metrics   # node:test on dist/test
npm run bundle  -w packages/metrics   # esbuild -> dist/lambda/handler.mjs (AWS SDK left external; Lambda provides it)
```

## Deploy

1. `npm run bundle -w packages/metrics`
2. Zip `dist/lambda/handler.mjs` as `handler.zip` and upload to an S3 bucket.
   PowerShell: `Compress-Archive packages/metrics/dist/lambda/handler.mjs handler.zip`
3. CloudFormation → create stack from `infra/template.yaml` with `CodeBucket`, `CodeKey`, `IngestToken`.
4. The `IngestEndpoint` output is the URL to POST to.

Env vars read by the handler: `METRICS_NAMESPACE`, `INGEST_TOKEN`, `MAX_SAMPLES`.
