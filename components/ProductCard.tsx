"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/products";
import { formatINR } from "@/lib/format";
import { thumbnailFor } from "@/lib/products";
import { useCart } from "@/context/CartContext";

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const thumb = thumbnailFor(product);
  const hasOffer = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock) return;
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
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
      {product.inStock ? (
        <button className="card-add-btn" onClick={handleAdd}>
          {added ? "Added ✦" : "Add to cart"}
        </button>
      ) : (
        <button className="card-add-btn" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
          Unavailable
        </button>
      )}
    </div>
  );
}
