import Link from "next/link";
import { ALARMS_CONSOLE_URL, DASHBOARD_URL } from "@vaishnora/core/cloudwatch";
import type { AdminRole } from "@vaishnora/core/roles";

// Shared frame for the admin operations pages: tabs + links out to CloudWatch.
// Vendors only get the Orders tab; the monitoring tabs and links are owner-only.
export default function OpsShell({
  active,
  role = "owner",
  title,
  subtitle,
  right,
  children,
}: {
  active: "orders" | "metrics" | "alarms" | "people";
  role?: AdminRole;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="ops">
      <nav className="ops-tabs" aria-label="Monitoring">
        <Link href="/admin" className="ops-tab">← Admin</Link>
        <Link href="/admin/orders" className={`ops-tab ${active === "orders" ? "is-active" : ""}`}>Orders</Link>
        {role === "owner" && (
          <>
            <Link href="/admin/metrics" className={`ops-tab ${active === "metrics" ? "is-active" : ""}`}>Metrics</Link>
            <Link href="/admin/alarms" className={`ops-tab ${active === "alarms" ? "is-active" : ""}`}>Alarms</Link>
            <Link href="/admin/people" className={`ops-tab ${active === "people" ? "is-active" : ""}`}>People</Link>
            <span className="ops-spacer" />
            <a className="ops-tab ops-tab-ext" href={DASHBOARD_URL} target="_blank" rel="noreferrer">CloudWatch dashboard ↗</a>
            <a className="ops-tab ops-tab-ext" href={ALARMS_CONSOLE_URL} target="_blank" rel="noreferrer">CloudWatch alarms ↗</a>
          </>
        )}
      </nav>

      <header className="ops-head">
        <div>
          <p className="ops-kicker">{role === "owner" ? "Production monitoring" : "Your orders"}</p>
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
