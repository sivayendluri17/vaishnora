"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";

export default function CartPage() {
  const { items, setQty, remove, total, count } = useCart();

  return (
    <section className="section">
      <div className="container">
        <span className="eyebrow">Your selections</span>
        <h2>Cart</h2>

        {items.length === 0 ? (
          <div className="empty-state">
            <h3>Your cart is empty</h3>
            <p>Beautiful things are waiting in the collection.</p>
            <Link href="/search" className="btn btn-gold" style={{ marginTop: "1rem" }}>
              Browse the collection
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
            <div>
              {items.map(({ product, qty }) => (
                <div key={product.id} className="cart-row">
                  <div className="cart-thumb" style={{ background: product.swatch }} aria-hidden="true" />
                  <div>
                    <strong>{product.name}</strong>
                    <div style={{ fontSize: "0.85rem", color: "var(--gold-deep)" }}>{product.category}</div>
                  </div>
                  <div className="qty" aria-label={`Quantity for ${product.name}`}>
                    <button onClick={() => setQty(product.id, qty - 1)} aria-label="Decrease quantity">−</button>
                    <span>{qty}</span>
                    <button onClick={() => setQty(product.id, qty + 1)} aria-label="Increase quantity">+</button>
                  </div>
                  <strong>{formatINR(product.price * qty)}</strong>
                  <button className="chip" onClick={() => remove(product.id)}>Remove</button>
                </div>
              ))}
            </div>

            <div className="summary-card" style={{ maxWidth: 420 }}>
              <div className="summary-row"><span>Items</span><span>{count}</span></div>
              <div className="summary-row"><span>Shipping</span><span>Calculated at checkout</span></div>
              <div className="summary-row total"><span>Total</span><span>{formatINR(total)}</span></div>
              <Link href="/checkout" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>
                Proceed to checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
