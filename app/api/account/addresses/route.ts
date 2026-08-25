import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { listAddresses, addAddress, updateAddress, deleteAddress } from "@/lib/addresses";

export const dynamic = "force-dynamic";

async function uid() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  return session?.sub ?? null;
}

export async function GET() {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const addresses = await listAddresses(userId);
  return NextResponse.json({ addresses });
}

export async function POST(req: Request) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const a = await req.json().catch(() => null);
  if (!a?.fullName || !a?.mobile || !a?.pincode || !a?.addressLine1 || !a?.city || !a?.state) {
    return NextResponse.json({ error: "Please fill all required fields." }, { status: 400 });
  }
  const id = await addAddress(userId, a);
  return NextResponse.json({ ok: true, id });
}

export async function PATCH(req: Request) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "Missing address id." }, { status: 400 });
  await updateAddress(userId, String(body.id), body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "Missing address id." }, { status: 400 });
  await deleteAddress(userId, String(body.id));
  return NextResponse.json({ ok: true });
}
