"use client";

import { useState } from "react";
import type { Product } from "@/lib/products";

export default function Gallery({ product }: { product: Product }) {
  const colors = product.colors ?? [];
  const [colorIdx, setColorIdx] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);

  const activeColor = colors[colorIdx];
  const images = activeColor?.images ?? [];
  const mainUrl = images[imgIdx]?.url ?? product.imageUrl ?? null;

  // Fallback: no colour variants → show the legacy single image, or gradient.
  if (!activeColor || images.length === 0) {
    if (product.imageUrl) {
      return (
        <img
          src={product.imageUrl}
          alt={product.name}
          style={{
            width: "100%", height: "auto", maxHeight: "620px", objectFit: "contain",
            borderRadius: "var(--radius)", boxShadow: "var(--shadow-soft)", display: "block",
          }}
        />
      );
    }
    return (
      <div
        className="product-swatch"
        style={{
          background: product.swatch ?? "var(--parchment)",
          height: "460px", borderRadius: "var(--radius)", boxShadow: "var(--shadow-soft)",
        }}
        aria-label={`${product.name} preview`}
      />
    );
  }

  function selectColor(i: number) {
    setColorIdx(i);
    setImgIdx(0);
  }

  return (
    <div className="gallery">
      {/* main image */}
      <div className="gallery-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mainUrl ?? ""} alt={`${product.name} — ${activeColor.name} ${images[imgIdx]?.angle ?? ""}`} />
        {images.length > 1 && (
          <>
            <button
              className="gallery-arrow left"
              aria-label="Previous image"
              onClick={() => setImgIdx((imgIdx - 1 + images.length) % images.length)}
            >‹</button>
            <button
              className="gallery-arrow right"
              aria-label="Next image"
              onClick={() => setImgIdx((imgIdx + 1) % images.length)}
            >›</button>
          </>
        )}
      </div>

      {/* angle thumbnails */}
      {images.length > 1 && (
        <div className="gallery-thumbs">
          {images.map((img, i) => (
            <button
              key={img.id}
              className={`gallery-thumb ${i === imgIdx ? "active" : ""}`}
              onClick={() => setImgIdx(i)}
              aria-label={img.angle || `View ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.angle} />
            </button>
          ))}
        </div>
      )}

      {/* colour twister */}
      {colors.length > 1 && (
        <div className="twister">
          <div className="twister-label">Colour: <strong>{activeColor.name}</strong></div>
          <div className="twister-dots">
            {colors.map((c, i) => (
              <button
                key={c.id}
                className={`twister-dot ${i === colorIdx ? "active" : ""}`}
                style={{ background: c.swatch }}
                onClick={() => selectColor(i)}
                aria-label={c.name}
                title={c.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
