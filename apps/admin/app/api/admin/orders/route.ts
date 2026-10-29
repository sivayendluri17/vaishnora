// Admin: every order, newest first, with each item's product code, photo and link.
import { NextResponse } from "next/server";
import { getAdminUser } from "@vaishnora/core/admin";
import { listOrders } from "@vaishnora/core/orders";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const limit = Math.min(500, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 100));
  try {
    const orders = await listOrders(limit);
    return NextResponse.json({ orders });
  } catch (err) {
    console.error("admin orders error:", err);
    return NextResponse.json({ error: "Couldn't load orders." }, { status: 500 });
  }
}
