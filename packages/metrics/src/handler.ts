// Lambda entrypoint: HTTP ingest for metric samples.
// Works behind a Lambda Function URL or API Gateway HTTP API (payload v2).
//
//   POST /            Authorization: Bearer <INGEST_TOKEN>
//   { "samples": [ { "name": "checkout.failure", "type": "counter", "value": 1, "tags": { "reason": "payment" } } ] }
//
// Env: METRICS_NAMESPACE (default Vaishnora/App), INGEST_TOKEN (required), MAX_SAMPLES (default 500).

import { CloudWatchSink, type MetricSink } from "./sinks.js";
import { parseSamples } from "./metrics.js";

type HttpEvent = {
  body?: string;
  isBase64Encoded?: boolean;
  headers?: Record<string, string | undefined>;
  requestContext?: { http?: { method?: string } };
};
type HttpResult = { statusCode: number; headers: Record<string, string>; body: string };

const NAMESPACE = process.env.METRICS_NAMESPACE || "Vaishnora/App";
const TOKEN = process.env.INGEST_TOKEN || "";
const MAX_SAMPLES = Number(process.env.MAX_SAMPLES || 500);

let sink: MetricSink | undefined;
export function setSink(s: MetricSink): void {
  sink = s; // test hook
}
function getSink(): MetricSink {
  return (sink ??= new CloudWatchSink(NAMESPACE));
}

function json(statusCode: number, payload: unknown): HttpResult {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) };
}

function header(event: HttpEvent, name: string): string | undefined {
  const h = event.headers ?? {};
  const key = Object.keys(h).find((k) => k.toLowerCase() === name);
  return key ? h[key] : undefined;
}

export async function handler(event: HttpEvent): Promise<HttpResult> {
  const method = event.requestContext?.http?.method ?? "POST";
  if (method !== "POST") return json(405, { error: "POST only" });

  if (!TOKEN) return json(503, { error: "INGEST_TOKEN is not configured on this function" });
  const auth = header(event, "authorization") ?? "";
  if (auth !== `Bearer ${TOKEN}`) return json(401, { error: "unauthorized" });

  let parsed: unknown;
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body ?? "", "base64").toString("utf8") : (event.body ?? "");
    parsed = JSON.parse(raw);
  } catch {
    return json(400, { error: "body must be JSON" });
  }

  const { samples, rejected } = parseSamples(parsed);
  if (samples.length === 0) return json(400, { error: "no valid samples", rejected });
  if (samples.length > MAX_SAMPLES) return json(413, { error: `at most ${MAX_SAMPLES} samples per request` });

  await getSink().write(samples);
  return json(202, { accepted: samples.length, rejected, namespace: NAMESPACE });
}
