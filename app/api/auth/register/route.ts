import { NextResponse } from "next/server";
import {
  users, normalizeIdentifier, hashPassword, createToken, COOKIE_NAME, type User,
} from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { name, identifier, password } = body ?? {};

  if (!name || !identifier || !password) {
    return NextResponse.json({ error: "Name, email/phone, and password are required." }, { status: 400 });
  }
  const id = normalizeIdentifier(identifier);
  if (!id) {
    return NextResponse.json({ error: "Enter a valid email address or phone number." }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (users.has(id.value)) {
    return NextResponse.json({ error: "An account with this email/phone already exists." }, { status: 409 });
  }

  const user: User = {
    id: crypto.randomUUID(),
    name: String(name).trim(),
    identifier: id.value,
    passwordHash: await hashPassword(String(password), id.value),
    createdAt: Date.now(),
  };
  users.set(id.value, user);

  const token = await createToken({
    sub: user.id,
    name: user.name,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  const res = NextResponse.json({ ok: true, name: user.name });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
