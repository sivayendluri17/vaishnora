// Admin: list all products, and create a product with colour variants + images.
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
  const { name, category, price, fabric, description, colors } = body ?? {};

  if (!name || !category || !price || Number(price) <= 0) {
    return NextResponse.json({ error: "Name, category, and a valid price are required." }, { status: 400 });
  }
  if (!Array.isArray(colors) || colors.length === 0) {
    return NextResponse.json({ error: "Add at least one colour with a photo." }, { status: 400 });
  }

  try {
    const id = await createProduct({
      name: String(name).trim(),
      category: String(category),
      price: Math.round(Number(price)),
      fabric: String(fabric ?? "").trim(),
      description: String(description ?? "").trim(),
      colors: colors.map((c: any) => ({
        name: String(c.name || "Default").trim(),
        swatch: String(c.swatch || "#7a1230"),
        imageKeys: Array.isArray(c.imageKeys)
          ? c.imageKeys.map((k: any) => ({ key: String(k.key), angle: String(k.angle || "") }))
          : [],
      })),
    });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("product create error:", err);
    return NextResponse.json({ error: "Couldn't create the product." }, { status: 500 });
  }
}
