import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { createDbClient, faceReferences, models } from "@crosspost/db";
import { buildModelRefKey, loadEnv } from "@crosspost/shared";
import { createAssetStorage } from "../storage/index";

config({ path: resolve(process.cwd(), "../../.env") });

async function main() {
  const env = loadEnv(process.env);
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const imagesDir = resolve(process.cwd(), "../../images/hazel");
  const files = (await readdir(imagesDir))
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    .sort();

  if (files.length === 0) {
    throw new Error(`No images found in ${imagesDir}`);
  }

  const db = createDbClient(env.DATABASE_URL);
  const storage = createAssetStorage(env);

  const [model] = await db.select().from(models).where(eq(models.slug, "hazel")).limit(1);
  if (!model) {
    throw new Error("Hazel model not found — run db:seed first");
  }

  const existing = await db
    .select()
    .from(faceReferences)
    .where(eq(faceReferences.modelId, model.id));

  let ordinal = existing.length;

  for (const filename of files) {
    ordinal += 1;
    const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeType =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const buffer = await readFile(resolve(imagesDir, filename));
    const r2Key = buildModelRefKey(model.slug, ordinal, filename.replace(/\.[^.]+$/, ""), ext);

    const stored = await storage.putObject({ key: r2Key, body: buffer, mimeType });

    await db.insert(faceReferences).values({
      modelId: model.id,
      r2Key: stored.key,
      publicUrl: stored.publicUrl ?? storage.getPublicUrl(stored.key),
      ordinal,
      active: true,
    });

    console.log(`Uploaded ${filename} -> ${stored.key}`);
  }

  console.log(`Uploaded ${files.length} Hazel reference(s) to ${env.ASSET_STORAGE_MODE} storage`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
