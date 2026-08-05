"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

const categories = ["All", "Sarees", "Dresses", "Ethnic Wear"] as const;

export default function SearchClient() {
  const params = useSearchParams();
  const initialCat = params.get("cat") ?? "All";
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>(
    (categories as readonly string[]).includes(initialCat) ? initialCat : "All"
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const inCat = cat === "All" || p.category === cat;
      const inQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.fabric.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return inCat && inQuery;
    });
  }, [products, query, cat]);

  return (
    <section className="section">
      <div className="container">
        <span className="eyebrow">The collection</span>
        <h2>Shop Vaishnora</h2>

        <div className="toolbar" role="search">
          <input
            type="search"
            placeholder="Search sarees, fabrics, occasions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search products"
          />
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${cat === c ? "active" : ""}`}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state"><p>Loading the collection…</p></div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <h3>Nothing matches yet</h3>
            <p>Try a different word, or browse a collection above.</p>
          </div>
        ) : (
          <div className="product-grid">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
