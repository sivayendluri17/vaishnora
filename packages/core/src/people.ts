// Admin access management (the owner's People page): who has vendor or owner
// access, and granting or removing it by email or phone. The account must
// already exist (the person signs up on the shop first), so this never creates
// users or touches passwords.

import { neon } from "@neondatabase/serverless";
import { normalizeIdentifier } from "./auth";
import { parseRole, type Role } from "./roles";

const sql = neon(process.env.DATABASE_URL!);

export type StaffMember = { id: string; name: string; identifier: string; role: Role; createdAt: string; productCount: number };

/** Owners and vendors, owners first, then by name. */
export async function listStaff(): Promise<StaffMember[]> {
  const rows = (await sql`
    SELECT u.id, u.name, u.identifier, u.role, u.created_at AS "createdAt",
           (SELECT count(*) FROM products p WHERE p.vendor_id = u.id)::int AS "productCount"
    FROM users u
    WHERE u.role IN ('owner', 'vendor')
    ORDER BY (u.role = 'owner') DESC, u.name ASC
  `) as StaffMember[];
  return rows.map((r) => ({ ...r, role: parseRole(r.role) }));
}

export type SetRoleResult =
  | { ok: true; member: { id: string; name: string; identifier: string; role: Role } }
  | { ok: false; error: string };

/**
 * Give an existing account a role, or take admin access away (role customer).
 * `actorId` may not change their own role, so an owner cannot lock themselves out.
 */
export async function setRoleByIdentifier(rawIdentifier: string, role: Role, actorId: string): Promise<SetRoleResult> {
  const id = normalizeIdentifier(String(rawIdentifier ?? ""));
  if (!id) return { ok: false, error: "Enter the email address or phone number they signed up with." };
  const rows = (await sql`SELECT id, name, identifier FROM users WHERE identifier = ${id.value}`) as { id: string; name: string; identifier: string }[];
  const user = rows[0];
  if (!user) return { ok: false, error: `No account found for ${id.value}. Ask them to create an account on the shop first, then try again.` };
  if (user.id === actorId) return { ok: false, error: "You cannot change your own access." };
  await sql`UPDATE users SET role = ${role}, is_admin = ${role !== "customer"} WHERE id = ${user.id}`;
  return { ok: true, member: { ...user, role } };
}

/** Name and email for each vendor id, for the vendor order email. Phone-only accounts have email null. */
export async function vendorContacts(vendorIds: string[]): Promise<{ id: string; name: string; email: string | null }[]> {
  if (vendorIds.length === 0) return [];
  const rows = (await sql`SELECT id, name, identifier FROM users WHERE id = ANY(${vendorIds}) AND role = 'vendor'`) as { id: string; name: string; identifier: string }[];
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.identifier.includes("@") ? r.identifier : null }));
}
