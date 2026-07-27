import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { eq } from "drizzle-orm";
import { ALL_PROVIDERS, loadEnv, parseInstagramHandlesFromText, UNIVERSAL_IMAGE_PROMPT_V3, UNIVERSAL_VIDEO_PROMPT_V3 } from "@crosspost/shared";
import { createDbClient } from "./client";
import {
  faceReferences,
  models,
  prompts,
  providerConfigs,
  sourceAccounts,
} from "./schema";

const DEFAULT_IMAGE_PROMPT = UNIVERSAL_IMAGE_PROMPT_V3;
const DEFAULT_VIDEO_PROMPT = UNIVERSAL_VIDEO_PROMPT_V3;

loadDotenv({ path: resolve(process.cwd(), "../../.env") });

async function main() {
  const env = loadEnv(process.env);
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDbClient(env.DATABASE_URL);

  for (const provider of ALL_PROVIDERS) {
    await db
      .insert(providerConfigs)
      .values({
        providerId: provider.id,
        displayName: provider.displayName,
        stage: provider.stage,
        wavespeedModel: provider.wavespeedModel,
        sortOrder: provider.sortOrder,
        enabled: provider.enabled,
        isPremiumSlot: provider.isPremiumSlot ?? false,
      })
      .onConflictDoUpdate({
        target: providerConfigs.providerId,
        set: {
          displayName: provider.displayName,
          stage: provider.stage,
          wavespeedModel: provider.wavespeedModel,
          sortOrder: provider.sortOrder,
          enabled: provider.enabled,
          isPremiumSlot: provider.isPremiumSlot ?? false,
        },
      });
  }

  await db.insert(prompts).values([
    {
      stage: "image_gen",
      scope: "global",
      version: 3,
      body: DEFAULT_IMAGE_PROMPT,
      active: true,
      createdBy: "seed",
    },
    {
      stage: "video_gen",
      scope: "global",
      version: 3,
      body: DEFAULT_VIDEO_PROMPT,
      active: true,
      createdBy: "seed",
    },
  ]).onConflictDoNothing();

  const igPath = resolve(process.cwd(), "../../ig.txt");
  try {
    const igContent = readFileSync(igPath, "utf8");
    const handles = parseInstagramHandlesFromText(igContent);
    for (const handle of handles) {
      await db
        .insert(sourceAccounts)
        .values({ handle, status: "active" })
        .onConflictDoNothing();
    }
  } catch {
    console.warn("ig.txt not found; skipping source account seed");
  }

  const [model] = await db
    .insert(models)
    .values({
      slug: "hazel",
      displayName: "Hazel",
      status: "active",
      notes: "Seeded from images/hazel",
    })
    .onConflictDoUpdate({
      target: models.slug,
      set: {
        displayName: "Hazel",
        status: "active",
      },
    })
    .returning();

  if (model) {
    const existingRefs = await db
      .select()
      .from(faceReferences)
      .where(eq(faceReferences.modelId, model.id));

    if (existingRefs.length === 0) {
      const refKeys = [
        "models/hazel/refs/1-seed.jpg",
        "models/hazel/refs/2-seed.jpg",
        "models/hazel/refs/3-seed.jpg",
      ];

      await db.insert(faceReferences).values(
        refKeys.map((r2Key, index) => ({
          modelId: model.id,
          r2Key,
          ordinal: index + 1,
          active: true,
        })),
      );
    }
  }

  console.log("Seed complete");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
