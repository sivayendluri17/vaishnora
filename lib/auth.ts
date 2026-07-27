// Basic authentication utilities.
// Uses Web Crypto (available in Node 18+ and Edge runtime) so the same
// verify logic works in middleware.ts too. No external dependencies.
//
// NOTE: users are stored in-memory for now — fine for local development,
// but data resets on every redeploy/serverless cold start. Swap `users`
// for a real table (PostgreSQL on RDS, like JobSeek) before launch.

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";
const encoder = new TextEncoder();

export type User = {
  id: string;
  name: string;
  identifier: string; // email OR phone number
  passwordHash: string;
  createdAt: number;
};

// ---- in-memory store (replace with DB) ----
const globalStore = globalThis as unknown as { __vaishnoraUsers?: Map<string, User> };
export const users: Map<string, User> =
  globalStore.__vaishnoraUsers ?? (globalStore.__vaishnoraUsers = new Map());

// ---- helpers ----
export function normalizeIdentifier(raw: string): { value: string; kind: "email" | "phone" } | null {
  const v = raw.trim().toLowerCase();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (emailRe.test(v)) return { value: v, kind: "email" };
  const digits = v.replace(/[\s\-()+.]/g, "");
  if (/^\d{10,15}$/.test(digits)) return { value: digits, kind: "phone" };
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
