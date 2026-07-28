// User persistence backed by Neon Postgres (serverless driver, works on
// Lambda and Edge). Requires DATABASE_URL env var.
//
// Table schema (run once in the Neon SQL editor):
//   CREATE TABLE IF NOT EXISTS users (
//     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     name TEXT NOT NULL,
//     identifier TEXT UNIQUE NOT NULL,
//     password_hash TEXT NOT NULL,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
//   );

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export type DbUser = {
  id: string;
  name: string;
  identifier: string;
  passwordHash: string;
};

export async function findUser(identifier: string): Promise<DbUser | null> {
  const rows = await sql`
    SELECT id, name, identifier, password_hash AS "passwordHash"
    FROM users WHERE identifier = ${identifier}
  `;
  return (rows[0] as DbUser) ?? null;
}

export async function createUser(
  name: string,
  identifier: string,
  passwordHash: string
): Promise<DbUser> {
  const rows = await sql`
    INSERT INTO users (name, identifier, password_hash)
    VALUES (${name}, ${identifier}, ${passwordHash})
    RETURNING id, name, identifier, password_hash AS "passwordHash"
  `;
  return rows[0] as DbUser;
}
