"use client";

import { useMemo, useRef, useState } from "react";
import type { Product } from "@vaishnora/core/products";

// The selected colour is owned by ProductView, which also uses it for the
// description and the order message.
//
// The arrows, dots and swipe walk through EVERY photo of EVERY colour in order,
// switching colour when they cross from one colour's last photo to the next
// colour's first. A product with four colours and one photo each therefore
// still has arrows, instead of hiding them because no single colour has two photos.
export default function Gallery({ product, colorIdx, onColorChange }: { product: Product; colorIdx: number; onColorChange: (index: number) => void }) {
  const colors = product.colors ?? [];
  const [imgIdx, setImgIdx] = useState(0);
  const touchX = useRef<number | null>(null);

  const activeColor = colors[colorIdx];
  const images = activeColor?.images ?? [];
  const mainUrl = images[imgIdx]?.url ?? product.imageUrl ?? null;

  // Every photo as one flat list of slides: [colour 0 photos..., colour 1 photos..., ...]
  const slides = useMemo(
    () => colors.flatMap((c, ci) => c.images.map((img, ii) => ({ ci, ii, id: img.id, colour: c.name, angle: img.angle }))),
    [colors]
  );
  const current = slides.findIndex((s) => s.ci === colorIdx && s.ii === imgIdx);

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

  function goTo(slideIndex: number) {
    const s = slides[(slideIndex + slides.length) % slides.length];
    if (!s) return;
    if (s.ci !== colorIdx) onColorChange(s.ci);
    setImgIdx(s.ii);
  }
  const step = (delta: number) => goTo((current < 0 ? 0 : current) + delta);

  function selectColor(i: number) {
    onColorChange(i);
    setImgIdx(0);
  }

  const many = slides.length > 1;
  const describe = (s: { colour: string; angle: string }) => [colors.length > 1 ? s.colour : "", s.angle].filter(Boolean).join(", ");

  return (
    <div className="gallery">
      {/* main image */}
      <div
        className="gallery-main"
        onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          if (start == null || !many) return;
          const dx = (e.changedTouches[0]?.clientX ?? start) - start;
          if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1); // swipe left = next
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mainUrl ?? ""} alt={`${product.name} — ${activeColor.name} ${images[imgIdx]?.angle ?? ""}`} />
        {many && (
          <>
            <button type="button" className="gallery-arrow left" aria-label="Previous photo" onClick={() => step(-1)}>‹</button>
            <button type="button" className="gallery-arrow right" aria-label="Next photo" onClick={() => step(1)}>›</button>
            {slides.length <= 12 && (
              <div className="gallery-dots" aria-label="Choose a photo">
                {slides.map((s, i) => (
                  <button
                    type="button"
                    key={s.id}
                    className={`gallery-dot ${i === current ? "active" : ""}`}
                    onClick={() => goTo(i)}
                    aria-label={`Photo ${i + 1} of ${slides.length}${describe(s) ? `: ${describe(s)}` : ""}`}
                    aria-current={i === current ? "true" : undefined}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* angle thumbnails for the selected colour */}
      {images.length > 1 && (
        <div className="gallery-thumbs">
          {images.map((img, i) => (
            <button
              type="button"
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
          <div className="twister-label" aria-live="polite">Colour: <strong>{activeColor.name}</strong></div>
          <div className="twister-dots">
            {colors.map((c, i) => (
              <button
                type="button"
                key={c.id}
                className={`twister-dot ${i === colorIdx ? "active" : ""}`}
                style={{ background: c.swatch }}
                onClick={() => selectColor(i)}
                aria-label={c.name}
                aria-pressed={i === colorIdx}
                title={c.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
