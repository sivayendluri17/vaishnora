// Returns the user's default address (or most recent) for the "Deliver to" header.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { listAddresses } from "@/lib/addresses";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ address: null });
  try {
    const all = await listAddresses(session.sub);
    if (all.length === 0) return NextResponse.json({ address: null });
    // listAddresses already sorts default-first; take the first
    const a = all[0];
    return NextResponse.json({
      address: { fullName: a.fullName, city: a.city, pincode: a.pincode },
    });
  } catch {
    return NextResponse.json({ address: null });
  }
}
