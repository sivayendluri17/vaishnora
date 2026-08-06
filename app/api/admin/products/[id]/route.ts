import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { updateProduct, deleteProduct, addColor, deleteColor } from "@/lib/products-db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  try {
    // add a colour to an existing product
    if (body.addColor) {
      await addColor(id, {
        name: String(body.addColor.name || "Default").trim(),
        swatch: String(body.addColor.swatch || "#7a1230"),
        imageKeys: (body.addColor.imageKeys || []).map((k: any) => ({ key: String(k.key), angle: String(k.angle || "") })),
      });
      return NextResponse.json({ ok: true });
    }
    // remove a colour
    if (body.deleteColorId) {
      await deleteColor(String(body.deleteColorId));
      return NextResponse.json({ ok: true });
    }
    // edit product fields
    if (body.price !== undefined && (isNaN(Number(body.price)) || Number(body.price) <= 0)) {
      return NextResponse.json({ error: "Price must be a positive number." }, { status: 400 });
    }
    await updateProduct(id, {
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      price: body.price !== undefined ? Math.round(Number(body.price)) : undefined,
      fabric: body.fabric !== undefined ? String(body.fabric).trim() : undefined,
      description: body.description !== undefined ? String(body.description).trim() : undefined,
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
