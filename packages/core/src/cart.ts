// Cart line identity. A line is a product in one colour and one size, so the
// same saree in two colours is two lines. Shared by the browser cart and the
// server (create-order groups incoming lines by the same key). No server
// imports here: this file is bundled into client components.

import type { Product } from "./products";

export type Variant = { colour: string | null; size: string | null };

const norm = (v: string | null | undefined) => (v ?? "").trim();

/** Stable key for a product + colour + size line. */
export function variantKey(productId: string, variant: Variant): string {
  return `${productId}|${norm(variant.colour)}|${norm(variant.size)}`;
}

/** The colour shoppers get when they add from a grid card: the first one. */
export function defaultVariant(p: Pick<Product, "colors">): Variant {
  return { colour: p.colors?.[0]?.name ?? null, size: null };
}

/** True when the product cannot be added without choosing a size first. */
export function needsSize(p: Pick<Product, "sizes">): boolean {
  return (p.sizes?.length ?? 0) > 0;
}

/** "Teal Blue · M", "Teal Blue", "M" or "" for display. */
export function variantLabel(v: Variant): string {
  return [norm(v.colour), norm(v.size)].filter(Boolean).join(" · ");
}
