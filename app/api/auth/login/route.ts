import { NextResponse } from "next/server";
import { normalizeIdentifier, hashPassword, createToken, COOKIE_NAME } from "@/lib/auth";
import { findUser } from "@/lib/users";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { identifier, password } = body ?? {};

  const id = identifier ? normalizeIdentifier(identifier) : null;
  if (!id || !password) {
    return NextResponse.json({ error: "Enter your email/phone and password." }, { status: 400 });
  }

  try {
    const user = await findUser(id.value);
    const hash = await hashPassword(String(password), id.value);
    if (!user || user.passwordHash !== hash) {
      return NextResponse.json({ error: "Incorrect email/phone or password." }, { status: 401 });
    }

    const token = await createToken({
      sub: user.id, name: user.name, exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });
    const res = NextResponse.json({ ok: true, name: user.name });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
