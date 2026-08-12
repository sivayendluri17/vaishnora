"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";
import { thumbnailFor } from "@/lib/products";

export default function CartPreview() {
  const { items, count, total } = useCart();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Desktop-only: don't render on mobile at all
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  function priceOf(p: (typeof items)[number]["product"]) {
    return p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;
  }

  if (!isDesktop) return null;                 // mobile: never show
  if (count === 0) return null;                // empty: hide
  if (pathname === "/cart" || pathname === "/checkout") return null;

  return (
    <div className="minicart" onMouseLeave={() => setOpen(false)}>
      {/* tiny tab — always small, sits on the right edge */}
      <button className="minicart-tab" onClick={() => setOpen((o) => !o)} onMouseEnter={() => setOpen(true)} aria-label={`Cart, ${count} items`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" />
          <path d="M2 3h3l2.4 12.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 7H6" />
        </svg>
        <span className="minicart-tab-count">{count}</span>
      </button>

      {/* flyout only when hovered/clicked */}
      {open && (
        <div className="minicart-flyout">
          <div className="minicart-head">Your cart · {count}</div>
          <div className="minicart-list">
            {items.map(({ product, qty }) => {
              const thumb = thumbnailFor(product);
              const colour = product.colors?.[0];
              return (
                <Link key={product.id} href={`/product/${product.id}`} className="minicart-item">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <span className="minicart-swatch" style={{ background: product.swatch ?? "var(--parchment)" }} />
                  )}
                  <span className="minicart-info">
                    <strong>{product.name}</strong>
                    {colour && <span className="muted">{colour.name}</span>}
                    <span className="muted">Qty: {qty} · {formatINR(priceOf(product) * qty)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="minicart-foot">
            <div className="minicart-total"><span>Subtotal</span><strong>{formatINR(total)}</strong></div>
            <Link href="/checkout" className="btn btn-primary minicart-checkout">Checkout</Link>
            <Link href="/cart" className="minicart-viewlink">View full cart</Link>
          </div>
        </div>
      )}
    </div>
  );
}
