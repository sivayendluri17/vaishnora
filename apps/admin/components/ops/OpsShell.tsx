import Link from "next/link";
import { ALARMS_CONSOLE_URL, DASHBOARD_URL } from "@vaishnora/core/cloudwatch";

// Shared frame for the admin monitoring pages: tabs + links out to CloudWatch.
export default function OpsShell({
  active,
  title,
  subtitle,
  right,
  children,
}: {
  active: "metrics" | "alarms";
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="ops">
      <nav className="ops-tabs" aria-label="Monitoring">
        <Link href="/admin" className="ops-tab">← Admin</Link>
        <Link href="/admin/metrics" className={`ops-tab ${active === "metrics" ? "is-active" : ""}`}>Metrics</Link>
        <Link href="/admin/alarms" className={`ops-tab ${active === "alarms" ? "is-active" : ""}`}>Alarms</Link>
        <span className="ops-spacer" />
        <a className="ops-tab ops-tab-ext" href={DASHBOARD_URL} target="_blank" rel="noreferrer">CloudWatch dashboard ↗</a>
        <a className="ops-tab ops-tab-ext" href={ALARMS_CONSOLE_URL} target="_blank" rel="noreferrer">CloudWatch alarms ↗</a>
      </nav>

      <header className="ops-head">
        <div>
          <p className="ops-kicker">Production monitoring</p>
          <h1 className="ops-title">{title}</h1>
          {subtitle && <p className="ops-sub">{subtitle}</p>}
        </div>
        {right}
      </header>

      {children}
    </section>
  );
}

export function OpsNotice({ tone, children }: { tone: "warn" | "error" | "info"; children: React.ReactNode }) {
  return <div className={`ops-notice ops-notice-${tone}`}>{children}</div>;
}
