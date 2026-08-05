// Private-bucket S3: uploads AND reads both use presigned URLs.
// The bucket stays fully private — no public access, no bucket policy needed.
// Env: S3_BUCKET_NAME (credentials via compute role in prod / local keys in dev).

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-west-2";
const BUCKET = process.env.S3_BUCKET_NAME!;

const s3 = new S3Client({ region: REGION });

// Admin: get a one-time URL to upload a photo. Returns the upload URL plus the
// stable S3 key (we store the key in the DB, not a public URL).
export async function createUploadUrl(filename: string, contentType: string) {
  const safe = filename.toLowerCase().replace(/[^a-z0-9.\-]/g, "-").slice(-80);
  const key = `products/${Date.now()}-${safe}`;
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
  return { uploadUrl, key };
}

// Turn a stored S3 key into a temporary viewable URL (valid ~1 hour).
export async function signImageUrl(key: string | null): Promise<string | null> {
  if (!key) return null;
  // Backward-compat: if an old full URL slipped in, return it as-is.
  if (key.startsWith("http")) return key;
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}
