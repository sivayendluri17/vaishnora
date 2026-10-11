// "You may also like" under a product: a scrollable row of other products,
// same category first (see listSimilarProducts). Renders nothing when the
// catalogue has no other products.

import type { Product } from "@vaishnora/core/products";
import ProductCard from "@/components/ProductCard";

export default function SimilarProducts({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <div className="container similar-section">
      <span className="eyebrow">You may also like</span>
      <h2 style={{ marginBottom: "1rem" }}>More to explore</h2>
      <div className="similar-row" aria-label="Similar products">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
