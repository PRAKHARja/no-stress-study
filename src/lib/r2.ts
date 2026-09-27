import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

if (
  !accountId ||
  !accessKeyId ||
  !secretAccessKey ||
  !bucketName
) {
  throw new Error(
    "R2 environment variables are missing"
  );
}

export const r2 = new S3Client({
  region: "auto",

  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,

  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const R2_BUCKET = bucketName;

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
) {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getFileUrl(
  key: string,
  expiresIn = 300
) {
  return await getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }),
    {
      expiresIn,
    }
  );
}

export async function deleteFile(key: string) {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  );
}