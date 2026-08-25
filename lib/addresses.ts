// Saved delivery addresses (Neon Postgres).
//
// Migration (run once in Neon):
//   CREATE TABLE addresses (
//     id UUID PK, user_id UUID, full_name, mobile, pincode,
//     address_line1, address_line2, landmark, city, state,
//     is_default BOOLEAN, created_at
//   );

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export type Address = {
  id: string;
  fullName: string;
  mobile: string;
  pincode: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  isDefault: boolean;
};

export async function listAddresses(userId: string): Promise<Address[]> {
  const rows = (await sql`
    SELECT id, full_name AS "fullName", mobile, pincode,
           address_line1 AS "addressLine1", address_line2 AS "addressLine2",
           landmark, city, state, is_default AS "isDefault"
    FROM addresses WHERE user_id = ${userId}
    ORDER BY is_default DESC, created_at DESC
  `) as any[];
  return rows as Address[];
}

export async function addAddress(userId: string, a: Omit<Address, "id" | "isDefault"> & { isDefault?: boolean }): Promise<string> {
  // if this is set default, unset others
  if (a.isDefault) {
    await sql`UPDATE addresses SET is_default = false WHERE user_id = ${userId}`;
  }
  const rows = (await sql`
    INSERT INTO addresses (user_id, full_name, mobile, pincode, address_line1, address_line2, landmark, city, state, is_default)
    VALUES (${userId}, ${a.fullName}, ${a.mobile}, ${a.pincode}, ${a.addressLine1}, ${a.addressLine2 ?? ""}, ${a.landmark ?? ""}, ${a.city}, ${a.state}, ${a.isDefault ?? false})
    RETURNING id
  `) as any[];
  return rows[0].id as string;
}

export async function updateAddress(userId: string, id: string, a: Partial<Omit<Address, "id">>): Promise<void> {
  if (a.isDefault) {
    await sql`UPDATE addresses SET is_default = false WHERE user_id = ${userId}`;
  }
  await sql`
    UPDATE addresses SET
      full_name = COALESCE(${a.fullName ?? null}, full_name),
      mobile = COALESCE(${a.mobile ?? null}, mobile),
      pincode = COALESCE(${a.pincode ?? null}, pincode),
      address_line1 = COALESCE(${a.addressLine1 ?? null}, address_line1),
      address_line2 = COALESCE(${a.addressLine2 ?? null}, address_line2),
      landmark = COALESCE(${a.landmark ?? null}, landmark),
      city = COALESCE(${a.city ?? null}, city),
      state = COALESCE(${a.state ?? null}, state),
      is_default = COALESCE(${a.isDefault ?? null}, is_default)
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

export async function deleteAddress(userId: string, id: string): Promise<void> {
  await sql`DELETE FROM addresses WHERE id = ${id} AND user_id = ${userId}`;
}
