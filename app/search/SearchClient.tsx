"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/lib/products";
import { thumbnailFor } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import ProductSearchBox from "@/components/ProductSearchBox";

const categories = ["All", "Sarees", "Dresses", "Ethnic Wear", "Accessories", "Jewellery"] as const;

export default function SearchClient() {
  const params = useSearchParams();
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [cat, setCat] = useState<string>(() => {
    const initialCat = params.get("cat") ?? "All";
    return (categories as readonly string[]).includes(initialCat) ? initialCat : "All";
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setQuery(params.get("q") ?? "");
    const nextCat = params.get("cat") ?? "All";
    setCat((categories as readonly string[]).includes(nextCat) ? nextCat : "All");
  }, [params]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts((d.products ?? []).filter((p: Product) => thumbnailFor(p))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const inCat = cat === "All" || p.category === cat;
      const searchableText = [p.name, p.category, p.fabric, p.description, p.asin]
        .filter((value): value is string => typeof value === "string")
        .join(" ")
        .toLowerCase();
      const inQuery = !q || searchableText.includes(q);
      return inCat && inQuery;
    });
  }, [products, query, cat]);

  return (
    <section className="section">
      <div className="container">
        <span className="eyebrow">The collection</span>
        <h2>Shop Vaishnora</h2>

        <div className="toolbar">
          <ProductSearchBox
            products={cat === "All" ? products : products.filter((product) => product.category === cat)}
            value={query}
            onChange={setQuery}
            wrapperClassName="catalog-search-wrap"
            formClassName="catalog-search"
            placeholder="Search sarees, fabrics, occasions…"
            ariaLabel="Search products"
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
