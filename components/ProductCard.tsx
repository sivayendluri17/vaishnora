import Link from "next/link";
import type { Product } from "@/lib/products";
import { formatINR } from "@/lib/format";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.id}`} className="product-card">
      <div className="product-swatch" style={{ background: product.swatch }} aria-hidden="true" />
      <div className="product-body">
        <span className="cat">{product.category}</span>
        <h3>{product.name}</h3>
        <span className="price">{formatINR(product.price)}</span>
      </div>
    </Link>
  );
}
