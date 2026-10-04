// Basic authentication utilities.
// Uses Web Crypto (available in Node 18+ and Edge runtime) so the same
// verify logic works in middleware.ts too. No external dependencies.
// User records live in Postgres — see lib/users.ts.

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";
const encoder = new TextEncoder();

// ---- helpers ----
export function normalizeIdentifier(raw: string): { value: string; kind: "email" | "phone" } | null {
  const v = raw.trim().toLowerCase();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (emailRe.test(v)) return { value: v, kind: "email" };

  // Phone: normalize to E.164 international format, e.g. +919876543210
  let digits = v.replace(/[\s\-().]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2); // 0044... -> +44...
  if (/^\+[1-9]\d{7,14}$/.test(digits)) return { value: digits, kind: "phone" };
  return null;
}

function toB64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${salt}:${password}:${SECRET}`));
  return toB64Url(digest);
}

// ---- password reset codes ----
export const RESET_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const RESET_CODE_COOLDOWN_MS = 60 * 1000; // 60s between requests

export function generateResetCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const num = new DataView(bytes.buffer).getUint32(0) % 1_000_000;
  return num.toString().padStart(6, "0");
}

// Reuses hashPassword's hashing with a domain-separated salt, so a leaked
// reset-code hash can't be compared against the password_hash column.
export async function hashResetCode(code: string, identifier: string): Promise<string> {
  return hashPassword(code, `reset:${identifier}`);
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return toB64Url(sig);
}

// ---- session tokens: base64url(payload).signature ----
export type Session = { sub: string; name: string; exp: number };

export async function createToken(session: Session): Promise<string> {
  const payload = toB64Url(encoder.encode(JSON.stringify(session)));
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifyToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = await hmac(payload);
  if (sig !== expected) return null;
  try {
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    const session = JSON.parse(json) as Session;
    if (session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export const COOKIE_NAME = "vaishnora_session";

// ---- session cookie ----
// COOKIE_DOMAIN (e.g. ".vaishnora.shop") lets the storefront and the admin app
// on a sibling subdomain share one session. Leave it unset on localhost: browsers
// ignore the port for cookies, so :3000 and :3001 already share them.
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7;

export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE_S) {
  const domain = process.env.COOKIE_DOMAIN || undefined;
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
    ...(domain ? { domain } : {}),
  };
}

// Minimal shape of a NextResponse, so this file stays free of next/server imports.
type CookieResponse = {
  cookies: { set: (name: string, value: string, options: ReturnType<typeof sessionCookieOptions>) => unknown };
  headers: Headers;
};

// Sessions created before COOKIE_DOMAIN existed are host-only cookies. A cookie
// with a Domain attribute is a DIFFERENT cookie to the browser, so the old one
// would linger next to the new one (and survive sign-out) until it expires.
// Expire it explicitly whenever we write or clear the session.
function expireHostOnlyCookie(res: CookieResponse): void {
  if (!process.env.COOKIE_DOMAIN) return; // cookies are already host-only; nothing to clean up
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  // Must run after res.cookies.set(): that call rewrites the Set-Cookie headers.
  res.headers.append("Set-Cookie", `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`);
}

/** Writes the session cookie on a response (login, register, password reset). */
export function setSessionCookie(res: CookieResponse, token: string): void {
  res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
  expireHostOnlyCookie(res);
}

/** Clears the session cookie on a response (sign out), including any legacy host-only copy. */
export function clearSessionCookie(res: CookieResponse): void {
  res.cookies.set(COOKIE_NAME, "", sessionCookieOptions(0));
  expireHostOnlyCookie(res);
}
