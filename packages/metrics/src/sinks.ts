import { CloudWatchClient, PutMetricDataCommand, type MetricDatum, type StandardUnit } from "@aws-sdk/client-cloudwatch";
import type { MetricSample, MetricUnit } from "@vaishnora/shared-contracts";

/** Where recorded samples end up. Implement this to add another backend. */
export interface MetricSink {
  write(samples: MetricSample[]): Promise<void>;
}

/** Keeps samples in memory. Useful for tests and local inspection. */
export class MemorySink implements MetricSink {
  readonly samples: MetricSample[] = [];
  async write(samples: MetricSample[]): Promise<void> {
    this.samples.push(...samples);
  }
}

/** Prints one JSON line per sample; handy in local dev and CloudWatch Logs. */
export class ConsoleSink implements MetricSink {
  async write(samples: MetricSample[]): Promise<void> {
    for (const s of samples) console.log(JSON.stringify({ metric: s }));
  }
}

const UNIT_FOR_TYPE: Record<MetricSample["type"], MetricUnit> = {
  counter: "Count",
  gauge: "None",
  histogram: "None",
  timer: "Milliseconds",
};

// CloudWatch limits: 1000 datapoints per PutMetricData call; chunk conservatively.
const CHUNK = 500;
const MAX_DIMENSIONS = 30;

function toDatum(s: MetricSample): MetricDatum {
  const tags = Object.entries(s.tags ?? {}).slice(0, MAX_DIMENSIONS);
  return {
    MetricName: s.name,
    Value: s.value,
    Unit: (s.unit ?? UNIT_FOR_TYPE[s.type]) as StandardUnit,
    Timestamp: new Date(s.timestamp),
    Dimensions: tags.length ? tags.map(([Name, Value]) => ({ Name, Value })) : undefined,
    StorageResolution: 60,
  };
}

/**
 * Publishes samples to a CloudWatch custom namespace. Each sample becomes one
 * datapoint; CloudWatch aggregates them per minute. Tags become dimensions, so
 * keep them low-cardinality (each unique tag set is a separate billable metric).
 */
export class CloudWatchSink implements MetricSink {
  constructor(
    private readonly namespace: string,
    private readonly client: CloudWatchClient = new CloudWatchClient({})
  ) {}

  async write(samples: MetricSample[]): Promise<void> {
    for (let i = 0; i < samples.length; i += CHUNK) {
      const MetricData = samples.slice(i, i + CHUNK).map(toDatum);
      await this.client.send(new PutMetricDataCommand({ Namespace: this.namespace, MetricData }));
    }
  }
}
