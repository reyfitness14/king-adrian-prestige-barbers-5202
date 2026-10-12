import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { eq } from 'drizzle-orm';
import { db } from '../database';
import { uploadedImages } from '../database/schema';
export const storage = new S3Client({ region: 'auto', endpoint: process.env.S3_ENDPOINT, credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } });
export async function imageUrl(value: string) {
  if (!value.startsWith('asset:')) return value;
  const [image] = await db.select().from(uploadedImages).where(eq(uploadedImages.id, value.slice(6)));
  if (!image) return '';
  return getSignedUrl(storage, new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: image.key }), { expiresIn: 3600 });
}
export async function uploadUrl(key: string, mime: string) {
  return getSignedUrl(storage, new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ContentType: mime }), { expiresIn: 300 });
}