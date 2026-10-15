"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@vaishnora/core/products";

// The selected colour is owned by ProductView, which also uses it for the
// description and the cart line.
//
// The arrows, dots and swipe walk through EVERY photo of EVERY colour in order,
// switching colour when they cross from one colour's last photo to the next
// colour's first. On desktop the main photo zooms under the cursor; a tap or
// click opens a full-screen lightbox with the same navigation.
export default function Gallery({ product, colorIdx, onColorChange }: { product: Product; colorIdx: number; onColorChange: (index: number) => void }) {
  const colors = product.colors ?? [];
  const [imgIdx, setImgIdx] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const touchX = useRef<number | null>(null);

  const activeColor = colors[colorIdx];
  const images = activeColor?.images ?? [];
  const mainUrl = images[imgIdx]?.url ?? product.imageUrl ?? null;

  // Every photo as one flat list of slides: [colour 0 photos..., colour 1 photos..., ...]
  const slides = useMemo(
    () => colors.flatMap((c, ci) => c.images.map((img, ii) => ({ ci, ii, id: img.id, url: img.url, colour: c.name, angle: img.angle }))),
    [colors]
  );
  const current = slides.findIndex((s) => s.ci === colorIdx && s.ii === imgIdx);
  const many = slides.length > 1;

  const goTo = useCallback((slideIndex: number) => {
    const s = slides[(slideIndex + slides.length) % slides.length];
    if (!s) return;
    if (s.ci !== colorIdx) onColorChange(s.ci);
    setImgIdx(s.ii);
  }, [slides, colorIdx, onColorChange]);
  const step = useCallback((delta: number) => goTo((current < 0 ? 0 : current) + delta), [goTo, current]);

  // Lightbox: keyboard, and lock page scroll while open.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight" && many) step(1);
      if (e.key === "ArrowLeft" && many) step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [lightbox, many, step]);

  // Fallback: no colour variants → show the legacy single image, or gradient.
  if (!activeColor || images.length === 0) {
    if (product.imageUrl) {
      return (
        <div className="gallery">
          <div className="gallery-main">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.imageUrl} alt={product.name} />
          </div>
        </div>
      );
    }
    return (
      <div className="gallery">
        <div className="gallery-main" style={{ background: product.swatch ?? "var(--parchment)" }} aria-label={`${product.name} preview`} />
      </div>
    );
  }

  function selectColor(i: number) {
    onColorChange(i);
    setImgIdx(0);
  }

  const describe = (s: { colour: string; angle: string }) => [colors.length > 1 ? s.colour : "", s.angle].filter(Boolean).join(", ");
  const label = `${product.name} — ${activeColor.name} ${images[imgIdx]?.angle ?? ""}`.trim();

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  }

  return (
    <div className="gallery">
      {/* main image */}
      <div
        className={`gallery-main ${zoom ? "is-zoomed" : ""}`}
        onMouseMove={onMove}
        onMouseLeave={() => setZoom(null)}
        onClick={() => setLightbox(true)}
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
        <img
          src={mainUrl ?? ""}
          alt={label}
          style={zoom ? { transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
        <span className="gallery-hint" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M11 8v6M8 11h6" /></svg>
          Tap to zoom
        </span>
        {many && (
          <>
            <button type="button" className="gallery-arrow left" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); step(-1); }}>‹</button>
            <button type="button" className="gallery-arrow right" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); step(1); }}>›</button>
            {slides.length <= 12 && (
              <div className="gallery-dots" aria-label="Choose a photo" onClick={(e) => e.stopPropagation()}>
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

      {/* lightbox */}
      {lightbox && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${product.name} photos`} onClick={() => setLightbox(false)}>
          <button type="button" className="lightbox-close" aria-label="Close" onClick={() => setLightbox(false)}>×</button>
          <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mainUrl ?? ""} alt={label} />
            {many && (
              <>
                <button type="button" className="gallery-arrow left" aria-label="Previous photo" onClick={() => step(-1)}>‹</button>
                <button type="button" className="gallery-arrow right" aria-label="Next photo" onClick={() => step(1)}>›</button>
              </>
            )}
          </div>
          <div className="lightbox-caption" onClick={(e) => e.stopPropagation()}>
            {many ? `${current + 1} / ${slides.length} · ` : ""}{describe({ colour: activeColor.name, angle: images[imgIdx]?.angle ?? "" }) || product.name}
          </div>
        </div>
      )}
    </div>
  );
}
