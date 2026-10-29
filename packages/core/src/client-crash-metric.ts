// Server side of shop crash reporting: one CloudWatch datapoint per crash page
// shown to a shopper, so /admin/metrics can chart it and the
// vaishnora-SEV2-shop-crash-pages alarm can page the owner.
//
// Namespace Vaishnora/Storefront, metric ClientCrash: a total (no dimensions)
// plus the same count broken down by Kind. Needs cloudwatch:PutMetricData on
// the Amplify compute role for that namespace (granted by the observability
// stack's managed policy). Never throws: a missing permission must not turn a
// crash report into a 500.

import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import type { ClientErrorKind } from "./client-errors";

export const CRASH_NAMESPACE = "Vaishnora/Storefront";
export const CRASH_METRIC = "ClientCrash";

const REGION = process.env.AWS_REGION || "us-west-2";
let client: CloudWatchClient | null = null;

export async function putClientCrashMetric(kind: ClientErrorKind): Promise<boolean> {
  try {
    client ??= new CloudWatchClient({ region: REGION });
    const Timestamp = new Date();
    await client.send(new PutMetricDataCommand({
      Namespace: CRASH_NAMESPACE,
      MetricData: [
        { MetricName: CRASH_METRIC, Value: 1, Unit: "Count", Timestamp },
        { MetricName: CRASH_METRIC, Value: 1, Unit: "Count", Timestamp, Dimensions: [{ Name: "Kind", Value: kind }] },
      ],
    }));
    return true;
  } catch (err) {
    console.error("client-crash metric not recorded:", err instanceof Error ? err.message : err);
    return false;
  }
}
