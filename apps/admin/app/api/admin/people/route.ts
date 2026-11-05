// Owner only: who has admin access, and granting or removing it.
//   GET   -> { staff: [...] }
//   POST  { identifier, role: "owner" | "vendor" | "customer" } -> { ok, staff }
// The account must already exist (they sign up on the shop first); passwords
// are never touched here. An owner cannot change their own role.
import { NextResponse } from "next/server";
import { getOwnerUser } from "@vaishnora/core/admin";
import { listStaff, setRoleByIdentifier } from "@vaishnora/core/people";
import { parseRole } from "@vaishnora/core/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getOwnerUser())) return NextResponse.json({ error: "Owners only." }, { status: 403 });
  return NextResponse.json({ staff: await listStaff() });
}

export async function POST(req: Request) {
  const owner = await getOwnerUser();
  if (!owner) return NextResponse.json({ error: "Owners only." }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.identifier !== "string") return NextResponse.json({ error: "Enter an email or phone number." }, { status: 400 });
  if (body.role !== "owner" && body.role !== "vendor" && body.role !== "customer") {
    return NextResponse.json({ error: "Choose owner, vendor, or no access." }, { status: 400 });
  }
  try {
    const result = await setRoleByIdentifier(body.identifier, parseRole(body.role), owner.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, member: result.member, staff: await listStaff() });
  } catch (err) {
    console.error("people update error:", err);
    return NextResponse.json({ error: "Couldn't update access. Please try again." }, { status: 500 });
  }
}
