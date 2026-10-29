"use client";

// The two-column product layout. It owns which colour is selected, because
// three things depend on it: the gallery photos, the description (a colour can
// have its own), and the colour on the cart line.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Product } from "@vaishnora/core/products";
import { colourIndexFor, descriptionFor } from "@vaishnora/core/products";
import { specEntries } from "@vaishnora/core/catalog";
import Price from "@/components/Price";
import Accordion from "@/components/Accordion";
import AddToCart from "./AddToCart";
import Gallery from "./Gallery";
import { CARE_BY_CATEGORY, DELIVERY_POINTS, SIZE_GUIDE } from "./details";

const READ_MORE_AT = 260;

export default function ProductView({ product }: { product: Product }) {
  const [colorIdx, setColorIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const urlRead = useRef(false);

  // Open on the colour named in the link (?colour=Black), e.g. from an order
  // email or the cart. Read after mount because this page is cached as HTML.
  useEffect(() => {
    const idx = colourIndexFor(product, new URLSearchParams(window.location.search).get("colour"));
    if (idx >= 0) setColorIdx(idx);
    urlRead.current = true;
  }, [product]);

  // Keep the address in step with the chosen colour so sharing the page
  // (or coming back to it) lands on the same colour.
  useEffect(() => {
    if (!urlRead.current || (product.colors?.length ?? 0) < 2) return;
    const name = product.colors?.[colorIdx]?.name;
    if (!name) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("colour") === name) return;
    url.searchParams.set("colour", name);
    window.history.replaceState(window.history.state, "", url);
  }, [product, colorIdx]);
  const color = product.colors?.[colorIdx] ?? null;
  const hasOffer = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;
  const description = descriptionFor(product, color);
  const long = description.length > READ_MORE_AT;
  const shown = long && !expanded ? description.slice(0, READ_MORE_AT).replace(/\s+\S*$/, "") + "…" : description;
  const care = CARE_BY_CATEGORY[product.category] ?? CARE_BY_CATEGORY.Accessories;
  const hasSizes = (product.sizes?.length ?? 0) > 0;
  const entries = specEntries(product.specs, product.category);
  const measurements = entries.filter((e) => e.group === "measurements");
  const details = entries.filter((e) => e.group === "details" && e.key !== "careNote" && e.key !== "washCare");
  const careNote = entries.find((e) => e.key === "careNote")?.value;
  const washCare = entries.find((e) => e.key === "washCare")?.value;

  return (
    <div className="container pdp">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">›</span>
        <Link href="/search">Shop</Link>
        <span aria-hidden="true">›</span>
        <Link href={`/search?cat=${encodeURIComponent(product.category)}`}>{product.category}</Link>
        <span aria-hidden="true">›</span>
        <span className="breadcrumb-current">{product.name}</span>
      </nav>

      <div className="pdp-grid">
        <div className="pdp-gallery">
          <Gallery product={product} colorIdx={colorIdx} onColorChange={setColorIdx} />
        </div>

        <div className="pdp-info">
          <span className="eyebrow">{product.category}</span>
          <h1 className="pdp-title">{product.name}</h1>

          {/* Price with optional offer */}
          <div className="price-block">
            <Price amount={hasOffer ? product.salePrice! : product.price} original={hasOffer ? product.price : null} size="xl" />
          </div>
          <p className="pdp-tax">
            Inclusive of all taxes · Delivery calculated at checkout
            {product.inStock && <span className="stock-ok"><i /> In stock, ships in 2–3 days</span>}
          </p>

          {!product.inStock && <p className="stock-badge out">Out of Stock</p>}

          <AddToCart product={product} colourName={color?.name} />

          <ul className="trust-strip" aria-label="Why shop with us">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>
              <span>Secure payments<small>UPI · Cards · Net banking</small></span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></svg>
              <span>Pan-India delivery<small>Dispatch in 2–3 days</small></span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.2L4 21l1.8-5.4A8 8 0 1 1 21 12Z" /></svg>
              <span>WhatsApp support<small>Reply the same day</small></span>
            </li>
          </ul>

          {description && (
            <div className="pdp-desc">
              <p style={{ whiteSpace: "pre-line" }}>{shown}</p>
              {long && (
                <button type="button" className="link-btn" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? "Read less" : "Read more"}
                </button>
              )}
            </div>
          )}

          <div className="pdp-accordions">
            {(details.length > 0 || measurements.length > 0) && (
              <Accordion title="Details" defaultOpen>
                {measurements.length > 0 && (
                  <dl className="pdp-specs">
                    {measurements.map((e) => (<div key={e.key}><dt>{e.label}</dt><dd>{e.value}</dd></div>))}
                  </dl>
                )}
                {details.length > 0 && (
                  <dl className="pdp-details">
                    {details.map((e) => (<div key={e.key}><dt>{e.label}</dt><dd>{e.value}</dd></div>))}
                  </dl>
                )}
              </Accordion>
            )}
            <Accordion title="Fabric & care" defaultOpen={details.length === 0 && measurements.length === 0}>
              {product.fabric && <p className="pdp-fabric">{product.fabric}</p>}
              <ul>
                {washCare && <li><strong>{washCare}.</strong></li>}
                {careNote && <li>{careNote}</li>}
                {care.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </Accordion>
            <Accordion title="Delivery & payment">
              <ul>{DELIVERY_POINTS.map((d) => <li key={d}>{d}</li>)}</ul>
            </Accordion>
            {hasSizes && (
              <Accordion title="Size guide">
                <p className="pdp-sizes">Available in: {product.sizes.join(", ")}</p>
                <ul>{SIZE_GUIDE.map((s) => <li key={s}>{s}</li>)}</ul>
              </Accordion>
            )}
          </div>

          <p className="pdp-sku">Product code {product.asin}</p>
        </div>
      </div>
    </div>
  );
}
