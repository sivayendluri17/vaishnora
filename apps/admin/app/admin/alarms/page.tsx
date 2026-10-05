import { requireAdmin } from "@/lib/guard";
import { ALARM_PREFIX, describeError, fetchAlarms, type AlarmView, type Severity } from "@vaishnora/core/cloudwatch";
import OpsShell, { OpsNotice } from "@/components/ops/OpsShell";
import LiveControls from "@/components/ops/LiveControls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alarms — Vaishnora Admin" };

const SEV_COPY: Record<Severity, { title: string; blurb: string }> = {
  SEV2: { title: "SEV2 · customer impact", blurb: "Pages you by email and SMS. Act now: shoppers are affected." },
  SEV3: { title: "SEV3 · degraded", blurb: "Email only. Look within the day; nothing is down but something is off." },
  OTHER: { title: "Other alarms", blurb: "Alarms with this prefix that do not carry a severity tag." },
};

function when(ts: number | null): string {
  if (!ts) return "";
  const mins = Math.round((Date.now() - ts) / 60000);
  const rel = mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : mins < 1440 ? `${Math.round(mins / 60)} h ago` : `${Math.round(mins / 1440)} d ago`;
  const abs = new Date(ts).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  return `${rel} · ${abs} IST`;
}

function AlarmRow({ a }: { a: AlarmView }) {
  return (
    <article className={`ops-alarm state-${a.state.toLowerCase()}`}>
      <div className="ops-alarm-state" aria-label={a.state}>
        {a.state === "ALARM" ? "FIRING" : a.state === "OK" ? "OK" : "NO DATA"}
      </div>
      <div className="ops-alarm-body">
        <h3 className="ops-alarm-name">
          {a.shortName}
          <span className={`ops-sev ops-sev-${a.severity.toLowerCase()}`}>{a.severity}</span>
        </h3>
        {a.description && <p className="ops-alarm-desc">{a.description}</p>}
        <p className="ops-alarm-meta">
          {a.metric}{a.threshold ? ` · threshold ${a.threshold}` : ""}
          {a.updatedAt ? ` · state changed ${when(a.updatedAt)}` : ""}
        </p>
        {a.state !== "OK" && a.reason && <p className="ops-alarm-reason">{a.reason}</p>}
      </div>
      <a className="ops-alarm-link" href={a.consoleUrl} target="_blank" rel="noreferrer">Open ↗</a>
    </article>
  );
}

export default async function AlarmsPage() {
  const admin = await requireAdmin("/admin/alarms");

  let alarms: AlarmView[] = [];
  let error: string | null = null;
  try {
    alarms = await fetchAlarms();
  } catch (e) {
    error = describeError(e);
  }

  const fetchedAt = Date.now();
  const firing = alarms.filter((a) => a.state === "ALARM").length;
  const groups = (["SEV2", "SEV3", "OTHER"] as Severity[]).map((sev) => ({ sev, items: alarms.filter((a) => a.severity === sev) })).filter((g) => g.items.length);

  return (
    <OpsShell
      active="alarms"
      title="Alarms"
      right={<LiveControls fetchedAt={fetchedAt} />}
      subtitle={alarms.length ? (firing ? `${firing} firing · ${alarms.length} configured` : `All ${alarms.length} alarms healthy`) : undefined}
    >
      {error && <OpsNotice tone="error">{error}</OpsNotice>}

      {!error && alarms.length === 0 && (
        <OpsNotice tone="warn">
          No CloudWatch alarms found with the prefix <code>{ALARM_PREFIX}</code>. Deploy the stack in <code>infra/observability/</code> to create the
          SEV2 and SEV3 alarms, SNS notification topics and dashboard.
        </OpsNotice>
      )}

      {groups.map(({ sev, items }) => (
        <section key={sev} className="ops-group">
          <h2 className="ops-group-title">{SEV_COPY[sev].title}</h2>
          <p className="ops-group-blurb">{SEV_COPY[sev].blurb}</p>
          <div className="ops-alarm-list">
            {items.map((a) => <AlarmRow key={a.name} a={a} />)}
          </div>
        </section>
      ))}

      {!error && alarms.length > 0 && (
        <p className="ops-foot">
          Alarm state is evaluated by CloudWatch and notifications go out through SNS even when this site is down. The uptime alarm lives in
          us-east-1 and only appears here if this deployment points at that region.
        </p>
      )}
    </OpsShell>
  );
}
