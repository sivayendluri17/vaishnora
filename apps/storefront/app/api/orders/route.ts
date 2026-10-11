// Save a WhatsApp / Instagram order (checkout must be signed in).
// Online payments go through /api/payments/create-order instead.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@vaishnora/core/auth";
import { createOrder, parseOrderAddress } from "@vaishnora/core/orders";

export async function POST(req: Request) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Please sign in to place an order." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.address || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Missing order details." }, { status: 400 });
  }
  const parsed = parseOrderAddress(body.address);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const id = await createOrder({
      userId: session.sub,
      address: parsed.address,
      items: body.items,
      total: Math.round(Number(body.total) || 0),
      channel: body.channel === "instagram" ? "instagram" : "whatsapp",
    });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("order create error:", err);
    return NextResponse.json({ error: "Couldn't save the order." }, { status: 500 });
  }
}
