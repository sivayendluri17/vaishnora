import { NextResponse } from "next/server";
import { normalizeIdentifier, hashResetCode, hashPassword, createToken, COOKIE_NAME } from "@/lib/auth";
import { findUser, consumeResetCode, updatePasswordHash } from "@/lib/users";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { identifier, code, password } = body ?? {};

  const id = identifier ? normalizeIdentifier(identifier) : null;
  if (!id || !code || !password) {
    return NextResponse.json({ error: "Missing code or new password." }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const user = await findUser(id.value);
    const codeHash = await hashResetCode(String(code).trim(), id.value);
    const consumed = user ? await consumeResetCode(user.id, codeHash) : false;
    if (!user || !consumed) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
    }

    const passwordHash = await hashPassword(String(password), id.value);
    await updatePasswordHash(user.id, passwordHash);

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
    console.error("forgot-password confirm-reset error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
