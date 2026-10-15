"use client";

// A scrollable row of product cards for pages that already know what the
// shopper is interested in: the cart, the orders page, the thank-you page.
// Loads the catalogue once per page, drops anything in `exclude`, puts the
// preferred categories first, in-stock first, and shuffles lightly so the
// same eight products do not greet every visit. Renders nothing until loaded
// and nothing at all if there is nothing to show.

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@vaishnora/core/products";
import ProductCard from "./ProductCard";

let cache: { at: number; products: Product[] } | null = null;
const TTL = 5 * 60 * 1000;

async function loadProducts(): Promise<Product[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.products;
  const res = await fetch("/api/products");
  if (!res.ok) return cache?.products ?? [];
  const data = await res.json();
  cache = { at: Date.now(), products: Array.isArray(data.products) ? data.products : [] };
  return cache.products;
}

export default function RecommendationRow({
  eyebrow = "You may also like",
  title = "More to explore",
  exclude = [],
  prefer = [],
  limit = 8,
}: {
  eyebrow?: string;
  title?: string;
  /** Product ids not to show (what is already in the cart or order). */
  exclude?: string[];
  /** Categories to show first (what the shopper is already buying). */
  prefer?: string[];
  limit?: number;
}) {
  const [all, setAll] = useState<Product[] | null>(null);
  // Fixed per mount so the row does not reshuffle on every render.
  const [seed] = useState(() => Math.random());

  useEffect(() => {
    let cancelled = false;
    loadProducts().then((p) => { if (!cancelled) setAll(p); }).catch(() => { if (!cancelled) setAll([]); });
    return () => { cancelled = true; };
  }, []);

  const picks = useMemo(() => {
    if (!all) return [];
    const skip = new Set(exclude);
    const rank = (p: Product) => (p.inStock ? 0 : 2) + (prefer.includes(p.category) ? 0 : 1);
    const jitter = (p: Product) => ((p.id.charCodeAt(0) + p.id.charCodeAt(3) + seed * 97) % 7) / 10;
    return all
      .filter((p) => !skip.has(p.id))
      .map((p) => ({ p, r: rank(p) + jitter(p) }))
      .sort((a, b) => a.r - b.r)
      .slice(0, limit)
      .map((x) => x.p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, exclude.join(","), prefer.join(","), limit, seed]);

  if (picks.length === 0) return null;
  return (
    <div className="similar-section">
      <span className="eyebrow">{eyebrow}</span>
      <h2 style={{ marginBottom: "1rem" }}>{title}</h2>
      <div className="similar-row" aria-label={title}>
        {picks.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
