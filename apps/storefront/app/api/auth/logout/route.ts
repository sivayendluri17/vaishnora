import { NextResponse } from "next/server";
import { COOKIE_NAME, sessionCookieOptions } from "@vaishnora/core/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", sessionCookieOptions(0));
  return res;
}
