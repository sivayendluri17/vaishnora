// Save an order (checkout must be signed in).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { createOrder } from "@/lib/orders";

export async function POST(req: Request) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Please sign in to place an order." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.address || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Missing order details." }, { status: 400 });
  }
  const a = body.address;
  if (!a.customerName || !a.mobile || !a.pincode || !a.addressLine1 || !a.city || !a.state) {
    return NextResponse.json({ error: "Please fill all required address fields." }, { status: 400 });
  }
  if (!/^\d{10}$/.test(String(a.mobile).replace(/\D/g, "").slice(-10))) {
    return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
  }
  if (!/^\d{6}$/.test(String(a.pincode))) {
    return NextResponse.json({ error: "Enter a valid 6-digit pincode." }, { status: 400 });
  }

  try {
    const id = await createOrder({
      userId: session.sub,
      address: {
        customerName: String(a.customerName).trim(),
        mobile: String(a.mobile).trim(),
        pincode: String(a.pincode).trim(),
        addressLine1: String(a.addressLine1).trim(),
        addressLine2: String(a.addressLine2 ?? "").trim(),
        landmark: String(a.landmark ?? "").trim(),
        city: String(a.city).trim(),
        state: String(a.state).trim(),
      },
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
