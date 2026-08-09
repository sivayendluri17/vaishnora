import { notFound } from "next/navigation";
import Link from "next/link";
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

  const hasOffer = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;

  return (
    <section className="section">
      <div className="container">
        <Link href="/search" className="back-link">← Back to shop</Link>
      </div>
      <div
        className="container"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "3rem", alignItems: "start", marginTop: "1rem" }}
      >
        <Gallery product={product} />

        <div>
          <span className="eyebrow">{product.category}</span>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>{product.name}</h1>

          {/* Price with optional offer */}
          <div className="price-block">
            {hasOffer ? (
              <>
                <span className="price-original">{formatINR(product.price)}</span>
                <span className="price-sale">{formatINR(product.salePrice!)}</span>
                <span className="price-off">
                  {Math.round(((product.price - product.salePrice!) / product.price) * 100)}% off
                </span>
              </>
            ) : (
              <span className="price-sale">{formatINR(product.price)}</span>
            )}
          </div>

          {!product.inStock && <p className="stock-badge out">Out of Stock</p>}

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
