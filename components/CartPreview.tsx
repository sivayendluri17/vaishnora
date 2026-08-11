"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";
import { thumbnailFor } from "@/lib/products";

export default function CartPreview() {
  const { items, count, total } = useCart();
  const [open, setOpen] = useState(false);
  const prevCount = useRef(count);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Auto-open briefly whenever an item is added to the cart
  useEffect(() => {
    if (count > prevCount.current) {
      setOpen(true);
      const t = setTimeout(() => setOpen(false), 3500);
      prevCount.current = count;
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function priceOf(p: (typeof items)[number]["product"]) {
    return p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;
  }

  return (
    <div className="cart-preview-wrap" ref={wrapRef}>
      <button
        className="cart-preview-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Cart with ${count} item${count === 1 ? "" : "s"}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="20" r="1.4" />
          <circle cx="18" cy="20" r="1.4" />
          <path d="M2 3h3l2.4 12.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 7H6" />
        </svg>
        <span className="cart-preview-label">Cart</span>
        {count > 0 && <span className="cart-preview-count">{count}</span>}
      </button>

      {open && (
        <div className="cart-preview-panel" role="dialog" aria-label="Cart preview">
          {items.length === 0 ? (
            <p className="cart-preview-empty">Your cart is empty.</p>
          ) : (
            <>
              <div className="cart-preview-head">
                {count} item{count === 1 ? "" : "s"} in your cart
              </div>
              <div className="cart-preview-list">
                {items.map(({ product, qty }) => {
                  const thumb = thumbnailFor(product);
                  const colour = product.colors?.[0];
                  return (
                    <Link key={product.id} href={`/product/${product.id}`} className="cart-preview-item" onClick={() => setOpen(false)}>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={product.name} />
                      ) : (
                        <span className="cart-preview-swatch" style={{ background: product.swatch ?? "var(--parchment)" }} />
                      )}
                      <span className="cart-preview-info">
                        <strong>{product.name}</strong>
                        {colour && <span className="muted">{colour.name}</span>}
                        <span className="muted">Qty: {qty}</span>
                        <span className="cart-preview-price">{formatINR(priceOf(product) * qty)}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
              <div className="cart-preview-footer">
                <div className="cart-preview-total">
                  <span>Subtotal</span>
                  <strong>{formatINR(total)}</strong>
                </div>
                <Link href="/cart" className="btn btn-outline" onClick={() => setOpen(false)}>View cart</Link>
                <Link href="/checkout" className="btn btn-primary" onClick={() => setOpen(false)}>Checkout</Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
