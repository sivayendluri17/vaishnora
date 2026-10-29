// POST /api/client-error: the shop's error pages report browser crashes here.
// Writes one structured log line (Amplify compute logs -> CloudWatch Logs, so
// the real message and stack can be read) and one CloudWatch datapoint
// (Vaishnora/Storefront ClientCrash) for the admin Metrics page and the
// SEV2 shop-crash alarm. Always answers 204: reporting must never fail loudly
// in a browser that is already broken.

import { NextResponse } from "next/server";
import { parseClientErrorReport } from "@vaishnora/core/client-errors";
import { putClientCrashMetric } from "@vaishnora/core/client-crash-metric";

export const dynamic = "force-dynamic";

// Per-instance cap so a stuck tab (or a bot) cannot flood the metric or the logs.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 120;
let windowStart = 0;
let seen = 0;

function allow(now = Date.now()): boolean {
  if (now - windowStart >= WINDOW_MS) { windowStart = now; seen = 0; }
  seen++;
  return seen <= MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const report = parseClientErrorReport(body);
  if (!report) return NextResponse.json({ error: "Expected { message }" }, { status: 400 });
  if (!allow()) return new NextResponse(null, { status: 204 });

  const ua = req.headers.get("user-agent")?.slice(0, 200) ?? "";
  console.error("client-crash " + JSON.stringify({ ...report, ua, at: new Date().toISOString() }));
  await putClientCrashMetric(report.kind ?? "other");
  return new NextResponse(null, { status: 204 });
}
