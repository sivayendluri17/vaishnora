"use client";

// The two-column product layout. It owns which colour is selected, because
// three things depend on it: the gallery photos, the description (a colour can
// have its own), and the colour named in a WhatsApp or Instagram order.

import { useState } from "react";
import type { Product } from "@vaishnora/core/products";
import { descriptionFor } from "@vaishnora/core/products";
import { formatINR } from "@vaishnora/core/format";
import Divider from "@/components/Divider";
import AddToCart from "./AddToCart";
import Gallery from "./Gallery";

export default function ProductView({ product }: { product: Product }) {
  const [colorIdx, setColorIdx] = useState(0);
  const color = product.colors?.[colorIdx] ?? null;
  const hasOffer = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;
  const description = descriptionFor(product, color);

  return (
    <div
      className="container"
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "3rem", alignItems: "start", marginTop: "1rem" }}
    >
      <Gallery product={product} colorIdx={colorIdx} onColorChange={setColorIdx} />

      <div>
        <span className="eyebrow">{product.category}</span>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>{product.name}</h1>

        {/* Price with optional offer */}
        <div className="price-block">
          {hasOffer ? (
            <>
              <span className="price-original">{formatINR(product.price)}</span>
              <span className="price-sale">{formatINR(product.salePrice!)}</span>
              <span className="price-off">
                {Math.round(((product.price - product.salePrice!) / product.price) * 100)}% off
              </span>
            </>
          ) : (
            <span className="price-sale">{formatINR(product.price)}</span>
          )}
        </div>

        {!product.inStock && <p className="stock-badge out">Out of Stock</p>}

        {description && <p style={{ whiteSpace: "pre-line" }}>{description}</p>}
        {product.fabric && (
          <p style={{ color: "var(--gold-deep)", fontSize: "0.9rem", letterSpacing: "0.08em" }}>
            {product.fabric}
          </p>
        )}
        <Divider />
        <AddToCart product={product} colourName={color?.name} />
      </div>
    </div>
  );
}
