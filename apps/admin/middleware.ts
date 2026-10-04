// Every admin route needs a signed-in session. There is no login page here:
// unauthenticated visitors are sent to the storefront's /login and returned
// afterwards. Whether the user is actually an admin is checked per page/route
// against the database (requireAdmin / getAdminUser), which Edge cannot do.
import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@vaishnora/core/auth";
import { adminLoginUrl } from "@vaishnora/core/urls";

export async function middleware(req: NextRequest) {
  const session = await verifyToken(req.cookies.get(COOKIE_NAME)?.value);
  if (session) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  return NextResponse.redirect(adminLoginUrl(req.nextUrl.pathname + req.nextUrl.search));
}

export const config = {
  matcher: ["/((?!_next/|favicon\\.ico|logo-small\\.jpg|forbidden).*)"],
};
