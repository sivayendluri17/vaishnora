"use client";

// Small confirmation that slides in when something is added to the cart, so
// the action is acknowledged wherever the button was. Shows the item and a
// link to the cart, then fades after a few seconds.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { imageForColour } from "@vaishnora/core/products";

export default function CartToast() {
  const { lastAdded, count } = useCart();
  const [visible, setVisible] = useState(false);
  // On the product page the phone buy bar sits above the tab bar; stay clear of it.
  const onProduct = usePathname().startsWith("/product/");

  useEffect(() => {
    if (!lastAdded) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, [lastAdded]);

  if (!lastAdded) return null;
  const thumb = imageForColour(lastAdded.product, lastAdded.colour);
  return (
    <div className={`cart-toast ${visible ? "show" : ""} ${onProduct ? "is-pdp" : ""}`} role="status" aria-live="polite">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" />
      ) : (
        <span className="cart-toast-swatch" style={{ background: lastAdded.product.swatch ?? "var(--parchment)" }} />
      )}
      <div className="cart-toast-body">
        <span className="cart-toast-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.3 2.3 4.7-5" /></svg>
          Added to cart
        </span>
        <span className="cart-toast-name">{lastAdded.product.name}</span>
        {lastAdded.colour && <span className="cart-toast-variant">Colour: {lastAdded.colour}</span>}
      </div>
      <Link href="/cart" className="cart-toast-link">View cart{count > 1 ? ` (${count})` : ""}</Link>
    </div>
  );
}
