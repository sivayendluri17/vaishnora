// Shared types. Catalog data lives in Postgres (see lib/products-db.ts).

export type ProductImage = {
  id: string;
  url: string;      // signed S3 URL (or gradient key fallback handled elsewhere)
  angle: string;    // e.g. "front", "pallu", "border", "draped"
  sort: number;
};

export type ProductColor = {
  id: string;
  name: string;     // e.g. "Ivory", "Rosewood"
  swatch: string;   // hex or gradient for the round twister dot
  images: ProductImage[];
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;    // INR — one price for all colours (for now)
  fabric: string;
  description: string;
  // legacy single fields (kept for older rows / fallback):
  swatch: string | null;
  imageUrl: string | null;
  // new multi-colour data:
  colors: ProductColor[];
};

// The image shown on the shop grid: first image of first colour,
// else the legacy imageUrl, else null (caller shows gradient swatch).
export function thumbnailFor(p: Product): string | null {
  const firstColor = p.colors?.[0];
  const firstImg = firstColor?.images?.[0];
  return firstImg?.url ?? p.imageUrl ?? null;
}
