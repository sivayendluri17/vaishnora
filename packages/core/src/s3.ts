// Private-bucket S3: uploads use presigned URLs; reads go through CloudFront (public CDN).
// The bucket stays fully private — CloudFront reads it via Origin Access Control (OAC).
// Env: S3_BUCKET_NAME, NEXT_PUBLIC_IMAGE_CDN
// (credentials via compute role in prod / local keys in dev).

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-west-2";
const BUCKET = process.env.S3_BUCKET_NAME!;
const IMAGE_CDN = process.env.NEXT_PUBLIC_IMAGE_CDN || "https://images.vaishnora.shop";

const s3 = new S3Client({ region: REGION });

// Admin: get a one-time URL to upload a photo. Returns the upload URL plus the
// stable S3 key (we store the key in the DB, not a public URL). UNCHANGED — still
// needs a presigned PUT because writing to a private bucket is not public.
export async function createUploadUrl(filename: string, contentType: string) {
  const safe = filename.toLowerCase().replace(/[^a-z0-9.\-]/g, "-").slice(-80);
  const key = `products/${Date.now()}-${safe}`;
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
  return { uploadUrl, key };
}

// Turn a stored S3 key into a stable, cacheable CloudFront URL.
// No signing, no expiry, no network call — just string building.
// Served fast from the edge (Mumbai/Chennai/etc. for India shoppers).
export function imageUrl(key: string | null): string | null {
  if (!key) return null;
  // Backward-compat: if an old full URL slipped into the DB, return it as-is.
  if (key.startsWith("http")) return key;
  // Guard against a leading slash so we never produce a double slash in the URL.
  const cleanKey = key.startsWith("/") ? key.slice(1) : key;
  return `${IMAGE_CDN}/${cleanKey}`;
}

// Backward-compatible wrapper. Existing callers do `await signImageUrl(key)`;
// keeping this async means NONE of those call sites break when you deploy this file.
// It no longer presigns — it just returns the fast CloudFront URL.
// TODO: migrate call sites to the synchronous imageUrl() and delete this later.
export async function signImageUrl(key: string | null): Promise<string | null> {
  return imageUrl(key);
}
