// Clears the shared session cookie from the admin host. Same options as the
// storefront's logout so the Domain attribute matches and the cookie actually goes.
import { NextResponse } from "next/server";
import { clearSessionCookie } from "@vaishnora/core/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
