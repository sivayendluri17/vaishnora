"use client";

// Shop grid card. Every card has the same shape: a 3:4 photo, category, a
// two-line name, a fixed price row, colour dots, and one control at the
// bottom ("Add to cart", the quantity stepper, or "Choose size" for sized
// products, since a card cannot ask for a size). On desktop the second photo
// shows on hover.

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@vaishnora/core/products";
import { formatINR } from "@vaishnora/core/format";
import { thumbnailFor } from "@vaishnora/core/products";
import { needsSize } from "@vaishnora/core/cart";
import { useCart } from "@/context/CartContext";

const MAX_DOTS = 4;

export default function ProductCard({ product }: { product: Product }) {
  const { findProduct, add, setQty } = useCart();
  const [hover, setHover] = useState(false);
  const line = findProduct(product.id);
  const thumb = thumbnailFor(product);
  const second = product.colors?.[0]?.images?.[1]?.url ?? product.colors?.[1]?.images?.[0]?.url ?? null;
  const hasOffer = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;
  const off = hasOffer ? Math.round(((product.price - product.salePrice!) / product.price) * 100) : 0;
  const sized = needsSize(product);
  const colours = product.colors ?? [];

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock) return;
    add(product);
  }

  function changeQuantity(e: React.MouseEvent, nextQuantity: number) {
    e.preventDefault();
    e.stopPropagation();
    if (line) setQty(line.key, nextQuantity);
  }

  return (
    <article className="product-card" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Link href={`/product/${product.id}`} className="product-card-link">
        <div className="product-media">
          {!product.inStock && <span className="card-badge card-badge-out">Out of stock</span>}
          {product.inStock && hasOffer && <span className="card-badge card-badge-sale">{off}% off</span>}
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hover && second ? second : thumb} alt={product.name} loading="lazy" decoding="async" />
          ) : (
            <div className="product-media-swatch" style={{ background: product.swatch ?? "var(--parchment)" }} aria-hidden="true" />
          )}
        </div>
        <div className="product-body">
          <span className="cat">{product.category}</span>
          <h3 title={product.name}>{product.name}</h3>
          <div className="product-price-row">
            <span className="price">
              {hasOffer && <span className="card-original">{formatINR(product.price)}</span>}
              {formatINR(hasOffer ? product.salePrice! : product.price)}
            </span>
            {colours.length > 1 && (
              <span className="card-dots" aria-label={`${colours.length} colours`}>
                {colours.slice(0, MAX_DOTS).map((c) => <i key={c.id} style={{ background: c.swatch }} title={c.name} />)}
                {colours.length > MAX_DOTS && <small>+{colours.length - MAX_DOTS}</small>}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="product-card-action">
        {!product.inStock ? (
          <button className="card-add-btn" disabled>Unavailable</button>
        ) : line ? (
          <div className="inline-cart-control" role="group" aria-label={`${line.qty} in cart`}>
            <button type="button" onClick={(e) => changeQuantity(e, line.qty - 1)} aria-label={`Decrease ${product.name} quantity`}>−</button>
            <strong>{line.qty} in cart</strong>
            <button type="button" onClick={(e) => changeQuantity(e, line.qty + 1)} aria-label={`Add another ${product.name}`}>+</button>
          </div>
        ) : sized ? (
          <Link href={`/product/${product.id}`} className="card-add-btn">Choose size</Link>
        ) : (
          <button className="card-add-btn" onClick={handleAdd}>Add to cart</button>
        )}
      </div>
    </article>
  );
}
