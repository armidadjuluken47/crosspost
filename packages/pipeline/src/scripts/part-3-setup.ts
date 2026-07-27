import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { createDbClient } from "@crosspost/db";
import { loadEnv } from "@crosspost/shared";
import { syncProviderConfigsFromRegistry } from "../repositories/provider-configs";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });

async function main() {
  const env = loadEnv(process.env);
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDbClient(env.DATABASE_URL);
  await syncProviderConfigsFromRegistry(db);

  console.log("Part 3 setup complete:");
  console.log("  - provider_configs synced from registry");
  console.log("  - Defaults: NB2 → NB Pro → Seedream, Kling v3 Standard");
  console.log("  - Operators can change models in Settings without a deploy");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
