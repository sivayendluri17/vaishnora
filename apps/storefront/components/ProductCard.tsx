"use client";

// Shop grid card. One control: "Add to cart" until the product is in the
// cart, then the quantity stepper. Products that come in sizes send the
// shopper to the product page to choose one, since a card cannot ask.

import Link from "next/link";
import type { Product } from "@vaishnora/core/products";
import { formatINR } from "@vaishnora/core/format";
import { thumbnailFor } from "@vaishnora/core/products";
import { needsSize } from "@vaishnora/core/cart";
import { useCart } from "@/context/CartContext";

export default function ProductCard({ product }: { product: Product }) {
  const { findProduct, add, setQty } = useCart();
  const line = findProduct(product.id);
  const thumb = thumbnailFor(product);
  const hasOffer = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;
  const sized = needsSize(product);

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
    <div className="product-card">
      <Link href={`/product/${product.id}`} style={{ display: "block", color: "inherit", position: "relative" }}>
        {!product.inStock && <span className="card-stock-out">Out of Stock</span>}
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={product.name} className="product-swatch" />
        ) : (
          <div className="product-swatch" style={{ background: product.swatch ?? "var(--parchment)" }} aria-hidden="true" />
        )}
        <div className="product-body">
          <span className="cat">{product.category}</span>
          <h3>{product.name}</h3>
          <span className="price">
            {hasOffer && <span className="card-original">{formatINR(product.price)}</span>}
            {formatINR(hasOffer ? product.salePrice! : product.price)}
          </span>
        </div>
      </Link>
      {!product.inStock ? (
        <button className="card-add-btn" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
          Unavailable
        </button>
      ) : line ? (
        <div className="inline-cart-control" role="group" aria-label={`${line.qty} in cart`}>
          <button type="button" onClick={(e) => changeQuantity(e, line.qty - 1)} aria-label={`Decrease ${product.name} quantity`}>−</button>
          <strong>{line.qty} in cart</strong>
          <button type="button" onClick={(e) => changeQuantity(e, line.qty + 1)} aria-label={`Add another ${product.name}`}>+</button>
        </div>
      ) : sized ? (
        <Link href={`/product/${product.id}`} className="card-add-btn" style={{ textAlign: "center" }}>Choose size</Link>
      ) : (
        <button className="card-add-btn" onClick={handleAdd}>Add to cart</button>
      )}
    </div>
  );
}
