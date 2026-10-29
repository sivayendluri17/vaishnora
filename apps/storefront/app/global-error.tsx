"use client";

// Last line of defence: catches crashes in the root layout itself (header,
// cart provider, footer), where app/error.tsx cannot help. Must render its own
// <html> and <body>, and cannot rely on the global stylesheet having loaded,
// so the styles are inline.

import { useEffect, useState } from "react";
import { reloadOnceIfStale, reportClientError } from "@/lib/client-error";

const page: React.CSSProperties = { margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8f1e7", color: "#3b1d2a", fontFamily: "Georgia, 'Times New Roman', serif", padding: 24, textAlign: "center" };
const btn: React.CSSProperties = { display: "inline-block", margin: 6, padding: "12px 22px", borderRadius: 999, border: "1px solid #7a1230", background: "#7a1230", color: "#fff", fontSize: 15, cursor: "pointer", textDecoration: "none" };
const ghost: React.CSSProperties = { ...btn, background: "transparent", color: "#7a1230" };

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    reportClientError(error, "root");
    if (reloadOnceIfStale(error)) setReloading(true);
  }, [error]);

  return (
    <html lang="en">
      <body style={page}>
        <div role="alert" style={{ maxWidth: 480 }}>
          <p style={{ letterSpacing: "0.2em", fontSize: 12, textTransform: "uppercase", opacity: 0.7 }}>Vaishnora</p>
          <h1 style={{ fontSize: 28, fontWeight: 500, margin: "8px 0 12px" }}>{reloading ? "Refreshing the page…" : "The shop had a hiccup"}</h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, margin: "0 0 20px" }}>
            Nothing was charged and your cart is safe. A reload usually fixes this.
          </p>
          {!reloading && (
            <div>
              <button type="button" style={btn} onClick={() => window.location.reload()}>Reload the page</button>
              <button type="button" style={ghost} onClick={() => reset()}>Try again</button>
              <a href="/" style={ghost}>Home</a>
            </div>
          )}
          <p style={{ fontSize: 14, marginTop: 24, opacity: 0.8 }}>
            Still stuck? Order on WhatsApp: <a href="https://wa.me/918179456749" style={{ color: "#7a1230" }}>+91 81794 56749</a>
          </p>
          {error.digest && <p style={{ fontSize: 12, opacity: 0.6 }}>Reference {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
