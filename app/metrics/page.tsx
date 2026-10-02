const metrics = [
  { name: "Render count", value: "18,240", unit: "renders", trend: "+12.4%", status: "healthy" },
  { name: "API latency", value: "184 ms", unit: "ms", trend: "-8.2%", status: "warning" },
  { name: "Cart activity", value: "426", unit: "orders", trend: "+3.1%", status: "healthy" },
  { name: "Error rate", value: "0.42%", unit: "%", trend: "-0.1%", status: "healthy" },
];

const rows = [
  { metric: "Render count", value: "18,240", period: "1h" },
  { metric: "Latency p95", value: "812 ms", period: "1h" },
  { metric: "Order success", value: "98.7%", period: "1d" },
  { metric: "Page load", value: "1.9 s", period: "1d" },
  { metric: "Checkout latency", value: "1.1 s", period: "30m" },
  { metric: "API error rate", value: "0.42%", period: "1h" },
];

const statusColors = {
  healthy: "#22c55e",
  warning: "#f59e0b",
};

const navItems = [
  { label: "Overview", active: true },
  { label: "Performance" },
  { label: "Services" },
  { label: "Incidents" },
];

export default function MetricsPage() {
  return (
    <main style={{ display: "flex", minHeight: "100vh", background: "#08111d", color: "#edf6ff" }}>
      <aside style={{ width: 220, background: "#0f172a", borderRight: "1px solid #21314a", padding: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Vaishnora</div>
        <nav style={{ display: "grid", gap: 8 }}>
          {navItems.map((item) => (
            <div
              key={item.label}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: item.active ? "#1d4ed8" : "transparent",
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
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, color: "#93c5fd", letterSpacing: 2, textTransform: "uppercase", fontSize: 12 }}>Observability</p>
              <h1 style={{ margin: "8px 0 0", fontSize: 40 }}>Metrics dashboard</h1>
            </div>
            <a href="/alarms" style={{ padding: "10px 16px", borderRadius: 999, background: "#1d4ed8", color: "white", textDecoration: "none", fontWeight: 700 }}>View alarms</a>
          </header>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 28 }}>
            {metrics.map((metric) => (
              <div key={metric.name} style={{ background: "#111827", border: "1px solid #243244", borderRadius: 18, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>{metric.name}</span>
                  <span style={{ background: statusColors[metric.status as keyof typeof statusColors], color: "#06130d", borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 700 }}>{metric.status}</span>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800 }}>{metric.value}</div>
                <div style={{ marginTop: 10, color: metric.trend.startsWith("-") ? "#fca5a5" : "#86efac", fontWeight: 700 }}>{metric.trend}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
            <section style={{ background: "#111827", border: "1px solid #243244", borderRadius: 18, padding: 20 }}>
              <h2 style={{ marginTop: 0, marginBottom: 16 }}>Recent metrics</h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                    <th style={{ padding: "12px 0" }}>Metric</th>
                    <th style={{ padding: "12px 0" }}>Value</th>
                    <th style={{ padding: "12px 0" }}>Period</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.metric} style={{ borderTop: "1px solid #243244" }}>
                      <td style={{ padding: "12px 0" }}>{row.metric}</td>
                      <td>{row.value}</td>
                      <td>{row.period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section style={{ background: "#111827", border: "1px solid #243244", borderRadius: 18, padding: 20 }}>
              <h2 style={{ marginTop: 0, marginBottom: 16 }}>Service health</h2>
              <div style={{ display: "grid", gap: 14 }}>
                {[
                  { name: "Frontend", value: "99.9%", tone: "good" },
                  { name: "Checkout", value: "97.5%", tone: "warning" },
                  { name: "API", value: "98.8%", tone: "good" },
                  { name: "Payments", value: "96.2%", tone: "warning" },
                ].map((service) => (
                  <div key={service.name} style={{ border: "1px solid #243244", borderRadius: 12, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span>{service.name}</span>
                      <span style={{ color: service.tone === "good" ? "#86efac" : "#fbbf24", fontWeight: 700 }}>{service.value}</span>
                    </div>
                    <div style={{ background: "#1f2937", height: 8, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: service.tone === "good" ? "90%" : "70%", height: "100%", background: service.tone === "good" ? "#22c55e" : "#f59e0b", borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
