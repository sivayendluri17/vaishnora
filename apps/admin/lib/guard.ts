import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, COOKIE_NAME } from "@vaishnora/core/auth";
import { getAdminUser } from "@vaishnora/core/admin";
import { adminLoginUrl } from "@vaishnora/core/urls";

/**
 * Page guard. Returns the admin user, or redirects:
 *  - no session         -> storefront login, back to `returnPath` afterwards
 *  - session, not admin -> /forbidden (never bounce them into a login loop)
 */
export async function requireAdmin(returnPath: string): Promise<{ id: string; name: string }> {
  const admin = await getAdminUser();
  if (admin) return admin;
  const session = await verifyToken((await cookies()).get(COOKIE_NAME)?.value);
  redirect(session ? "/forbidden" : adminLoginUrl(returnPath));
}
