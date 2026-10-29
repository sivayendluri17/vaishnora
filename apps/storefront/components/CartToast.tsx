"use client";

// Small confirmation that slides in when something is added to the cart, so
// the action is acknowledged wherever the button was. Shows the item and a
// link to the cart, then fades after a few seconds.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { imageForColour } from "@vaishnora/core/products";

export default function CartToast() {
  const { lastAdded, count } = useCart();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastAdded) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(t);
  }, [lastAdded]);

  if (!lastAdded) return null;
  const thumb = imageForColour(lastAdded.product, lastAdded.colour);
  return (
    <div className={`cart-toast ${visible ? "show" : ""}`} role="status" aria-live="polite">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" />
      ) : (
        <span className="cart-toast-swatch" style={{ background: lastAdded.product.swatch ?? "var(--parchment)" }} />
      )}
      <div>
        <strong>Added to cart</strong>
        <span>{lastAdded.product.name}</span>
      </div>
      <Link href="/cart" className="cart-toast-link">View cart ({count})</Link>
    </div>
  );
}
