import type { MetricSample, MetricType, MetricUnit } from "@vaishnora/shared-contracts";
import type { MetricSink } from "./sinks.js";

export type MetricsOptions = {
  /** Tags merged into every sample (e.g. { service: "storefront", env: "prod" }). */
  defaultTags?: Record<string, string>;
  /** Flush automatically once this many samples are buffered. Default 100. */
  maxBuffer?: number;
  /** Override for tests. */
  clock?: () => number;
  /** Receives errors from automatic flushes so metrics never throw into app code. */
  onError?: (err: unknown) => void;
};

type RecordInput = Omit<MetricSample, "timestamp" | "tags"> & { timestamp?: number; tags?: Record<string, string> };

/**
 * Buffered metrics recorder. Call counter/gauge/histogram/timer during request
 * handling, then flush() once (end of request, end of Lambda invocation).
 */
export class Metrics {
  private buffer: MetricSample[] = [];
  private readonly maxBuffer: number;
  private readonly clock: () => number;
  private readonly defaultTags: Record<string, string>;
  private readonly onError: (err: unknown) => void;

  constructor(private readonly sink: MetricSink, opts: MetricsOptions = {}) {
    this.maxBuffer = opts.maxBuffer ?? 100;
    this.clock = opts.clock ?? Date.now;
    this.defaultTags = opts.defaultTags ?? {};
    this.onError = opts.onError ?? ((e) => console.error("[metrics] flush failed", e));
  }

  /** Number of samples waiting to be flushed. */
  get pending(): number {
    return this.buffer.length;
  }

  record(input: RecordInput): void {
    const tags = { ...this.defaultTags, ...(input.tags ?? {}) };
    this.buffer.push({
      ...input,
      tags: Object.keys(tags).length ? tags : undefined,
      timestamp: input.timestamp ?? this.clock(),
    });
    if (this.buffer.length >= this.maxBuffer) {
      this.flush().catch(this.onError);
    }
  }

  counter(name: string, value = 1, tags?: Record<string, string>): void {
    this.record({ name, type: "counter", value, unit: "Count", tags });
  }

  gauge(name: string, value: number, tags?: Record<string, string>, unit?: MetricUnit): void {
    this.record({ name, type: "gauge", value, unit, tags });
  }

  histogram(name: string, value: number, tags?: Record<string, string>, unit?: MetricUnit): void {
    this.record({ name, type: "histogram", value, unit, tags });
  }

  timer(name: string, milliseconds: number, tags?: Record<string, string>): void {
    this.record({ name, type: "timer", value: milliseconds, unit: "Milliseconds", tags });
  }

  /** Times an async or sync function and records it as a timer. Rethrows the function's error. */
  async time<T>(name: string, fn: () => Promise<T> | T, tags?: Record<string, string>): Promise<T> {
    const start = this.clock();
    try {
      return await fn();
    } finally {
      this.timer(name, this.clock() - start, tags);
    }
  }

  /** Sends everything buffered to the sink. Returns the number of samples written. */
  async flush(): Promise<number> {
    if (this.buffer.length === 0) return 0;
    const batch = this.buffer;
    this.buffer = [];
    try {
      await this.sink.write(batch);
    } catch (err) {
      // Put them back so a later flush can retry, but cap growth.
      this.buffer = [...batch, ...this.buffer].slice(-this.maxBuffer * 10);
      throw err;
    }
    return batch.length;
  }
}

// ---------------------------------------------------------------- validation
const TYPES: ReadonlySet<string> = new Set<MetricType>(["counter", "gauge", "histogram", "timer"]);
const UNITS: ReadonlySet<string> = new Set<MetricUnit>(["Count", "Milliseconds", "Seconds", "Bytes", "Percent", "None"]);
const NAME_RE = /^[A-Za-z][A-Za-z0-9._\-/]{0,254}$/;
const MAX_TAGS = 30;
const MAX_SKEW_MS = 14 * 24 * 60 * 60 * 1000; // CloudWatch rejects points older than 2 weeks

/** Validates an untrusted object (e.g. an HTTP body item) into a MetricSample, or returns null. */
export function validateSample(input: unknown, now = Date.now()): MetricSample | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  if (typeof o.name !== "string" || !NAME_RE.test(o.name)) return null;
  if (typeof o.type !== "string" || !TYPES.has(o.type)) return null;
  if (typeof o.value !== "number" || !Number.isFinite(o.value)) return null;
  if (o.unit !== undefined && (typeof o.unit !== "string" || !UNITS.has(o.unit))) return null;

  let timestamp = now;
  if (o.timestamp !== undefined) {
    if (typeof o.timestamp !== "number" || !Number.isFinite(o.timestamp)) return null;
    if (Math.abs(now - o.timestamp) > MAX_SKEW_MS) return null;
    timestamp = o.timestamp;
  }

  let tags: Record<string, string> | undefined;
  if (o.tags !== undefined) {
    if (!o.tags || typeof o.tags !== "object" || Array.isArray(o.tags)) return null;
    const entries = Object.entries(o.tags as Record<string, unknown>);
    if (entries.length > MAX_TAGS) return null;
    tags = {};
    for (const [k, v] of entries) {
      if (typeof v !== "string" || !k || k.length > 255 || v.length === 0 || v.length > 1024) return null;
      tags[k] = v;
    }
  }

  return {
    name: o.name,
    type: o.type as MetricType,
    value: o.value,
    unit: o.unit as MetricUnit | undefined,
    tags,
    timestamp,
    ...(typeof o.id === "string" ? { id: o.id } : {}),
  };
}

/** Accepts `{ samples: [...] }`, a bare array, or a single sample. */
export function parseSamples(body: unknown, now = Date.now()): { samples: MetricSample[]; rejected: number } {
  const list: unknown[] = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { samples?: unknown }).samples)
      ? ((body as { samples: unknown[] }).samples)
      : [body];
  const samples: MetricSample[] = [];
  let rejected = 0;
  for (const item of list) {
    const s = validateSample(item, now);
    if (s) samples.push(s);
    else rejected++;
  }
  return { samples, rejected };
}
