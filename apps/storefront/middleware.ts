// Authorization: /checkout requires a signed-in user. Admin routes now live in
// apps/admin, which has its own middleware.
// Runs on the Edge runtime; verifyToken uses Web Crypto so it works here.
import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@vaishnora/core/auth";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/checkout"] };
