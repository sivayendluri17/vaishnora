"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderItem = { productId: string; name: string; colour: string | null; qty: number; price: number };
type Order = {
  id: string; customerName: string; mobile: string; pincode: string;
  addressLine1: string; addressLine2: string; landmark: string; city: string; state: string;
  items: OrderItem[]; total: number; channel: string; createdAt: string;
};

function inr(n: number) { return "\u20B9" + n.toLocaleString("en-IN"); }
function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return s; }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/account/orders")
      .then(async (r) => {
        if (r.status === 401) { setError("Please sign in to view your orders."); return; }
        const d = await r.json();
        if (r.ok) setOrders(d.orders); else setError(d.error || "Couldn't load orders.");
      })
      .catch(() => setError("Couldn't load orders."));
  }, []);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <span className="eyebrow">Your account</span>
        <h2>Your orders</h2>
        {error && <p className="form-error">{error}</p>}

        {orders === null && !error && <p style={{ color: "#6b5560" }}>Loading…</p>}

        {orders && orders.length === 0 && (
          <div className="empty-state">
            <p>You haven&apos;t placed any orders yet.</p>
            <Link href="/search" className="btn btn-gold" style={{ marginTop: "1rem" }}>Start shopping</Link>
          </div>
        )}

        {orders && orders.map((o) => (
          <div key={o.id} className="order-card">
            <div className="order-head">
              <div>
                <span className="order-date">{fmtDate(o.createdAt)}</span>
                <span className="order-channel">via {o.channel}</span>
              </div>
              <strong>{inr(o.total)}</strong>
            </div>
            <div className="order-items">
              {o.items.map((it, idx) => (
                <div key={idx} className="order-item">
                  <span>{it.name}{it.colour ? ` · ${it.colour}` : ""} × {it.qty}</span>
                  <span>{inr(it.price * it.qty)}</span>
                </div>
              ))}
            </div>
            <div className="order-ship">
              Ship to: {o.customerName}, {o.addressLine1}{o.addressLine2 ? ", " + o.addressLine2 : ""}, {o.city}, {o.state} - {o.pincode}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
