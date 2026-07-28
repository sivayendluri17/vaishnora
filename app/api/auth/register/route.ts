import { NextResponse } from "next/server";
import { normalizeIdentifier, hashPassword, createToken, COOKIE_NAME } from "@/lib/auth";
import { findUser, createUser } from "@/lib/users";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { name, identifier, password } = body ?? {};

  if (!name || !identifier || !password) {
    return NextResponse.json({ error: "Name, email/phone, and password are required." }, { status: 400 });
  }
  const id = normalizeIdentifier(identifier);
  if (!id) {
    return NextResponse.json({ error: "Enter a valid email address, or a phone number with country code." }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const existing = await findUser(id.value);
    if (existing) {
      return NextResponse.json({ error: "An account with this email/phone already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(String(password), id.value);
    const user = await createUser(String(name).trim(), id.value, passwordHash);

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
  } catch (err) {
    console.error("register error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
