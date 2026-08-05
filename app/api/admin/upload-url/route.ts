// Admin: get a presigned S3 URL for uploading a product photo.
// Returns { uploadUrl, key } — the browser PUTs to uploadUrl, then sends
// `key` back when creating/updating the product (stored in image_url column).
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { createUploadUrl } from "@/lib/s3";

export async function POST(req: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const { filename, contentType } = body ?? {};
  if (!filename || !contentType || !String(contentType).startsWith("image/")) {
    return NextResponse.json({ error: "An image file is required." }, { status: 400 });
  }
  try {
    const { uploadUrl, key } = await createUploadUrl(String(filename), String(contentType));
    return NextResponse.json({ uploadUrl, key });
  } catch (err) {
    console.error("upload-url error:", err);
    return NextResponse.json({ error: "Couldn't prepare the upload." }, { status: 500 });
  }
}
