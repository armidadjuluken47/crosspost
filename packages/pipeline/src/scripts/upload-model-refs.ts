import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { createDbClient, faceReferences, models } from "@crosspost/db";
import { buildModelRefKey, loadEnv } from "@crosspost/shared";
import { createAssetStorage } from "../storage/index";
import { createModelRecord } from "../repositories/models";

config({ path: resolve(process.cwd(), "../../.env") });

function parseArgs(argv: string[]) {
  const tokens = argv[0] === "--" ? argv.slice(1) : argv;
  const args = new Map<string, string>();
  for (let i = 0; i < tokens.length; i += 1) {
    const key = tokens[i];
    if (!key?.startsWith("--")) continue;
    const value = tokens[i + 1];
    if (value && !value.startsWith("--")) {
      args.set(key.slice(2), value);
      i += 1;
    }
  }
  const slug = args.get("slug");
  if (!slug) {
    throw new Error("Usage: upload-model-refs --slug <slug> [--display-name Name]");
  }
  const displayName =
    args.get("display-name") ?? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
  return { slug: slug.toLowerCase(), displayName };
}

function mimeForFilename(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

async function main() {
  const env = loadEnv(process.env);
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const { slug, displayName } = parseArgs(process.argv.slice(2));
  const imagesDir = resolve(process.cwd(), "../../images", slug);
  const files = (await readdir(imagesDir))
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    .sort();

  if (files.length < 3) {
    throw new Error(`Need at least 3 images in ${imagesDir}; found ${files.length}`);
  }

  const db = createDbClient(env.DATABASE_URL);
  const storage = createAssetStorage(env);

  let [model] = await db.select().from(models).where(eq(models.slug, slug)).limit(1);
  if (!model) {
    model = await createModelRecord(db, {
      slug,
      displayName,
      notes: `Uploaded from images/${slug}`,
    });
    console.log(`Created model @${slug} (${displayName})`);
  }

  const existing = await db
    .select()
    .from(faceReferences)
    .where(eq(faceReferences.modelId, model.id));

  const activeCount = existing.filter((ref) => ref.active).length;
  if (activeCount >= 3) {
    console.log(`Model @${slug} already has ${activeCount} active refs — skipping upload`);
    return;
  }

  let ordinal = 0;
  for (const filename of files) {
    ordinal += 1;
    const stem = filename.replace(/\.[^.]+$/, "");
    const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
    const r2Key = buildModelRefKey(model.slug, ordinal, stem, ext);
    const buffer = await readFile(resolve(imagesDir, filename));
    const stored = await storage.putObject({
      key: r2Key,
      body: buffer,
      mimeType: mimeForFilename(filename),
    });
    const publicUrl = stored.publicUrl ?? storage.getPublicUrl(stored.key);

    const prior = existing.find((ref) => ref.r2Key === r2Key);
    if (prior) {
      await db
        .update(faceReferences)
        .set({ publicUrl, active: true, ordinal })
        .where(eq(faceReferences.id, prior.id));
    } else {
      await db.insert(faceReferences).values({
        modelId: model.id,
        r2Key,
        publicUrl,
        ordinal,
        active: true,
      });
    }

    console.log(`Uploaded ${filename} -> ${r2Key}`);
  }

  console.log(`Done — @${slug} has ${Math.min(files.length, ordinal)} reference(s) in ${env.ASSET_STORAGE_MODE}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
