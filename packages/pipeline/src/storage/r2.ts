import { HeadBucketCommand, PutObjectCommand, S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { AppEnv } from "@crosspost/shared";
import type { AssetStorage, StoredAssetInput } from "./local";

function streamToBuffer(stream: AsyncIterable<Uint8Array> | ReadableStream | Blob): Promise<Buffer> {
  if (stream instanceof Blob) {
    return stream.arrayBuffer().then((buf) => Buffer.from(buf));
  }

  const chunks: Buffer[] = [];
  return (async () => {
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  })();
}

export function createR2AssetStorage(env: AppEnv): AssetStorage {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY || !env.R2_SECRET_KEY || !env.R2_BUCKET_NAME) {
    throw new Error("R2 credentials are incomplete");
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY,
      secretAccessKey: env.R2_SECRET_KEY,
    },
  });

  const bucket = env.R2_BUCKET_NAME;

  return {
    mode: "r2",
    async putObject(input: StoredAssetInput) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.mimeType,
        }),
      );

      const publicUrl = env.R2_PUBLIC_BASE_URL
        ? `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${input.key}`
        : input.publicUrl;

      return { key: input.key, publicUrl };
    },
    async getObject(key: string) {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );

      if (!response.Body) {
        throw new Error(`Missing R2 object body for ${key}`);
      }

      return streamToBuffer(response.Body as AsyncIterable<Uint8Array>);
    },
    async exists(key: string) {
      try {
        await this.getObject(key);
        return true;
      } catch {
        return false;
      }
    },
    getPublicUrl(key: string) {
      if (!env.R2_PUBLIC_BASE_URL) return undefined;
      return `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
    },
  };
}

export async function checkR2Storage(env: AppEnv): Promise<{ ok: boolean; message: string }> {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY || !env.R2_SECRET_KEY || !env.R2_BUCKET_NAME) {
    return { ok: false, message: "R2 credentials incomplete" };
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY,
      secretAccessKey: env.R2_SECRET_KEY,
    },
  });

  try {
    await client.send(new HeadBucketCommand({ Bucket: env.R2_BUCKET_NAME }));
    return { ok: true, message: `R2 bucket ${env.R2_BUCKET_NAME} reachable` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "R2 bucket check failed",
    };
  }
}
