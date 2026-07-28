"use client";

// This page is protected by middleware.ts — visitors who aren't signed in
// are redirected to /login?next=/checkout (authorization in action).

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";

export default function CheckoutPage() {
  const { items, total, count, clear } = useCart();
  const [placed, setPlaced] = useState(false);

  function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    // TODO: integrate Razorpay (primary, India) — optionally Stripe for international
    // and persist the order server-side.
    clear();
    setPlaced(true);
  }

  if (placed) {
    return (
      <section className="section">
        <div className="container empty-state">
          <span className="eyebrow">Order received</span>
          <h2>Thank you ✦</h2>
          <p>This is a demo checkout — payment integration comes next.</p>
          <Link href="/search" className="btn btn-gold" style={{ marginTop: "1rem" }}>Continue browsing</Link>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="section">
        <div className="container empty-state">
          <h2>Nothing to check out</h2>
          <Link href="/search" className="btn btn-gold" style={{ marginTop: "1rem" }}>Browse the collection</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "3rem", alignItems: "start" }}>
        <form onSubmit={placeOrder}>
          <span className="eyebrow">Almost there</span>
          <h2>Checkout</h2>
          <div className="field">
            <label htmlFor="fullname">Full name</label>
            <input id="fullname" required placeholder="Your name" />
          </div>
          <div className="field">
            <label htmlFor="address">Shipping address</label>
            <input id="address" required placeholder="Street, city, state, ZIP" />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" type="tel" required placeholder="For delivery updates" />
          </div>
          <button className="btn btn-primary" type="submit">Place order — {formatINR(total)}</button>
        </form>

        <div className="summary-card">
          <h3 style={{ marginBottom: "1rem" }}>Order summary</h3>
          {items.map(({ product, qty }) => (
            <div key={product.id} className="summary-row">
              <span>{product.name} × {qty}</span>
              <span>{formatINR(product.price * qty)}</span>
            </div>
          ))}
          <div className="summary-row"><span>Items</span><span>{count}</span></div>
          <div className="summary-row total"><span>Total</span><span>{formatINR(total)}</span></div>
        </div>
      </div>
    </section>
  );
}
