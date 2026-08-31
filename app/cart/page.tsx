"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";
import { thumbnailFor } from "@/lib/products";

export default function CartPage() {
  const { items, setQty, remove, total, count } = useCart();

  function priceOf(p: (typeof items)[number]["product"]) {
    return p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;
  }

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
              {items.map(({ product, qty }) => {
                const thumb = thumbnailFor(product);
                const colour = product.colors?.[0];
                return (
                  <div key={product.id} className="cart-row">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={product.name}
                        className="cart-thumb"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                      />
                    ) : (
                      <div className="cart-thumb" style={{ background: product.swatch ?? "var(--parchment)" }} aria-hidden="true" />
                    )}
                    <div className="cart-info">
                      <strong>{product.name}</strong>
                      <div style={{ fontSize: "0.85rem", color: "var(--gold-deep)" }}>
                        {product.category}{colour ? ` · ${colour.name}` : ""}
                      </div>
                    </div>
                    <div className="qty" aria-label={`Quantity for ${product.name}`}>
                      <button onClick={() => setQty(product.id, qty - 1)} aria-label="Decrease quantity">−</button>
                      <span>{qty}</span>
                      <button onClick={() => setQty(product.id, qty + 1)} aria-label="Increase quantity">+</button>
                    </div>
                    <strong className="cart-price">{formatINR(priceOf(product) * qty)}</strong>
                    <button className="chip cart-remove" onClick={() => remove(product.id)}>Remove</button>
                  </div>
                );
              })}
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
