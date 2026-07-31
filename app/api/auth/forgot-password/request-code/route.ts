import { NextResponse } from "next/server";
import {
  normalizeIdentifier,
  generateResetCode,
  hashResetCode,
  RESET_CODE_TTL_MS,
  RESET_CODE_COOLDOWN_MS,
} from "@/lib/auth";
import { findUser, createResetCode, findLatestResetCode } from "@/lib/users";
import { sendResetCodeEmail, sendResetCodeSms } from "@/lib/notify";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { identifier } = body ?? {};

  const id = identifier ? normalizeIdentifier(identifier) : null;
  if (!id) {
    return NextResponse.json(
      { error: "Enter a valid email address, or a phone number with country code." },
      { status: 400 }
    );
  }

  try {
    const user = await findUser(id.value);
    if (user) {
      const recent = await findLatestResetCode(user.id);
      const withinCooldown =
        recent && Date.now() - new Date(recent.createdAt).getTime() < RESET_CODE_COOLDOWN_MS;

      if (!withinCooldown) {
        const code = generateResetCode();
        const codeHash = await hashResetCode(code, id.value);
        await createResetCode(user.id, codeHash, new Date(Date.now() + RESET_CODE_TTL_MS));

        try {
          if (id.kind === "email") {
            await sendResetCodeEmail(id.value, code);
          } else {
            await sendResetCodeSms(id.value, code);
          }
        } catch (notifyErr) {
          console.error("forgot-password notify error:", notifyErr);
        }
      }
    }

    // Always ok:true — never reveal whether the identifier is registered.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("forgot-password request-code error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
