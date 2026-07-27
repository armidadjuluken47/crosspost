import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { createDbClient, providerConfigs } from "@crosspost/db";
import { ALL_PROVIDERS, DEFAULT_OUTPUT_SETTINGS, loadEnv } from "@crosspost/shared";
import { saveOutputSettings } from "../repositories/engine-settings";

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

  await saveOutputSettings(db, DEFAULT_OUTPUT_SETTINGS);

  console.log("Part 1c setup complete:");
  console.log("  - Nano Banana 2 enabled as primary image provider");
  console.log("  - Provider chain: NB2 → NB Pro → Seedream");
  console.log("  - Default output settings saved (2:3, 1k, 1080×1620 normalize)");
  console.log("  - Run db:migrate first if engine_settings table is missing");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
