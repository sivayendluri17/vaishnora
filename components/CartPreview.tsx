"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";
import { thumbnailFor } from "@/lib/products";

export default function CartPreview() {
  const { items, count, total } = useCart();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function priceOf(p: (typeof items)[number]["product"]) {
    return p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;
  }

  // Hide entirely when cart is empty, or on cart/checkout pages (they show the full cart)
  if (count === 0) return null;
  if (pathname === "/cart" || pathname === "/checkout") return null;

  return (
    <aside className={`mini-cart ${collapsed ? "collapsed" : ""}`} aria-label="Your cart">
      <button
        className="mini-cart-toggle"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand cart" : "Collapse cart"}
      >
        <span className="mini-cart-toggle-count">{count}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" />
          <path d="M2 3h3l2.4 12.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 7H6" />
        </svg>
      </button>

      <div className="mini-cart-body">
        <div className="mini-cart-head">
          <span>Your cart · {count}</span>
        </div>

        <div className="mini-cart-list">
          {items.map(({ product, qty }) => {
            const thumb = thumbnailFor(product);
            const colour = product.colors?.[0];
            return (
              <Link key={product.id} href={`/product/${product.id}`} className="mini-cart-item">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt={product.name} />
                ) : (
                  <span className="mini-cart-swatch" style={{ background: product.swatch ?? "var(--parchment)" }} />
                )}
                <span className="mini-cart-info">
                  <strong>{product.name}</strong>
                  {colour && <span className="muted">{colour.name}</span>}
                  <span className="muted">Qty: {qty}</span>
                  <span className="mini-cart-price">{formatINR(priceOf(product) * qty)}</span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mini-cart-foot">
          <div className="mini-cart-total">
            <span>Subtotal</span>
            <strong>{formatINR(total)}</strong>
          </div>
          <Link href="/checkout" className="btn btn-primary mini-cart-checkout">Checkout</Link>
          <Link href="/cart" className="mini-cart-viewlink">View full cart</Link>
        </div>
      </div>
    </aside>
  );
}
