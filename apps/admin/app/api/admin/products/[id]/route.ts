import { NextResponse } from "next/server";
import { revalidateStorefront } from "@vaishnora/core/revalidate";
import { getAdminUser } from "@vaishnora/core/admin";
import { updateProduct, deleteProduct, addColor, deleteColor, addImagesToColor, deleteImage, migrateLegacyImage, updateColor, updateImageAngle } from "@vaishnora/core/products-db";
import { isItemType } from "@vaishnora/core/catalog";

const imageKeysOf = (list: unknown) =>
  (Array.isArray(list) ? list : []).map((k: any) => ({ key: String(k.key), angle: String(k.angle || "").trim().toLowerCase() }));

// After any catalog change the storefront (a separate app) is asked to refresh
// its cached pages so shoppers see the update right away. See core/revalidate.ts.

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  if (body.prepareEdit) {
    await migrateLegacyImage(id);
    return NextResponse.json({ ok: true });
  }

  try {
    // add a colour to an existing product
    if (body.addColor) {
      await migrateLegacyImage(id);
      await addColor(id, {
        name: String(body.addColor.name || "Default").trim(),
        swatch: String(body.addColor.swatch || "#7a1230"),
        description: String(body.addColor.description ?? "").trim(),
        imageKeys: imageKeysOf(body.addColor.imageKeys),
      });
      await revalidateStorefront(id);
      return NextResponse.json({ ok: true });
    }
    // remove a colour
    if (body.deleteColorId) {
      await deleteColor(String(body.deleteColorId));
      await revalidateStorefront(id);
      return NextResponse.json({ ok: true });
    }
    if (body.addImages) {
      await migrateLegacyImage(id);
      await addImagesToColor(String(body.addImages.colorId), imageKeysOf(body.addImages.imageKeys));
      await revalidateStorefront(id);
      return NextResponse.json({ ok: true });
    }
    if (body.deleteImageId) {
      await deleteImage(String(body.deleteImageId));
      await revalidateStorefront(id);
      return NextResponse.json({ ok: true });
    }
    // edit one colour: name, swatch and its own description
    if (body.updateColor) {
      const c = body.updateColor;
      const name = c.name !== undefined ? String(c.name).trim() : undefined;
      if (name !== undefined && !name) return NextResponse.json({ error: "A colour needs a name." }, { status: 400 });
      const ok = await updateColor(id, String(c.id), {
        name,
        swatch: c.swatch !== undefined ? String(c.swatch) : undefined,
        description: c.description !== undefined ? String(c.description).trim() : undefined,
      });
      if (!ok) return NextResponse.json({ error: "That colour was not found on this product." }, { status: 404 });
      await revalidateStorefront(id);
      return NextResponse.json({ ok: true });
    }
    // relabel one photo (front, pallu, close-up...)
    if (body.updateImage) {
      const ok = await updateImageAngle(id, String(body.updateImage.id), String(body.updateImage.angle ?? "").trim().toLowerCase());
      if (!ok) return NextResponse.json({ error: "That photo was not found on this product." }, { status: 404 });
      await revalidateStorefront(id);
      return NextResponse.json({ ok: true });
    }
    // edit product fields
    if (body.name !== undefined && !String(body.name).trim()) {
      return NextResponse.json({ error: "A product needs a name." }, { status: 400 });
    }
    if (body.category !== undefined && !isItemType(body.category)) {
      return NextResponse.json({ error: "Choose what kind of item this is." }, { status: 400 });
    }
    if (body.price !== undefined && (isNaN(Number(body.price)) || Number(body.price) <= 0)) {
      return NextResponse.json({ error: "Price must be a positive number." }, { status: 400 });
    }
    await updateProduct(id, {
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      category: body.category !== undefined ? String(body.category) : undefined,
      price: body.price !== undefined ? Math.round(Number(body.price)) : undefined,
      salePrice: body.salePrice !== undefined ? (body.salePrice === null || body.salePrice === "" ? null : Math.round(Number(body.salePrice))) : undefined,
      inStock: body.inStock !== undefined ? Boolean(body.inStock) : undefined,
      sizes: body.sizes !== undefined ? (Array.isArray(body.sizes) ? body.sizes.map((s: any) => String(s)) : []) : undefined,
      fabric: body.fabric !== undefined ? String(body.fabric).trim() : undefined,
      description: body.description !== undefined ? String(body.description).trim() : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
    });
    await revalidateStorefront(id);
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
    await revalidateStorefront(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("product delete error:", err);
    return NextResponse.json({ error: "Couldn't delete the product." }, { status: 500 });
  }
}
