// Admin: list all products (incl. hidden) and create new ones.
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { listAllProducts, createProduct } from "@/lib/products-db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const products = await listAllProducts();
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const { name, category, price, fabric, description, imageUrl } = body ?? {};
  if (!name || !category || !price || Number(price) <= 0) {
    return NextResponse.json({ error: "Name, category, and a valid price are required." }, { status: 400 });
  }
  try {
    const product = await createProduct({
      name: String(name).trim(),
      category: String(category),
      price: Math.round(Number(price)),
      fabric: String(fabric ?? "").trim(),
      description: String(description ?? "").trim(),
      imageUrl: imageUrl ? String(imageUrl) : null,
    });
    return NextResponse.json({ ok: true, product });
  } catch (err) {
    console.error("product create error:", err);
    return NextResponse.json({ error: "Couldn't create the product." }, { status: 500 });
  }
}
