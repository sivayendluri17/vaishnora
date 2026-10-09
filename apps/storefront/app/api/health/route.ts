// Uptime probe target for the Route 53 health check (infra/observability/
// vaishnora-uptime-us-east-1.yaml). Answers 200 when the site can serve the
// catalog and 503 when it cannot, so "site up but no products" is caught too.
//
// The database is asked at most once per PROBE_INTERVAL_MS no matter how many
// checkers call this, so the check itself costs almost nothing. The home page
// used to be the probe target, and at ~1,900 full catalog loads an hour it
// exhausted the database plan's monthly allowance in four days.

import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const PROBE_INTERVAL_MS = 15 * 60 * 1000;

type Probe = { ok: boolean; checkedAt: number; detail: string };
let last: Probe | null = null;
let inFlight: Promise<Probe> | null = null;

async function probe(): Promise<Probe> {
  const checkedAt = Date.now();
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = (await sql`SELECT count(*)::int AS n FROM products WHERE active = true`) as { n: number }[];
    const n = rows[0]?.n ?? 0;
    return { ok: n > 0, checkedAt, detail: n > 0 ? `${n} products` : "catalog is empty" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, checkedAt, detail: msg.slice(0, 200) };
  }
}

export async function GET() {
  const stale = !last || Date.now() - last.checkedAt > PROBE_INTERVAL_MS;
  if (stale) {
    inFlight ??= probe().then((p) => { last = p; inFlight = null; return p; });
    await inFlight;
  }
  const p = last!;
  return NextResponse.json(
    { ok: p.ok, detail: p.detail, checkedAt: new Date(p.checkedAt).toISOString() },
    { status: p.ok ? 200 : 503, headers: { "cache-control": "no-store" } }
  );
}
