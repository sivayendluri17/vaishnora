// Product catalog persistence with colour variants + multiple images.
//
// Tables (run the migration SQL once in Neon — see setup instructions):
//   products         : master record (name, category, price, fabric, description)
//   product_colors   : one row per colour of a product (name, swatch, sort)
//   product_images   : one row per photo (belongs to a colour, angle, sort)

import { neon } from "@neondatabase/serverless";
import type { Product, ProductColor, ProductImage } from "./products";
import { signImageUrl } from "./s3";

const sql = neon(process.env.DATABASE_URL!);

// Assemble colours + images for a set of product ids, with signed URLs.
async function loadColors(productIds: string[]): Promise<Map<string, ProductColor[]>> {
  const map = new Map<string, ProductColor[]>();
  if (productIds.length === 0) return map;

  const colorRows = await sql`
    SELECT id, product_id AS "productId", name, swatch, sort
    FROM product_colors
    WHERE product_id = ANY(${productIds})
    ORDER BY sort ASC, name ASC
  `;
  const colorIds = colorRows.map((c: any) => c.id);

  const imgRows = colorIds.length
    ? await sql`
        SELECT id, color_id AS "colorId", image_key AS "imageKey", angle, sort
        FROM product_images
        WHERE color_id = ANY(${colorIds})
        ORDER BY sort ASC
      `
    : [];

  // sign all image urls
  const imagesByColor = new Map<string, ProductImage[]>();
  for (const r of imgRows as any[]) {
    const url = (await signImageUrl(r.imageKey)) ?? "";
    const list = imagesByColor.get(r.colorId) ?? [];
    list.push({ id: r.id, url, angle: r.angle ?? "", sort: r.sort ?? 0 });
    imagesByColor.set(r.colorId, list);
  }

  for (const c of colorRows as any[]) {
    const list = map.get(c.productId) ?? [];
    list.push({
      id: c.id,
      name: c.name,
      swatch: c.swatch ?? "#7a1230",
      images: imagesByColor.get(c.id) ?? [],
    });
    map.set(c.productId, list);
  }
  return map;
}

function baseSelect() {
  return sql`
    SELECT id, name, category, price, fabric, description, swatch, image_url AS "imageUrl"
    FROM products WHERE active = true ORDER BY created_at DESC
  `;
}

export async function listActiveProducts(): Promise<Product[]> {
  const rows = (await baseSelect()) as any[];
  const colors = await loadColors(rows.map((r) => r.id));
  return Promise.all(rows.map(async (r) => ({
    ...r,
    imageUrl: await signImageUrl(r.imageUrl),
    colors: colors.get(r.id) ?? [],
  })));
}

export async function listAllProducts(): Promise<(Product & { active: boolean })[]> {
  const rows = (await sql`
    SELECT id, name, category, price, fabric, description, swatch, image_url AS "imageUrl", active
    FROM products ORDER BY created_at DESC
  `) as any[];
  const colors = await loadColors(rows.map((r) => r.id));
  return Promise.all(rows.map(async (r) => ({
    ...r,
    imageUrl: await signImageUrl(r.imageUrl),
    colors: colors.get(r.id) ?? [],
  })));
}

export async function getActiveProduct(id: string): Promise<Product | null> {
  const rows = (await sql`
    SELECT id, name, category, price, fabric, description, swatch, image_url AS "imageUrl"
    FROM products WHERE id = ${id} AND active = true
  `) as any[];
  const r = rows[0];
  if (!r) return null;
  const colors = await loadColors([r.id]);
  return { ...r, imageUrl: await signImageUrl(r.imageUrl), colors: colors.get(r.id) ?? [] };
}

// ---- admin writes ----

export async function createProduct(p: {
  name: string; category: string; price: number; fabric: string; description: string;
  colors: { name: string; swatch: string; imageKeys: { key: string; angle: string }[] }[];
}): Promise<string> {
  const rows = (await sql`
    INSERT INTO products (name, category, price, fabric, description)
    VALUES (${p.name}, ${p.category}, ${p.price}, ${p.fabric}, ${p.description})
    RETURNING id
  `) as any[];
  const productId = rows[0].id as string;

  for (let ci = 0; ci < p.colors.length; ci++) {
    const c = p.colors[ci];
    const cRows = (await sql`
      INSERT INTO product_colors (product_id, name, swatch, sort)
      VALUES (${productId}, ${c.name}, ${c.swatch}, ${ci})
      RETURNING id
    `) as any[];
    const colorId = cRows[0].id as string;
    for (let ii = 0; ii < c.imageKeys.length; ii++) {
      const img = c.imageKeys[ii];
      await sql`
        INSERT INTO product_images (color_id, image_key, angle, sort)
        VALUES (${colorId}, ${img.key}, ${img.angle}, ${ii})
      `;
    }
  }
  return productId;
}

export async function updateProduct(id: string, p: {
  name?: string; price?: number; fabric?: string; description?: string; active?: boolean;
}): Promise<void> {
  await sql`
    UPDATE products SET
      name = COALESCE(${p.name ?? null}, name),
      price = COALESCE(${p.price ?? null}, price),
      fabric = COALESCE(${p.fabric ?? null}, fabric),
      description = COALESCE(${p.description ?? null}, description),
      active = COALESCE(${p.active ?? null}, active)
    WHERE id = ${id}
  `;
}

export async function deleteProduct(id: string): Promise<void> {
  // product_colors + product_images cascade-delete via FK
  await sql`DELETE FROM products WHERE id = ${id}`;
}

// add a colour (with images) to an existing product
export async function addColor(productId: string, c: {
  name: string; swatch: string; imageKeys: { key: string; angle: string }[];
}): Promise<void> {
  const sortRows = (await sql`
    SELECT COALESCE(MAX(sort) + 1, 0) AS next FROM product_colors WHERE product_id = ${productId}
  `) as any[];
  const cRows = (await sql`
    INSERT INTO product_colors (product_id, name, swatch, sort)
    VALUES (${productId}, ${c.name}, ${c.swatch}, ${sortRows[0].next})
    RETURNING id
  `) as any[];
  const colorId = cRows[0].id as string;
  for (let ii = 0; ii < c.imageKeys.length; ii++) {
    await sql`
      INSERT INTO product_images (color_id, image_key, angle, sort)
      VALUES (${colorId}, ${c.imageKeys[ii].key}, ${c.imageKeys[ii].angle}, ${ii})
    `;
  }
}

export async function deleteColor(colorId: string): Promise<void> {
  await sql`DELETE FROM product_colors WHERE id = ${colorId}`;
}
