// Cross-app cache invalidation. The admin app writes the catalog; the storefront
// serves it. Next.js revalidatePath() only works inside the app that owns the
// cache, so admin asks the storefront to do it over HTTP with a shared secret.
import { STOREFRONT_URL } from "./urls";

export function storefrontPathsFor(productId?: string): string[] {
  return ["/", "/api/products", ...(productId ? [`/product/${productId}`] : [])];
}

/** Never throws: a failed revalidation must not fail the admin write that caused it. */
export async function revalidateStorefront(productId?: string): Promise<void> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.warn("[revalidate] REVALIDATE_SECRET not set; storefront will refresh on its own schedule");
    return;
  }
  try {
    const res = await fetch(`${STOREFRONT_URL}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ paths: storefrontPathsFor(productId) }),
      cache: "no-store",
    });
    if (!res.ok) console.error("[revalidate] storefront responded", res.status);
  } catch (err) {
    console.error("[revalidate] request failed", err);
  }
}
