"use client";

import Link from "next/link";
import type { Product } from "@/lib/products";
import { formatINR } from "@/lib/format";
import { thumbnailFor } from "@/lib/products";
import { useCart } from "@/context/CartContext";

export default function ProductCard({ product }: { product: Product }) {
  const { items, add, setQty, remove } = useCart();
  const quantity = items.find((item) => item.product.id === product.id)?.qty ?? 0;
  const thumb = thumbnailFor(product);
  const hasOffer = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock) return;
    add(product);
  }

  function changeQuantity(e: React.MouseEvent, nextQuantity: number) {
    e.preventDefault();
    e.stopPropagation();
    if (nextQuantity <= 0) remove(product.id);
    else setQty(product.id, nextQuantity);
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
        quantity === 0 ? (
          <button className="card-add-btn" onClick={handleAdd}>Add to cart</button>
        ) : (
          <div className="inline-cart-control" role="group" aria-label={`${quantity} in cart`}>
            <button type="button" onClick={(e) => changeQuantity(e, quantity - 1)} aria-label={`Decrease ${product.name} quantity`}>−</button>
            <strong>{quantity} in cart</strong>
            <button type="button" onClick={(e) => changeQuantity(e, quantity + 1)} aria-label={`Add another ${product.name}`}>+</button>
          </div>
        )
      ) : (
        <button className="card-add-btn" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
          Unavailable
        </button>
      )}
    </div>
  );
}
