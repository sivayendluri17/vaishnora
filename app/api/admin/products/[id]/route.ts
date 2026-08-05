// Admin: update (price, details, photo, visibility) or delete a product.
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { updateProduct, deleteProduct } from "@/lib/products-db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (body.price !== undefined && (isNaN(Number(body.price)) || Number(body.price) <= 0)) {
    return NextResponse.json({ error: "Price must be a positive number." }, { status: 400 });
  }
  try {
    await updateProduct(id, {
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      price: body.price !== undefined ? Math.round(Number(body.price)) : undefined,
      fabric: body.fabric !== undefined ? String(body.fabric).trim() : undefined,
      description: body.description !== undefined ? String(body.description).trim() : undefined,
      imageUrl: body.imageUrl !== undefined ? String(body.imageUrl) : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("product update error:", err);
    return NextResponse.json({ error: "Couldn't update the product." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const { id } = await params;
  try {
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("product delete error:", err);
    return NextResponse.json({ error: "Couldn't delete the product." }, { status: 500 });
  }
}
