const alarms = [
  { name: "High latency", metric: "api.latency.ms", value: 2430, threshold: 2000, severity: "warning", status: "active" },
  { name: "Render spike", metric: "page.render.count", value: 18870, threshold: 15000, severity: "critical", status: "active" },
  { name: "Error rate elevated", metric: "error.rate", value: 2.4, threshold: 1.5, severity: "warning", status: "active" },
  { name: "Checkout latency", metric: "checkout.latency.ms", value: 980, threshold: 1200, severity: "info", status: "resolved" },
];

const severityColors = {
  info: "#60a5fa",
  warning: "#f59e0b",
  critical: "#ef4444",
};

const navItems = [
  { label: "Alerts", active: true },
  { label: "Escalations" },
  { label: "Schedules" },
  { label: "History" },
];

export default function AlarmsPage() {
  return (
    <main style={{ display: "flex", minHeight: "100vh", background: "#08111d", color: "#edf6ff" }}>
      <aside style={{ width: 220, background: "#0f172a", borderRight: "1px solid #21314a", padding: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Monitoring</div>
        <nav style={{ display: "grid", gap: 8 }}>
          {navItems.map((item) => (
            <div
              key={item.label}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: item.active ? "#0f766e" : "transparent",
                color: item.active ? "white" : "#cbd5e1",
                fontWeight: item.active ? 700 : 500,
              }}
            >
              {item.label}
            </div>
          ))}
        </nav>
      </aside>

      <section style={{ flex: 1, padding: 32 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, color: "#93c5fd", letterSpacing: 2, textTransform: "uppercase", fontSize: 12 }}>Monitoring</p>
              <h1 style={{ margin: "8px 0 0", fontSize: 40 }}>Alarms</h1>
            </div>
            <a href="/metrics" style={{ padding: "10px 16px", borderRadius: 999, background: "#0f766e", color: "white", textDecoration: "none", fontWeight: 700 }}>View metrics</a>
          </header>

          <div style={{ display: "grid", gap: 18 }}>
            {alarms.map((alarm) => (
              <div key={alarm.name} style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 18, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ margin: 0 }}>{alarm.name}</h2>
                    <p style={{ margin: "8px 0 0", color: "#a5b4fc" }}>{alarm.metric}</p>
                  </div>
                  <span style={{ background: severityColors[alarm.severity as keyof typeof severityColors], color: "white", padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
                    {alarm.severity}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 18, marginTop: 18 }}>
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>Current</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{alarm.value}</div>
                  </div>
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>Threshold</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{alarm.threshold}</div>
                  </div>
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>Status</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: alarm.status === "active" ? "#f87171" : "#4ade80" }}>{alarm.status}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
