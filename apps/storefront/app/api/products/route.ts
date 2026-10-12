// Public: list active products for the storefront.
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { listActiveProducts } from "@vaishnora/core/products-db";

// The catalog query is cached for 5 minutes (admin writes clear it at once via
// /api/revalidate, tag "products"). Hitting the database on every request,
// including uptime probes, once exhausted its monthly allowance.
//
// The route itself is not prerendered: a build-time prerender would need a
// live database, which CI does not have, and would bake an empty catalog if
// the database blinked during a deploy. If a refresh fails, the cache keeps
// serving the last good list rather than caching the error.
export const dynamic = "force-dynamic";

const cachedProducts = unstable_cache(listActiveProducts, ["api-products"], { revalidate: 300, tags: ["products"] });

export async function GET() {
  const products = await cachedProducts();
  return NextResponse.json({ products });
}
