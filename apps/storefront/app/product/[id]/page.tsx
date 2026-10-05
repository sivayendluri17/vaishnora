import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveProduct } from "@vaishnora/core/products-db";
import ProductView from "./ProductView";

export const dynamic = "force-dynamic";

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
