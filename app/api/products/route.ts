// Public: list active products for the storefront.
import { NextResponse } from "next/server";
import { listActiveProducts } from "@/lib/products-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await listActiveProducts();
    return NextResponse.json({ products });
  } catch (err) {
    console.error("products list error:", err);
    return NextResponse.json({ error: "Couldn't load products." }, { status: 500 });
  }
}
