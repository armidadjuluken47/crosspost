import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AppEnv } from "@crosspost/shared";

export interface StoredAssetInput {
  key: string;
  body: Buffer;
  mimeType: string;
  publicUrl?: string;
}

export interface AssetStorage {
  mode: "local" | "r2";
  putObject(input: StoredAssetInput): Promise<{ key: string; publicUrl?: string }>;
  getObject(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  getPublicUrl(key: string): string | undefined;
}

export function createLocalAssetStorage(env: AppEnv): AssetStorage {
  const rootDir = join(process.cwd(), env.LOCAL_ASSET_STORAGE_DIR);

  return {
    mode: "local",
    async putObject(input) {
      const filePath = join(rootDir, input.key);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, input.body);
      const publicUrl = env.LOCAL_ASSET_PUBLIC_BASE_URL
        ? `${env.LOCAL_ASSET_PUBLIC_BASE_URL.replace(/\/$/, "")}/${input.key}`
        : input.publicUrl;
      return { key: input.key, publicUrl };
    },
    async getObject(key) {
      return readFile(join(rootDir, key));
    },
    async exists(key) {
      try {
        await readFile(join(rootDir, key));
        return true;
      } catch {
        return false;
      }
    },
    getPublicUrl(key) {
      if (!env.LOCAL_ASSET_PUBLIC_BASE_URL) return undefined;
      return `${env.LOCAL_ASSET_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
    },
  };
}
