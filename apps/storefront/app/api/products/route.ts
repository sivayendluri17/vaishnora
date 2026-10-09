// Public: list active products for the storefront.
import { NextResponse } from "next/server";
import { listActiveProducts } from "@vaishnora/core/products-db";

// Cached and rebuilt at most every 5 minutes; admin writes trigger an immediate
// rebuild via /api/revalidate. Rendering on every request hit the database for
// every visit (including uptime probes) and exhausted its monthly allowance.
export const revalidate = 300;

export async function GET() {
  // No try/catch on purpose: if the database is unavailable during a scheduled
  // rebuild, throwing makes Next keep serving the last good cached response
  // instead of caching an error for the next 5 minutes.
  const products = await listActiveProducts();
  return NextResponse.json({ products });
}
