import { notFound } from "next/navigation";
import { getProduct, products } from "@/lib/products";
import AddToCart from "./AddToCart";
import Divider from "@/components/Divider";
import { formatINR } from "@/lib/format";

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();

  return (
    <section className="section">
      <div
        className="container"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "3rem", alignItems: "start" }}
      >
        <div
          className="product-swatch"
          style={{ background: product.swatch, height: "460px", borderRadius: "var(--radius)", boxShadow: "var(--shadow-soft)" }}
          aria-label={`${product.name} fabric preview`}
        />
        <div>
          <span className="eyebrow">{product.category}</span>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>{product.name}</h1>
          <p className="price" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--maroon)" }}>
            {formatINR(product.price)}
          </p>
          <p>{product.description}</p>
          <p style={{ color: "var(--gold-deep)", fontSize: "0.9rem", letterSpacing: "0.08em" }}>
            {product.fabric}
          </p>
          <Divider />
          <AddToCart product={product} />
        </div>
      </div>
    </section>
  );
}
