import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { createDbClient, faceReferences, models } from "@crosspost/db";
import { loadEnv } from "@crosspost/shared";
import { createAssetStorage } from "../storage/index";

config({ path: resolve(process.cwd(), "../../.env") });

const SEED_KEYS = [
  "models/hazel/refs/1-seed.jpg",
  "models/hazel/refs/2-seed.jpg",
  "models/hazel/refs/3-seed.jpg",
] as const;

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

  const imagesDir = resolve(process.cwd(), "../../images/hazel");
  const files = (await readdir(imagesDir))
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    .sort();

  if (files.length < SEED_KEYS.length) {
    throw new Error(
      `Need at least ${SEED_KEYS.length} images in ${imagesDir}; found ${files.length}`,
    );
  }

  const db = createDbClient(env.DATABASE_URL);
  const storage = createAssetStorage(env);

  const [model] = await db.select().from(models).where(eq(models.slug, "hazel")).limit(1);
  if (!model) {
    throw new Error("Hazel model not found — run db:seed first");
  }

  const refs = await db
    .select()
    .from(faceReferences)
    .where(eq(faceReferences.modelId, model.id))
    .orderBy(faceReferences.ordinal);

  for (let index = 0; index < SEED_KEYS.length; index += 1) {
    const r2Key = SEED_KEYS[index]!;
    const filename = files[index]!;
    const buffer = await readFile(resolve(imagesDir, filename));
    const stored = await storage.putObject({
      key: r2Key,
      body: buffer,
      mimeType: mimeForFilename(filename),
    });
    const publicUrl = stored.publicUrl ?? storage.getPublicUrl(stored.key);

    const ref = refs.find((row) => row.r2Key === r2Key);
    if (ref) {
      await db
        .update(faceReferences)
        .set({ publicUrl, active: true })
        .where(eq(faceReferences.id, ref.id));
      console.log(`Repaired ref #${ref.ordinal} (${r2Key}) from ${filename}`);
    } else {
      await db.insert(faceReferences).values({
        modelId: model.id,
        r2Key,
        publicUrl,
        ordinal: index + 1,
        active: true,
      });
      console.log(`Created ref for ${r2Key} from ${filename}`);
    }
  }

  const refreshed = await db
    .select()
    .from(faceReferences)
    .where(eq(faceReferences.modelId, model.id))
    .orderBy(faceReferences.ordinal);

  for (const ref of refreshed) {
    const exists = await storage.exists(ref.r2Key);
    const publicUrl = ref.publicUrl ?? storage.getPublicUrl(ref.r2Key);

    if (exists && publicUrl && ref.publicUrl !== publicUrl) {
      await db
        .update(faceReferences)
        .set({ publicUrl, active: true })
        .where(eq(faceReferences.id, ref.id));
      console.log(`Backfilled publicUrl for ref #${ref.ordinal}`);
      continue;
    }

    if (!exists && ref.active) {
      await db
        .update(faceReferences)
        .set({ active: false })
        .where(eq(faceReferences.id, ref.id));
      console.log(`Deactivated missing ref #${ref.ordinal} (${ref.r2Key})`);
      continue;
    }

    if (!exists && !ref.active) {
      await db.delete(faceReferences).where(eq(faceReferences.id, ref.id));
      console.log(`Deleted missing inactive ref #${ref.ordinal} (${ref.r2Key})`);
    }
  }

  const active = await db
    .select()
    .from(faceReferences)
    .where(eq(faceReferences.modelId, model.id));

  const activeCount = active.filter((ref) => ref.active).length;
  console.log(`Done — ${activeCount} active Hazel reference(s)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
