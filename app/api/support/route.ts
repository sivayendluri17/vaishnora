// Save a customer support request (best-effort logging).
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.message) {
    return NextResponse.json({ error: "Name and message are required." }, { status: 400 });
  }
  let userId: string | null = null;
  try {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    const session = await verifyToken(token);
    userId = session?.sub ?? null;
  } catch { /* guest */ }

  try {
    await sql`
      INSERT INTO support_requests (user_id, name, message)
      VALUES (${userId}, ${String(body.name).trim()}, ${String(body.message).trim()})
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("support save error:", err);
    // Non-fatal — the WhatsApp message still goes through client-side
    return NextResponse.json({ ok: false });
  }
}
