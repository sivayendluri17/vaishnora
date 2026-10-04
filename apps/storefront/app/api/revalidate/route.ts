// Called by the admin app after a catalog write so shoppers see changes at once.
// Protected by REVALIDATE_SECRET, which both apps must share.
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const paths: string[] = Array.isArray(body?.paths)
    ? body.paths.filter((p: unknown) => typeof p === "string" && p.startsWith("/") && !p.startsWith("//"))
    : [];
  for (const p of paths) revalidatePath(p);
  return NextResponse.json({ revalidated: paths });
}
