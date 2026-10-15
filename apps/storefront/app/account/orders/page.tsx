"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Price from "@/components/Price";
import RecommendationRow from "@/components/RecommendationRow";

type OrderItem = {
  productId: string; name: string; colour: string | null; size?: string | null; qty: number; price: number;
  imageUrl?: string | null; swatch?: string | null;
};
type Order = {
  id: string; customerName: string; mobile: string; pincode: string;
  addressLine1: string; addressLine2: string; landmark: string; city: string; state: string;
  items: OrderItem[]; total: number; channel: string; createdAt: string;
  paymentStatus?: "not_required" | "paid";
};

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return s; }
}

// "via whatsapp" for chat orders; a paid badge for online ones (an online
// order only exists once its payment is confirmed).
function channelLabel(o: Order) {
  if (o.channel !== "online") return <span className="order-channel">via {o.channel}</span>;
  return <span className="order-channel order-pay-status is-paid">✓ Paid online</span>;
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

        {orders && orders.length > 0 && (
          <RecommendationRow
            eyebrow="Based on your orders"
            title="You may also like"
            exclude={orders.flatMap((o) => o.items.map((it) => it.productId))}
          />
        )}
        {orders && orders.map((o) => (
          <div key={o.id} className="order-card">
            <div className="order-head">
              <div>
                <span className="order-date">{fmtDate(o.createdAt)}</span>
                {channelLabel(o)}
              </div>
              <Price amount={o.total} size="md" />
            </div>
            <div className="order-items">
              {o.items.map((it, idx) => (
                <div key={idx} className="order-item">
                  {it.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.imageUrl} alt={it.name} className="order-item-thumb" />
                  ) : (
                    <div className="order-item-swatch" style={{ background: it.swatch ?? "var(--parchment)" }} aria-hidden="true" />
                  )}
                  <Link href={`/product/${it.productId}`} className="order-item-name">
                    {it.name}
                    <span className="order-item-meta">{[it.colour, it.size].filter(Boolean).map((v) => `${v} · `).join("")}Qty {it.qty}</span>
                  </Link>
                  <Price amount={it.price * it.qty} size="sm" className="order-item-price" />
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
