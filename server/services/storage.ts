import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { get, put } from "@vercel/blob";

let client: S3Client | null = null;

const getS3 = () => {
  if (!process.env.S3_BUCKET) return null;
  if (!client) {
    client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "ap-southeast-1",
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      credentials:
        process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
            }
          : undefined
    });
  }
  return client;
};

export const putPolicyDocument = async (key: string, body: Buffer, contentType: string) => {
  const s3 = getS3();
  if (!s3 || !process.env.S3_BUCKET) return null;
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  );
  return key;
};

const memoryFiles = new Map<string, { body: Buffer; contentType: string }>();

export type StoredFile = {
  provider: "vercel-blob" | "s3" | "memory";
  key: string;
};

export const storePolicyFile = async (key: string, body: Buffer, contentType: string): Promise<StoredFile> => {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key, body, {
      access: "private",
      addRandomSuffix: true,
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return { provider: "vercel-blob", key: blob.url };
  }
  const s3Key = await putPolicyDocument(key, body, contentType);
  if (s3Key) return { provider: "s3", key: s3Key };
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error("Document storage is not configured for this deployment");
  }
  memoryFiles.set(key, { body: Buffer.from(body), contentType });
  return { provider: "memory", key };
};

const streamToBuffer = async (stream: AsyncIterable<Uint8Array>) => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
};

export const readPolicyFile = async (provider: StoredFile["provider"], key: string) => {
  if (provider === "vercel-blob") {
    const result = await get(key, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return {
      body: Buffer.from(await new Response(result.stream).arrayBuffer()),
      contentType: result.blob.contentType || "application/pdf"
    };
  }
  if (provider === "s3") {
    const s3 = getS3();
    if (!s3 || !process.env.S3_BUCKET) return null;
    const result = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    if (!result.Body) return null;
    return {
      body: await streamToBuffer(result.Body as AsyncIterable<Uint8Array>),
      contentType: result.ContentType || "application/pdf"
    };
  }
  return memoryFiles.get(key) || null;
};
