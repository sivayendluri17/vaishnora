// GET /api/delivery: today's delivery promises, the same ones the shop shows.
//
//   { "today": "2026-11-01",
//     "options": [ { "option": "regular", "name": "Regular delivery", "fee": 80, "days": 8,
//                    "date": "2026-11-09", "long": "Monday, 9 November", "short": "Mon, 9 Nov" },
//                  { "option": "priority", ... } ] }
//
// The pages compute the same thing in the browser from @vaishnora/core/delivery;
// this route is for anything outside the pages (WhatsApp replies, the admin,
// checks) and it is cached at the CDN for a few minutes, so it is cheap to call.

import { NextResponse } from "next/server";
import { deliveryPromises, istDate } from "@vaishnora/core/delivery";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  return NextResponse.json(
    { today: istDate(now), options: deliveryPromises(now) },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } },
  );
}
