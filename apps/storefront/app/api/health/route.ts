// Uptime probe target for the Route 53 health check (infra/observability/
// vaishnora-uptime-us-east-1.yaml). The site-down alarm fires on anything but
// a 200 from here.
//
// It answers 503 not only when the site is unreachable but when the site is
// "up" and useless: every page returning 200 while nothing loads. That is what
// the 2026-10-09 database outage looked like, and no alarm caught it. So this
// checks the whole chain a shopper depends on:
//   1. the database answers and has active products
//   2. those products have photos
//   3. one real photo downloads from the image CDN
//   4. the home page HTML contains real product photos (not placeholders)
//   5. the product list that draws the Shop page cards returns products with photos
//
// The checks run at most once per PROBE_INTERVAL_MS no matter how many
// checkers call this, so the probe itself costs almost nothing. The home page
// used to be the probe target, and at ~1,900 full catalog loads an hour it
// exhausted the database plan's monthly allowance in four days.

import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { imageUrl } from "@vaishnora/core/s3";
import { STOREFRONT_URL } from "@vaishnora/core/urls";

export const dynamic = "force-dynamic";

const PROBE_INTERVAL_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

type Check = { ok: boolean; detail: string };
type Probe = { ok: boolean; checkedAt: number; checks: Record<string, Check> };
let last: Probe | null = null;
let inFlight: Promise<Probe> | null = null;

const fail = (detail: string): Check => ({ ok: false, detail: detail.slice(0, 200) });
const pass = (detail: string): Check => ({ ok: true, detail });
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function probe(): Promise<Probe> {
  const checkedAt = Date.now();
  const checks: Record<string, Check> = {};

  // 1 + 2: database and catalog
  let sampleImageKey: string | null = null;
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = (await sql`
      SELECT
        (SELECT count(*)::int FROM products WHERE active = true) AS products,
        (SELECT count(DISTINCT c.product_id)::int
           FROM product_colors c JOIN product_images i ON i.color_id = c.id
           JOIN products p ON p.id = c.product_id WHERE p.active = true) AS with_photos,
        (SELECT i.image_key FROM product_images i JOIN product_colors c ON c.id = i.color_id
           JOIN products p ON p.id = c.product_id WHERE p.active = true
           ORDER BY p.created_at DESC, i.sort ASC LIMIT 1) AS sample_key
    `) as { products: number; with_photos: number; sample_key: string | null }[];
    const r = rows[0];
    checks.database = r.products > 0 ? pass(`${r.products} active products`) : fail("catalog is empty");
    checks.catalog_photos = r.with_photos > 0 ? pass(`${r.with_photos} products have photos`) : fail("no product has a photo");
    sampleImageKey = r.sample_key;
  } catch (e) {
    checks.database = fail(`database: ${errText(e)}`);
    checks.catalog_photos = fail("skipped: database unavailable");
  }

  // 3: a real photo downloads from the CDN
  const sampleUrl = imageUrl(sampleImageKey);
  if (!sampleUrl) {
    checks.image_cdn = fail("skipped: no photo to test");
  } else {
    try {
      const res = await fetch(sampleUrl, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      const type = res.headers.get("content-type") ?? "";
      checks.image_cdn = res.ok && type.startsWith("image/") ? pass(`photo served (${type})`) : fail(`photo returned ${res.status} ${type}`);
    } catch (e) {
      checks.image_cdn = fail(`photo download: ${errText(e)}`);
    }
  }

  // 4: the home page shoppers get really shows product photos
  try {
    const res = await fetch(`${STOREFRONT_URL}/`, {
      cache: "no-store",
      headers: { "user-agent": "vaishnora-health-probe" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const html = res.ok ? await res.text() : "";
    const cdnHost = new URL(imageUrl("x")!).host;
    const photos = html.split(`${cdnHost}/`).length - 1;
    checks.home_page = !res.ok
      ? fail(`home page returned ${res.status}`)
      : photos > 0
        ? pass(`home page shows ${photos} product photo${photos === 1 ? "" : "s"}`)
        : fail("home page returned 200 but shows no product photos");
  } catch (e) {
    checks.home_page = fail(`home page: ${errText(e)}`);
  }

  // 5: the list the Shop page builds its cards from
  try {
    const res = await fetch(`${STOREFRONT_URL}/api/products`, { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const body = res.ok ? ((await res.json()) as { products?: { colors?: { images?: unknown[] }[]; imageUrl?: string | null }[] }) : null;
    const list = body?.products ?? [];
    const withPhoto = list.filter((p) => p.imageUrl || p.colors?.some((c) => (c.images?.length ?? 0) > 0)).length;
    checks.shop_cards = !res.ok
      ? fail(`product list returned ${res.status}`)
      : list.length === 0
        ? fail("product list returned 200 but is empty, so the Shop page has no cards")
        : withPhoto === 0
          ? fail(`${list.length} products listed but none has a photo`)
          : pass(`${list.length} products listed, ${withPhoto} with photos`);
  } catch (e) {
    checks.shop_cards = fail(`product list: ${errText(e)}`);
  }

  return { ok: Object.values(checks).every((c) => c.ok), checkedAt, checks };
}

export async function GET() {
  const stale = !last || Date.now() - last.checkedAt > PROBE_INTERVAL_MS;
  if (stale) {
    inFlight ??= probe().then((p) => { last = p; inFlight = null; return p; });
    await inFlight;
  }
  const p = last!;
  return NextResponse.json(
    { ok: p.ok, checkedAt: new Date(p.checkedAt).toISOString(), checks: p.checks },
    { status: p.ok ? 200 : 503, headers: { "cache-control": "no-store" } }
  );
}
