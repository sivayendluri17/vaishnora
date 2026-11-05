// Admin authorization helper: verifies the session cookie AND reads the
// account's role from the database. Used by every admin page and admin API.
//
//   owner  -> full access
//   vendor -> their own products and order lines only (see roles.ts)
//   anyone else -> null

import { cookies } from "next/headers";
import { neon } from "@neondatabase/serverless";
import { verifyToken, COOKIE_NAME } from "./auth";
import { isAdminRole, parseRole, type AdminRole } from "./roles";

const sql = neon(process.env.DATABASE_URL!);

export type AdminUser = { id: string; name: string; role: AdminRole };

export async function getAdminUser(): Promise<AdminUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return null;

  let row: { id: string; name: string; role?: string; isAdmin?: boolean } | undefined;
  try {
    row = (await sql`SELECT id, name, role, is_admin AS "isAdmin" FROM users WHERE id = ${session.sub}`)[0] as typeof row;
  } catch (err) {
    // The roles migration (infra/db/2026-11-05-roles-vendors.sql) has not run
    // yet: fall back to the old flag, where every admin is an owner.
    if ((err as { code?: string })?.code !== "42703") throw err;
    row = (await sql`SELECT id, name, is_admin AS "isAdmin" FROM users WHERE id = ${session.sub}`)[0] as typeof row;
  }
  if (!row) return null;
  const role = row.role !== undefined ? parseRole(row.role) : row.isAdmin ? "owner" : "customer";
  return isAdminRole(role) ? { id: row.id, name: row.name, role } : null;
}

/** Owners only: metrics, alarms, customer details, people. */
export async function getOwnerUser(): Promise<AdminUser | null> {
  const user = await getAdminUser();
  return user?.role === "owner" ? user : null;
}
