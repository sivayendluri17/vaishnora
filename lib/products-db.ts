// Product catalog persistence (Neon Postgres).
//
// Table schema (run once in the Neon SQL editor — see setup instructions):
//   CREATE TABLE IF NOT EXISTS products (
//     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     name TEXT NOT NULL,
//     category TEXT NOT NULL,
//     price INTEGER NOT NULL,
//     fabric TEXT NOT NULL DEFAULT '',
//     description TEXT NOT NULL DEFAULT '',
//     swatch TEXT,
//     image_url TEXT,
//     active BOOLEAN NOT NULL DEFAULT true,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
//   );

import { neon } from "@neondatabase/serverless";
import type { Product } from "./products";
import { signImageUrl } from "./s3";

const sql = neon(process.env.DATABASE_URL!);


async function signList<T extends { imageUrl: string | null }>(rows: T[]): Promise<T[]> {
  return Promise.all(rows.map(async (r) => ({ ...r, imageUrl: await signImageUrl(r.imageUrl) })));
}

const COLS = `id, name, category, price, fabric, description, swatch, image_url AS "imageUrl"`;

export async function listActiveProducts(): Promise<Product[]> {
  const rows = await sql`
    SELECT id, name, category, price, fabric, description, swatch, image_url AS "imageUrl"
    FROM products WHERE active = true ORDER BY created_at DESC
  `;
  return signList(rows as Product[]);
}

export async function listAllProducts(): Promise<(Product & { active: boolean })[]> {
  const rows = await sql`
    SELECT id, name, category, price, fabric, description, swatch, image_url AS "imageUrl", active
    FROM products ORDER BY created_at DESC
  `;
  return signList(rows as (Product & { active: boolean })[]);
}

export async function getActiveProduct(id: string): Promise<Product | null> {
  const rows = await sql`
    SELECT id, name, category, price, fabric, description, swatch, image_url AS "imageUrl"
    FROM products WHERE id = ${id} AND active = true
  `;
  const p = (rows[0] as Product) ?? null;
  if (p) p.imageUrl = await signImageUrl(p.imageUrl);
  return p;
}

export async function createProduct(p: {
  name: string; category: string; price: number;
  fabric: string; description: string; imageUrl: string | null;
}): Promise<Product> {
  const rows = await sql`
    INSERT INTO products (name, category, price, fabric, description, image_url)
    VALUES (${p.name}, ${p.category}, ${p.price}, ${p.fabric}, ${p.description}, ${p.imageUrl})
    RETURNING id, name, category, price, fabric, description, swatch, image_url AS "imageUrl"
  `;
  return rows[0] as Product;
}

export async function updateProduct(id: string, p: {
  name?: string; price?: number; fabric?: string;
  description?: string; imageUrl?: string; active?: boolean;
}): Promise<void> {
  await sql`
    UPDATE products SET
      name = COALESCE(${p.name ?? null}, name),
      price = COALESCE(${p.price ?? null}, price),
      fabric = COALESCE(${p.fabric ?? null}, fabric),
      description = COALESCE(${p.description ?? null}, description),
      image_url = COALESCE(${p.imageUrl ?? null}, image_url),
      active = COALESCE(${p.active ?? null}, active)
    WHERE id = ${id}
  `;
}

export async function deleteProduct(id: string): Promise<void> {
  await sql`DELETE FROM products WHERE id = ${id}`;
}
