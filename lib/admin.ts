// Admin authorization helper: verifies the session cookie AND checks the
// is_admin flag in the database. Used by the /admin page and all admin APIs.

import { cookies } from "next/headers";
import { neon } from "@neondatabase/serverless";
import { verifyToken, COOKIE_NAME } from "./auth";

const sql = neon(process.env.DATABASE_URL!);

export async function getAdminUser(): Promise<{ id: string; name: string } | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return null;
  const rows = await sql`
    SELECT id, name, is_admin AS "isAdmin" FROM users WHERE id = ${session.sub}
  `;
  const user = rows[0] as { id: string; name: string; isAdmin: boolean } | undefined;
  return user?.isAdmin ? { id: user.id, name: user.name } : null;
}
