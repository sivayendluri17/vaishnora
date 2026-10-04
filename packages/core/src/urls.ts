// Where the two apps live. Both are safe to import from client components:
// only NEXT_PUBLIC_* values reach the browser bundle.
//
//   storefront : NEXT_PUBLIC_STOREFRONT_URL (server may also set STOREFRONT_URL)
//   admin      : NEXT_PUBLIC_ADMIN_URL
//
// Defaults are the local dev ports (storefront 3000, admin 3001).

function origin(v: string | undefined, fallback: string): string {
  return (v || fallback).replace(/\/+$/, "");
}

export const STOREFRONT_URL = origin(process.env.STOREFRONT_URL || process.env.NEXT_PUBLIC_STOREFRONT_URL, "http://localhost:3000");
export const ADMIN_URL = origin(process.env.NEXT_PUBLIC_ADMIN_URL, "http://localhost:3001");

/**
 * Validates a post-login "next" target. Accepts a same-site path or an absolute
 * URL on the storefront or admin origin; anything else falls back. This is what
 * stops ?next=https://evil.example from turning the login page into an open redirect.
 */
export function safeReturnTo(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const u = new URL(raw);
    if (u.origin === ADMIN_URL || u.origin === STOREFRONT_URL) return u.toString();
  } catch {
    /* not a URL */
  }
  return fallback;
}

/** Storefront login URL that returns to a path on the admin app afterwards. */
export function adminLoginUrl(returnPath: string): string {
  return `${STOREFRONT_URL}/login?next=${encodeURIComponent(`${ADMIN_URL}${returnPath}`)}`;
}
