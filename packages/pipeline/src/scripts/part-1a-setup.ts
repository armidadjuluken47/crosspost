import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { and, desc, eq } from "drizzle-orm";
import { createDbClient, prompts, providerConfigs } from "@crosspost/db";
import {
  ALL_PROVIDERS,
  loadEnv,
  UNIVERSAL_IMAGE_PROMPT_V2,
  UNIVERSAL_VIDEO_PROMPT_V2,
} from "@crosspost/shared";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });

async function activatePromptVersion(
  db: ReturnType<typeof createDbClient>,
  stage: "image_gen" | "video_gen",
  version: number,
  body: string,
) {
  await db.update(prompts).set({ active: false }).where(eq(prompts.stage, stage));

  await db
    .insert(prompts)
    .values({
      stage,
      scope: "global",
      version,
      body,
      active: false,
      createdBy: "part-1a-setup",
    })
    .onConflictDoUpdate({
      target: [prompts.stage, prompts.scope, prompts.scopeId, prompts.version],
      set: {
        body,
        createdBy: "part-1a-setup",
      },
    });

  const [canonical] = await db
    .select({ id: prompts.id })
    .from(prompts)
    .where(
      and(
        eq(prompts.stage, stage),
        eq(prompts.scope, "global"),
        eq(prompts.version, version),
      ),
    )
    .orderBy(desc(prompts.id))
    .limit(1);

  if (!canonical) {
    throw new Error(`Failed to locate ${stage} prompt v${version}`);
  }

  await db.update(prompts).set({ active: true }).where(eq(prompts.id, canonical.id));
}

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

  await activatePromptVersion(db, "image_gen", 2, UNIVERSAL_IMAGE_PROMPT_V2);
  await activatePromptVersion(db, "video_gen", 2, UNIVERSAL_VIDEO_PROMPT_V2);

  console.log("Part 1a setup complete:");
  console.log("  - Universal prompt v2 activated (image_gen + video_gen)");
  console.log("  - Flux Kontext Max disabled in provider_configs");
  console.log("  - Deploy web + worker for audio + flat Drive path changes");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
