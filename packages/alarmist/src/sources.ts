import { CloudWatchClient, GetMetricDataCommand, type MetricDataQuery } from "@aws-sdk/client-cloudwatch";
import type { AlarmRule, MetricSample, MetricStatistic } from "@vaishnora/shared-contracts";

/** Produces the samples a rule set should be evaluated against. */
export interface MetricSource {
  fetch(rules: AlarmRule[], now?: number): Promise<MetricSample[]>;
}

/** Hands back a fixed list; for tests and for evaluating pushed samples directly. */
export class StaticSource implements MetricSource {
  constructor(private readonly samples: MetricSample[]) {}
  async fetch(): Promise<MetricSample[]> {
    return this.samples;
  }
}

export type CloudWatchSourceOptions = {
  /** Namespace used when a rule does not set its own. */
  namespace: string;
  /** Default statistic when the rule does not set one. */
  statistic?: MetricStatistic;
  /** Default look-back window in ms. Default 5 minutes. */
  windowMs?: number;
};

const DEFAULT_WINDOW_MS = 5 * 60 * 1000;

function periodFor(windowMs: number): number {
  // GetMetricData periods must be multiples of 60 s for recent data.
  return Math.max(60, Math.round(windowMs / 60_000) * 60);
}

/**
 * Reads one aggregated value per rule from CloudWatch using a single
 * GetMetricData call, and returns it as a MetricSample so the pure evaluator
 * never has to know where the number came from.
 */
export class CloudWatchMetricSource implements MetricSource {
  constructor(
    private readonly opts: CloudWatchSourceOptions,
    private readonly client: CloudWatchClient = new CloudWatchClient({})
  ) {}

  async fetch(rules: AlarmRule[], now = Date.now()): Promise<MetricSample[]> {
    if (rules.length === 0) return [];
    const maxWindow = Math.max(...rules.map((r) => r.windowMs ?? this.opts.windowMs ?? DEFAULT_WINDOW_MS));

    const queries: MetricDataQuery[] = rules.map((rule, i) => {
      const windowMs = rule.windowMs ?? this.opts.windowMs ?? DEFAULT_WINDOW_MS;
      return {
        Id: `m${i}`,
        ReturnData: true,
        MetricStat: {
          Metric: {
            Namespace: rule.namespace ?? this.opts.namespace,
            MetricName: rule.metric,
            Dimensions: rule.dimensions ? Object.entries(rule.dimensions).map(([Name, Value]) => ({ Name, Value })) : undefined,
          },
          Period: periodFor(windowMs),
          Stat: rule.statistic ?? this.opts.statistic ?? "Sum",
        },
      };
    });

    const res = await this.client.send(
      new GetMetricDataCommand({
        StartTime: new Date(now - maxWindow),
        EndTime: new Date(now),
        MetricDataQueries: queries,
        ScanBy: "TimestampDescending",
      })
    );

    const samples: MetricSample[] = [];
    for (const r of res.MetricDataResults ?? []) {
      const idx = Number((r.Id ?? "").slice(1));
      const rule = rules[idx];
      if (!rule || !r.Values?.length) continue; // no data in window -> rule is skipped, not breached
      const value = r.Values[0];
      const ts = r.Timestamps?.[0] ? new Date(r.Timestamps[0]).getTime() : now;
      samples.push({ name: rule.metric, type: "gauge", value, timestamp: ts, tags: rule.dimensions });
    }
    return samples;
  }
}
