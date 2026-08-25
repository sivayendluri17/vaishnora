// Change password (signed in). Verifies current password, sets new one.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME, hashPassword } from "@/lib/auth";
import { getUserById, updatePasswordHash } from "@/lib/users";

export async function POST(req: Request) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { currentPassword, newPassword } = body ?? {};
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both current and new password are required." }, { status: 400 });
  }
  if (String(newPassword).length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const user = await getUserById(session.sub);
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

    // salt is the user's identifier (matches register/login)
    const currentHash = await hashPassword(String(currentPassword), user.identifier);
    if (currentHash !== user.passwordHash) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
    }
    const newHash = await hashPassword(String(newPassword), user.identifier);
    await updatePasswordHash(user.id, newHash);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("password change error:", err);
    return NextResponse.json({ error: "Couldn't change password." }, { status: 500 });
  }
}
