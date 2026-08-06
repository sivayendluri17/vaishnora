import Link from "next/link";
import type { Product } from "@/lib/products";
import { formatINR } from "@/lib/format";
import { thumbnailFor } from "@/lib/products";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.id}`} className="product-card">
      {thumbnailFor(product) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailFor(product)!}
          alt={product.name}
          className="product-swatch"
          style={{ objectFit: "cover", width: "100%" }}
        />
      ) : (
        <div
          className="product-swatch"
          style={{ background: product.swatch ?? "var(--parchment)" }}
          aria-hidden="true"
        />
      )}
      <div className="product-body">
        <span className="cat">{product.category}</span>
        <h3>{product.name}</h3>
        <span className="price">{formatINR(product.price)}</span>
      </div>
    </Link>
  );
}
