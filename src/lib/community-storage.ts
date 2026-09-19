import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { AppError } from "./types";

function settings() {
  const account = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_PUBLIC_BUCKET;
  const origin = process.env.R2_PUBLIC_URL;
  if (!account || !accessKeyId || !secretAccessKey || !bucket || !origin)
    throw new AppError("사진 저장소 설정이 필요합니다.", 503);
  if (!/^[a-f0-9]{32}$/i.test(account) || new URL(origin).protocol !== "https:")
    throw new AppError("사진 저장소 주소를 확인해주세요.", 503);
  return {
    bucket,
    origin,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${account}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      maxAttempts: 2,
    }),
  };
}
export function imageUrl(key: string) {
  const { origin } = settings();
  // Keys are generated on the server, never supplied URLs or arbitrary paths.
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}$/i.test(key))
    throw new AppError("사진 경로를 확인해주세요.", 404);
  return origin.replace(/\/$/, "") + "/" + key;
}
export async function putImage(key: string, bytes: Buffer, mime: string) {
  const { client, bucket } = settings();
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: mime,
        CacheControl: "public, max-age=3600",
      }),
    );
  } catch {
    throw new AppError("사진 저장소에 연결하지 못했어요.", 503);
  } finally {
    client.destroy();
  }
}
export async function removeImage(key: string) {
  const { client, bucket } = settings();
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } finally {
    client.destroy();
  }
}
