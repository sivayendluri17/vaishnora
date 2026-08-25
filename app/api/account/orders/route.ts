// GET the signed-in user's past orders.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  try {
    const orders = await getOrdersForUser(session.sub);
    return NextResponse.json({ orders });
  } catch (err) {
    console.error("orders fetch error:", err);
    return NextResponse.json({ error: "Couldn't load your orders." }, { status: 500 });
  }
}
