// GET account info; PATCH to update name.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { getUserById, updateName } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const user = await getUserById(session.sub);
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const isEmail = user.identifier.includes("@");
  return NextResponse.json({
    name: user.name,
    identifier: user.identifier,
    identifierKind: isEmail ? "email" : "phone",
  });
}

export async function PATCH(req: Request) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.name || !String(body.name).trim()) {
    return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
  }
  await updateName(session.sub, String(body.name).trim());
  return NextResponse.json({ ok: true });
}
