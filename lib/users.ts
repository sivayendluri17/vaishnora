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
//
//   CREATE TABLE IF NOT EXISTS password_reset_codes (
//     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//     code_hash TEXT NOT NULL,
//     expires_at TIMESTAMPTZ NOT NULL,
//     consumed_at TIMESTAMPTZ,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
//   );
//   CREATE INDEX IF NOT EXISTS password_reset_codes_user_id_idx
//     ON password_reset_codes (user_id, created_at DESC);

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

export async function updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
  await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${userId}`;
}

export async function createResetCode(
  userId: string,
  codeHash: string,
  expiresAt: Date
): Promise<void> {
  await sql`
    INSERT INTO password_reset_codes (user_id, code_hash, expires_at)
    VALUES (${userId}, ${codeHash}, ${expiresAt.toISOString()})
  `;
}

export async function findLatestResetCode(userId: string): Promise<{ createdAt: string } | null> {
  const rows = await sql`
    SELECT created_at AS "createdAt" FROM password_reset_codes
    WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1
  `;
  return (rows[0] as { createdAt: string }) ?? null;
}

// Atomic single-use consume: the WHERE clause enforces "unused and not
// expired" in the same statement, so there's no find-then-consume race.
export async function consumeResetCode(userId: string, codeHash: string): Promise<boolean> {
  const rows = await sql`
    UPDATE password_reset_codes
    SET consumed_at = now()
    WHERE user_id = ${userId} AND code_hash = ${codeHash}
      AND consumed_at IS NULL AND expires_at > now()
    RETURNING id
  `;
  return rows.length > 0;
}
