"use client";

// Product page purchase controls. One control for the cart ("Add to cart"
// becomes the quantity stepper once this colour and size is in the cart) and
// "Buy now", which adds the item and goes straight to checkout. How to order
// (pay online, WhatsApp, Instagram) is chosen at checkout, not here.
//
// On phones the same two buttons repeat in a bar fixed above the tab bar, so
// they stay within thumb reach while the shopper scrolls through photos.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import type { Product } from "@vaishnora/core/products";
import { formatINR } from "@vaishnora/core/format";
import { needsSize } from "@vaishnora/core/cart";
import { unitPrice } from "@vaishnora/core/pricing";
import Price from "@/components/Price";

export default function AddToCart({ product, colourName }: { product: Product; colourName?: string }) {
  const router = useRouter();
  const { find, add, setQty } = useCart();
  const [size, setSize] = useState<string>("");
  const [sizeError, setSizeError] = useState(false);
  const [shared, setShared] = useState(false);

  const sized = needsSize(product);
  // The colour the shopper is looking at, not always the first one.
  const colour = colourName ?? product.colors?.[0]?.name ?? null;
  const line = find(product.id, { colour, size: size || null });

  // Out of stock: no ordering at all
  if (!product.inStock) {
    return (
      <div>
        <p style={{ fontSize: "0.9rem", color: "#6b5560" }}>
          This piece is currently unavailable. Check back soon or explore more from the collection.
        </p>
        <Link href="/search" className="btn btn-outline" style={{ marginTop: "0.6rem" }}>Browse the collection</Link>
      </div>
    );
  }

  function ensureSize(): boolean {
    if (sized && !size) {
      setSizeError(true);
      document.getElementById("size-options")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    setSizeError(false);
    return true;
  }

  function addToCart() {
    if (!ensureSize()) return;
    add(product, { colour, size: size || null });
  }

  function buyNow() {
    if (!ensureSize()) return;
    if (!line) add(product, { colour, size: size || null });
    router.push("/checkout");
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : `https://vaishnora.shop/product/${product.id}`;
    const text = `${product.name} · ${formatINR(unitPrice(product))} at Vaishnora`;
    try {
      if (navigator.share) { await navigator.share({ title: product.name, text, url }); return; }
      await navigator.clipboard?.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch { /* cancelled */ }
  }

  const controls = (compact: boolean) => (
    <>
      {line ? (
        <div className="inline-cart-control detail-cart-control" role="group" aria-label={`${line.qty} in cart`}>
          <button type="button" onClick={() => setQty(line.key, line.qty - 1)} aria-label={`Decrease ${product.name} quantity`}>−</button>
          <strong>{line.qty} in cart</strong>
          <button type="button" onClick={() => setQty(line.key, line.qty + 1)} aria-label={`Add another ${product.name}`}>+</button>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={addToCart}>Add to cart</button>
      )}
      <button className="btn btn-gold" onClick={buyNow}>Buy now</button>
      {!compact && line && <Link href="/cart" className="btn btn-outline">View cart</Link>}
    </>
  );

  return (
    <div className="buy-box">
      {sized && (
        <div id="size-options">
          <div className="size-head">
            <span className="size-label">Select size</span>
            {size && <span className="size-picked">Size: <strong>{size}</strong></span>}
          </div>
          <div className="size-options">
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                className={`size-chip ${size === s ? "active" : ""}`}
                onClick={() => { setSize(s); setSizeError(false); }}
                aria-pressed={size === s}
              >
                {s}
              </button>
            ))}
          </div>
          {sizeError && <p className="form-error" style={{ marginTop: "0.4rem" }}>Please select a size.</p>}
        </div>
      )}

      <div className="buy-actions">
        {controls(false)}
        <button type="button" className="icon-btn" onClick={share} aria-label="Share this product" title="Share">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>
        </button>
        {shared && <span className="buy-note">Link copied</span>}
      </div>
      <p className="buy-note">Pay online, or order over WhatsApp or Instagram, at checkout.</p>

      {/* phone-only sticky bar */}
      <div className="buy-bar" aria-hidden={false}>
        <div className="buy-bar-price">
          <Price amount={unitPrice(product)} size="md" />
          {sized && <small>{size ? `Size ${size}` : "Choose a size"}</small>}
        </div>
        <div className="buy-bar-actions">{controls(true)}</div>
      </div>
    </div>
  );
}
