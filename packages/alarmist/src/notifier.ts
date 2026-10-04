import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SEVERITY_TO_SEV, type SevLevel, type TriggeredAlarm } from "@vaishnora/shared-contracts";

/** Delivers triggered alarms somewhere people will see them. */
export interface AlarmNotifier {
  notify(alarms: TriggeredAlarm[]): Promise<void>;
}

export class ConsoleNotifier implements AlarmNotifier {
  async notify(alarms: TriggeredAlarm[]): Promise<void> {
    for (const a of alarms) console.log(JSON.stringify({ alarm: a }));
  }
}

export function formatSubject(a: TriggeredAlarm): string {
  // SNS subjects are limited to 100 ASCII characters.
  return `[${SEVERITY_TO_SEV[a.severity]}] ${a.name}`.slice(0, 100);
}

export function formatMessage(a: TriggeredAlarm): string {
  return [
    a.message ?? `${a.name} breached`,
    "",
    `Severity : ${a.severity} (${SEVERITY_TO_SEV[a.severity]})`,
    `Metric   : ${a.metric}`,
    `Value    : ${a.value}`,
    `Threshold: ${a.threshold}`,
    `At       : ${new Date(a.timestamp).toISOString()}`,
    `Rule     : ${a.ruleId}`,
  ].join("\n");
}

/** Publishes each alarm to the SNS topic for its SEV level (critical -> SEV2, warning/info -> SEV3). */
export class SnsNotifier implements AlarmNotifier {
  constructor(
    private readonly topics: Record<SevLevel, string>,
    private readonly client: SNSClient = new SNSClient({})
  ) {}

  async notify(alarms: TriggeredAlarm[]): Promise<void> {
    await Promise.all(
      alarms.map((a) =>
        this.client.send(
          new PublishCommand({
            TopicArn: this.topics[SEVERITY_TO_SEV[a.severity]],
            Subject: formatSubject(a),
            Message: formatMessage(a),
            MessageAttributes: {
              severity: { DataType: "String", StringValue: a.severity },
              ruleId: { DataType: "String", StringValue: a.ruleId },
            },
          })
        )
      )
    );
  }
}
