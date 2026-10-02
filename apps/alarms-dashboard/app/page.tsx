const alarms = [
  { name: "High latency", metric: "api.latency.ms", value: 2430, threshold: 2000, severity: "warning" },
  { name: "Render spike", metric: "page.render.count", value: 18870, threshold: 15000, severity: "critical" },
  { name: "Error rate elevated", metric: "error.rate", value: 2.4, threshold: 1.5, severity: "warning" },
];

const severityColor = {
  warning: "#f59e0b",
  critical: "#ef4444",
  info: "#60a5fa",
};

export default function AlertsPage() {
  return (
    <main style={{ padding: 32, background: "#111827", minHeight: "100vh", color: "#e5e7eb" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <header style={{ marginBottom: 28 }}>
          <p style={{ margin: 0, color: "#93c5fd", textTransform: "uppercase", letterSpacing: 2, fontSize: 12 }}>Monitoring</p>
          <h1 style={{ margin: "10px 0 0" }}>Alarms</h1>
        </header>

        <section style={{ display: "grid", gap: 16 }}>
          {alarms.map((alarm) => (
            <div key={alarm.name} style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 18, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{alarm.name}</h2>
                  <p style={{ margin: "8px 0 0", color: "#9ca3af" }}>{alarm.metric}</p>
                </div>
                <span style={{ background: severityColor[alarm.severity as keyof typeof severityColor], color: "#fff", borderRadius: 999, padding: "6px 10px", fontWeight: 700, textTransform: "uppercase", fontSize: 12 }}>
                  {alarm.severity}
                </span>
              </div>

              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3, minmax(120px, 1fr))", gap: 16 }}>
                <div>
                  <div style={{ color: "#9ca3af", fontSize: 12 }}>Current</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{alarm.value}</div>
                </div>
                <div>
                  <div style={{ color: "#9ca3af", fontSize: 12 }}>Threshold</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{alarm.threshold}</div>
                </div>
                <div>
                  <div style={{ color: "#9ca3af", fontSize: 12 }}>Status</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: severityColor[alarm.severity as keyof typeof severityColor] }}>Triggered</div>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
