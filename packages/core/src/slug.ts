// URL helpers for Amazon-style product links:  /<name-slug>/dp/<ASIN>
// The slug is cosmetic — the page resolves purely from the ASIN, exactly like
// Amazon's /dp/ links. A wrong or missing slug is canonicalized via redirect.

// "Mangalagiri Plain Saree" -> "mangalagiri-plain-saree"
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "") // strip accents
      .replace(/[^a-z0-9]+/g, "-") // non-alphanumerics -> hyphen
      .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
      .slice(0, 80) || "product" // cap length, never empty
  );
}

// Canonical product path:  /<slug>/dp/<ASIN>
export function productPath(p: { name: string; asin: string }): string {
  return `/${slugify(p.name)}/dp/${p.asin}`;
}
