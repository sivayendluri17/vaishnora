import { test } from "node:test";
import assert from "node:assert/strict";
import { Metrics, MemorySink, parseSamples, validateSample } from "../src/index.js";
import { handler, setSink } from "../src/handler.js";

test("buffers samples and flushes them to the sink with default tags", async () => {
  const sink = new MemorySink();
  let now = 1_000;
  const m = new Metrics(sink, { defaultTags: { service: "test" }, clock: () => now });

  m.counter("checkout.failure");
  m.counter("checkout.failure", 2, { reason: "payment" });
  now = 1_250;
  m.gauge("cart.size", 3);
  assert.equal(m.pending, 3);
  assert.equal(sink.samples.length, 0);

  const written = await m.flush();
  assert.equal(written, 3);
  assert.equal(m.pending, 0);
  assert.deepEqual(sink.samples[0], { name: "checkout.failure", type: "counter", value: 1, unit: "Count", tags: { service: "test" }, timestamp: 1_000 });
  assert.deepEqual(sink.samples[1].tags, { service: "test", reason: "payment" });
  assert.equal(sink.samples[2].timestamp, 1_250);
});

test("time() records a timer even when the function throws", async () => {
  const sink = new MemorySink();
  let now = 0;
  const m = new Metrics(sink, { clock: () => (now += 40) });
  await assert.rejects(m.time("db.query", () => Promise.reject(new Error("boom"))));
  await m.flush();
  assert.equal(sink.samples.length, 1);
  assert.equal(sink.samples[0].type, "timer");
  assert.equal(sink.samples[0].value, 40);
});

test("auto-flushes when the buffer reaches maxBuffer", async () => {
  const sink = new MemorySink();
  const m = new Metrics(sink, { maxBuffer: 2 });
  m.counter("a");
  m.counter("b");
  await new Promise((r) => setImmediate(r));
  assert.equal(sink.samples.length, 2);
  assert.equal(m.pending, 0);
});

test("flush keeps samples for retry when the sink fails", async () => {
  const failing = { write: async () => { throw new Error("network"); } };
  const m = new Metrics(failing);
  m.counter("a");
  await assert.rejects(m.flush());
  assert.equal(m.pending, 1);
});

test("validateSample rejects malformed input", () => {
  const now = Date.now();
  assert.equal(validateSample(null), null);
  assert.equal(validateSample({ name: "x", type: "nope", value: 1 }), null);
  assert.equal(validateSample({ name: "x", type: "gauge", value: NaN }), null);
  assert.equal(validateSample({ name: "1bad", type: "gauge", value: 1 }), null);
  assert.equal(validateSample({ name: "x", type: "gauge", value: 1, tags: { k: 5 } }), null);
  assert.equal(validateSample({ name: "x", type: "gauge", value: 1, timestamp: now - 30 * 24 * 3600 * 1000 }, now), null);
  const ok = validateSample({ name: "api.latency.ms", type: "timer", value: 120, tags: { route: "/cart" } }, now);
  assert.ok(ok);
  assert.equal(ok.timestamp, now);
  assert.equal(ok.unit, undefined);
});

test("parseSamples accepts an envelope, a bare array, or a single sample", () => {
  const s = { name: "a", type: "counter", value: 1 };
  assert.equal(parseSamples({ samples: [s, s] }).samples.length, 2);
  assert.equal(parseSamples([s, { bad: true }]).rejected, 1);
  assert.equal(parseSamples(s).samples.length, 1);
});

test("handler rejects bad auth and accepts valid batches", async () => {
  process.env.INGEST_TOKEN = "secret"; // handler reads env at import time, so re-import after setting
  const mod = await import(`../src/handler.js?${Math.random()}`);
  const sink = new MemorySink();
  mod.setSink(sink);

  const base = { requestContext: { http: { method: "POST" } } };
  const noAuth = await mod.handler({ ...base, body: "{}" });
  assert.equal(noAuth.statusCode, 401);

  const ok = await mod.handler({
    ...base,
    headers: { Authorization: "Bearer secret" },
    body: JSON.stringify({ samples: [{ name: "orders.placed", type: "counter", value: 1 }, { junk: 1 }] }),
  });
  assert.equal(ok.statusCode, 202);
  assert.deepEqual(JSON.parse(ok.body), { accepted: 1, rejected: 1, namespace: "Vaishnora/App" });
  assert.equal(sink.samples.length, 1);

  const notJson = await mod.handler({ ...base, headers: { authorization: "Bearer secret" }, body: "nope" });
  assert.equal(notJson.statusCode, 400);

  // The statically imported handler had no token at import time -> 503, which is the safe default.
  setSink(sink);
  const unconfigured = await handler({ ...base, body: "{}" });
  assert.equal(unconfigured.statusCode, 503);
});
