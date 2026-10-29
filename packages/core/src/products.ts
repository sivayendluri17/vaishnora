// Shared types. Catalog data lives in Postgres (see lib/products-db.ts).

import type { ProductSpecs } from "./catalog";

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
  /** Text for this colour only. Empty = the product's general description is shown. */
  description: string;
  images: ProductImage[];
};

export type Product = {
  id: string;
  asin: string;         // Amazon-style product code, e.g. VSH0001
  name: string;
  category: string;
  price: number;         // INR — original price
  salePrice: number | null; // INR — discounted price (null = no offer)
  inStock: boolean;         // false = Out of Stock
  sizes: string[];          // e.g. ["S","M","L"] or ["32","34"] ; [] = no sizes
  fabric: string;
  description: string;
  /** Measurements (height, width, weight) for types that have them. {} otherwise. */
  specs: ProductSpecs;
  // legacy single fields (kept for older rows / fallback):
  swatch: string | null;
  imageUrl: string | null;
  // new multi-colour data:
  colors: ProductColor[];
};

/** The photo for the colour a shopper chose: that colour's first photo, else the product thumbnail. */
/** Index of a colour by name (case-insensitive), or -1. Used to open a product on a given colour. */
export function colourIndexFor(p: Product, colour: string | null | undefined): number {
  const want = colour?.trim().toLowerCase();
  if (!want) return -1;
  return p.colors?.findIndex((x) => x.name.trim().toLowerCase() === want) ?? -1;
}

/**
 * Link to a product, opened on a particular colour when one is given:
 * "/product/abc?colour=Black". Order emails, order history and the cart use
 * it so a tap lands on the colour that was actually chosen.
 */
export function productPath(productId: string, colour?: string | null): string {
  const c = colour?.trim();
  return `/product/${productId}${c ? `?colour=${encodeURIComponent(c)}` : ""}`;
}

export function imageForColour(p: Product, colour: string | null | undefined): string | null {
  const want = colour?.trim().toLowerCase();
  const c = want ? p.colors?.find((x) => x.name.trim().toLowerCase() === want) : undefined;
  return c?.images?.[0]?.url ?? thumbnailFor(p);
}

// The image shown on the shop grid: first image of first colour,
// else the legacy imageUrl, else null (caller shows gradient swatch).
export function thumbnailFor(p: Product): string | null {
  const firstColor = p.colors?.[0];
  const firstImg = firstColor?.images?.[0];
  return firstImg?.url ?? p.imageUrl ?? null;
}

/** The description a shopper should see for a colour: its own, else the product's. */
export function descriptionFor(p: Product, color?: ProductColor | null): string {
  return color?.description?.trim() || p.description || "";
}
