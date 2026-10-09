import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveProduct } from "@vaishnora/core/products-db";
import ProductView from "./ProductView";

// Cached and rebuilt at most every 5 minutes; admin writes trigger an immediate
// rebuild via /api/revalidate. Rendering on every request hit the database for
// every visit (including uptime probes) and exhausted its monthly allowance.
export const revalidate = 300;

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getActiveProduct(id).catch(() => null);
  if (!product) notFound();

  return (
    <section className="section">
      <div className="container">
        <Link href="/search" className="back-link">← Back to shop</Link>
      </div>
      <ProductView product={product} />
    </section>
  );
}
