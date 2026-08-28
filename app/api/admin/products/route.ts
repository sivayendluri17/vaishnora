// Admin: list all products, and create a product with colour variants + images.
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin";
import { listAllProducts, createProduct } from "@/lib/products-db";

export const dynamic = "force-dynamic";

// After any catalog change, refresh the cached storefront surfaces so shoppers
// see the update right away instead of waiting for the time-based revalidate.
function revalidateStorefront() {
  revalidatePath("/");             // home (category preview images)
  revalidatePath("/api/products"); // shop grid data (fetched by /search)
}

export async function GET() {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const products = await listAllProducts();
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const { name, category, price, salePrice, inStock, sizes, fabric, description, colors } = body ?? {};

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
      salePrice: salePrice ? Math.round(Number(salePrice)) : null,
      inStock: inStock === undefined ? true : Boolean(inStock),
      sizes: Array.isArray(sizes) ? sizes.map((s: any) => String(s)) : [],
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
    revalidateStorefront(); // new product -> refresh home + shop grid immediately
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("product create error:", err);
    return NextResponse.json({ error: "Couldn't create the product." }, { status: 500 });
  }
}
