"use client";

// Product page purchase controls. One control for the cart ("Add to cart"
// becomes the quantity stepper once this colour and size is in the cart) and
// "Buy now", which adds the item and goes straight to checkout. How to order
// (pay online, WhatsApp, Instagram) is chosen at checkout, not here.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import type { Product } from "@vaishnora/core/products";
import { needsSize } from "@vaishnora/core/cart";

export default function AddToCart({ product, colourName }: { product: Product; colourName?: string }) {
  const router = useRouter();
  const { find, add, setQty } = useCart();
  const [size, setSize] = useState<string>("");
  const [sizeError, setSizeError] = useState(false);

  const sized = needsSize(product);
  // The colour the shopper is looking at, not always the first one.
  const colour = colourName ?? product.colors?.[0]?.name ?? null;
  const line = find(product.id, { colour, size: size || null });

  // Out of stock: no ordering at all
  if (!product.inStock) {
    return (
      <div>
        <p className="stock-badge out" style={{ display: "inline-block" }}>Out of Stock</p>
        <p style={{ fontSize: "0.9rem", color: "#6b5560" }}>
          This piece is currently unavailable. Check back soon or explore more from the collection.
        </p>
        <Link href="/search" className="btn btn-outline" style={{ marginTop: "0.6rem" }}>Browse the collection</Link>
      </div>
    );
  }

  function ensureSize(): boolean {
    if (sized && !size) { setSizeError(true); return false; }
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

  return (
    <div style={{ display: "grid", gap: "0.9rem" }}>
      {sized && (
        <div>
          <span style={{ fontSize: "0.8rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold-deep)" }}>
            Select size
          </span>
          <div className="size-options">
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                className={`size-chip ${size === s ? "active" : ""}`}
                onClick={() => { setSize(s); setSizeError(false); }}
              >
                {s}
              </button>
            ))}
          </div>
          {sizeError && <p className="form-error" style={{ marginTop: "0.4rem" }}>Please select a size.</p>}
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        {line ? (
          <>
            <div className="inline-cart-control detail-cart-control" role="group" aria-label={`${line.qty} in cart`}>
              <button type="button" onClick={() => setQty(line.key, line.qty - 1)} aria-label={`Decrease ${product.name} quantity`}>−</button>
              <strong>{line.qty} in cart</strong>
              <button type="button" onClick={() => setQty(line.key, line.qty + 1)} aria-label={`Add another ${product.name}`}>+</button>
            </div>
            <Link href="/cart" className="btn btn-outline">View cart</Link>
          </>
        ) : (
          <button className="btn btn-primary" onClick={addToCart}>Add to cart</button>
        )}
        <button className="btn btn-gold" onClick={buyNow}>Buy now</button>
      </div>
      <p style={{ fontSize: "0.78rem", color: "var(--gold-deep)", margin: 0 }}>
        Pay online, or order over WhatsApp or Instagram, at checkout.
      </p>
    </div>
  );
}
