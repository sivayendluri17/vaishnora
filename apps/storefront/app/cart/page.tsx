"use client";

// The cart: one row per line (product, colour, size) with a sticky summary
// beside it on desktop, then a row of suggestions so the shopper keeps
// browsing instead of stopping here.

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { thumbnailFor } from "@vaishnora/core/products";
import { variantLabel } from "@vaishnora/core/cart";
import { DELIVERY_FEE_INR, unitPrice } from "@vaishnora/core/pricing";
import Price from "@/components/Price";
import RecommendationRow from "@/components/RecommendationRow";

export default function CartPage() {
  const { items, setQty, remove, total, count } = useCart();
  const inCart = items.map((i) => i.product.id);
  const categories = [...new Set(items.map((i) => i.product.category))];

  return (
    <section className="section">
      <div className="container">
        <span className="eyebrow">Your selections</span>
        <h2>Cart{count > 0 ? ` (${count})` : ""}</h2>

        {items.length === 0 ? (
          <div className="empty-state">
            <h3>Your cart is empty</h3>
            <p>Beautiful things are waiting in the collection.</p>
            <Link href="/search" className="btn btn-gold" style={{ marginTop: "1rem" }}>
              Browse the collection
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-lines">
              {items.map(({ key, product, qty, colour, size }) => {
                const thumb = thumbnailFor(product);
                const variant = variantLabel({ colour, size });
                const unit = unitPrice(product);
                return (
                  <div key={key} className="cart-row">
                    <Link href={`/product/${product.id}`} className="cart-thumb-link" aria-label={product.name}>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="cart-thumb" loading="lazy" decoding="async" />
                      ) : (
                        <div className="cart-thumb" style={{ background: product.swatch ?? "var(--parchment)" }} aria-hidden="true" />
                      )}
                    </Link>
                    <div className="cart-info">
                      <span className="cat">{product.category}</span>
                      <Link href={`/product/${product.id}`} className="cart-name">{product.name}</Link>
                      {variant && <span className="cart-variant">{variant}</span>}
                      <span className="cart-unit">
                        <Price amount={unit} original={product.salePrice != null && product.salePrice > 0 ? product.price : null} size="sm" showOff={false} />
                        {qty > 1 && <span className="muted"> each</span>}
                      </span>
                      <div className="cart-controls">
                        <div className="inline-cart-control" role="group" aria-label={`Quantity for ${product.name}`}>
                          <button type="button" onClick={() => setQty(key, qty - 1)} aria-label="Decrease quantity">−</button>
                          <strong>{qty}</strong>
                          <button type="button" onClick={() => setQty(key, qty + 1)} aria-label="Increase quantity">+</button>
                        </div>
                        <button type="button" className="link-btn cart-remove" onClick={() => remove(key)}>Remove</button>
                      </div>
                    </div>
                    <div className="cart-line-total">
                      <Price amount={unit * qty} size="md" />
                    </div>
                  </div>
                );
              })}
              <Link href="/search" className="cart-continue">← Continue shopping</Link>
            </div>

            {/* Phone only: total and checkout always within reach */}
            <div className="sticky-cta">
              <div className="sticky-cta-text">
                <small>{count} item{count === 1 ? "" : "s"} incl. delivery</small>
                <Price amount={total + DELIVERY_FEE_INR} size="md" />
              </div>
              <Link href="/checkout" className="btn btn-primary">Checkout</Link>
            </div>

            <aside className="summary-card cart-summary">
              <h3>Order summary</h3>
              <div className="summary-row"><span>Items ({count})</span><Price amount={total} size="sm" /></div>
              <div className="summary-row"><span>Delivery</span><Price amount={DELIVERY_FEE_INR} size="sm" /></div>
              <div className="summary-row total"><span>Total</span><Price amount={total + DELIVERY_FEE_INR} size="lg" /></div>
              <Link href="/checkout" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>
                Proceed to checkout
              </Link>
              <p className="summary-note">Pay online by UPI, card or net banking, secured by Razorpay, or order over WhatsApp or Instagram at checkout.</p>
              <ul className="summary-trust">
                <li>Pan-India delivery</li>
                <li>Dispatch in 2–3 days</li>
                <li>WhatsApp support</li>
              </ul>
            </aside>
          </div>
        )}

        <RecommendationRow
          eyebrow={items.length ? "Goes well together" : "Start here"}
          title={items.length ? "You may also like" : "Popular right now"}
          exclude={inCart}
          prefer={categories}
        />
      </div>
    </section>
  );
}
