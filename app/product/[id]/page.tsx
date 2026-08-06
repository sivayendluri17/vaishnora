import { notFound } from "next/navigation";
import { getActiveProduct } from "@/lib/products-db";
import AddToCart from "./AddToCart";
import Gallery from "./Gallery";
import Divider from "@/components/Divider";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getActiveProduct(id).catch(() => null);
  if (!product) notFound();

  return (
    <section className="section">
      <div
        className="container"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "3rem", alignItems: "start" }}
      >
        <Gallery product={product} />

        <div>
          <span className="eyebrow">{product.category}</span>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>{product.name}</h1>
          <p className="price" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--maroon)" }}>
            {formatINR(product.price)}
          </p>
          <p>{product.description}</p>
          {product.fabric && (
            <p style={{ color: "var(--gold-deep)", fontSize: "0.9rem", letterSpacing: "0.08em" }}>
              {product.fabric}
            </p>
          )}
          <Divider />
          <AddToCart product={product} />
        </div>
      </div>
    </section>
  );
}
