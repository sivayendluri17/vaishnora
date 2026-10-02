const metrics = [
  { name: "page.render.count", value: "18,240", unit: "renders", trend: "+12.4%" },
  { name: "api.latency.ms", value: "184", unit: "ms", trend: "-8.2%" },
  { name: "cart.added.count", value: "426", unit: "orders", trend: "+3.1%" },
  { name: "error.rate", value: "0.42%", unit: "%", trend: "-0.1%" },
];

export default function MetricsPage() {
  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <p style={{ margin: 0, color: "#94a3b8", letterSpacing: 2, textTransform: "uppercase", fontSize: 12 }}>Observability</p>
            <h1 style={{ margin: "8px 0 0" }}>Metrics dashboard</h1>
          </div>
          <button style={{ padding: "10px 16px", borderRadius: 999, border: "none", background: "#22c55e", color: "#04130b", fontWeight: 700 }}>Live</button>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 30 }}>
          {metrics.map((metric) => (
            <div key={metric.name} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 18, padding: 20 }}>
              <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8 }}>{metric.name}</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{metric.value}</div>
              <div style={{ marginTop: 8, color: metric.trend.startsWith("-") ? "#fca5a5" : "#86efac", fontWeight: 600 }}>{metric.trend}</div>
            </div>
          ))}
        </section>

        <section style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 18, padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Recent metrics</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#94a3b8" }}>
                <th style={{ padding: "10px 0" }}>Metric</th>
                <th style={{ padding: "10px 0" }}>Value</th>
                <th style={{ padding: "10px 0" }}>Period</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "10px 0" }}>render.count</td>
                <td>18,240</td>
                <td>1h</td>
              </tr>
              <tr>
                <td style={{ padding: "10px 0" }}>latency.p95</td>
                <td>812ms</td>
                <td>1h</td>
              </tr>
              <tr>
                <td style={{ padding: "10px 0" }}>order.success.rate</td>
                <td>98.7%</td>
                <td>1d</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
