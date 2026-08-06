"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/products";
import { formatINR, } from "@/lib/format";
import { thumbnailFor } from "@/lib/products";
import { useCart } from "@/context/CartContext";

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const thumb = thumbnailFor(product);

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();   // don't navigate to the detail page
    e.stopPropagation();
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className="product-card">
      <Link href={`/product/${product.id}`} style={{ display: "block", color: "inherit" }}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={product.name} className="product-swatch" style={{ objectFit: "cover", width: "100%" }} />
        ) : (
          <div className="product-swatch" style={{ background: product.swatch ?? "var(--parchment)" }} aria-hidden="true" />
        )}
        <div className="product-body">
          <span className="cat">{product.category}</span>
          <h3>{product.name}</h3>
          <span className="price">{formatINR(product.price)}</span>
        </div>
      </Link>
      <button className="card-add-btn" onClick={handleAdd}>
        {added ? "Added ✦" : "Add to cart"}
      </button>
    </div>
  );
}
