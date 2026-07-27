/**
 * Live TikTok-only intake (YouTube scrapers rarely return direct MP4s).
 */
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";
import { createDbClient, sourceAccounts } from "@crosspost/db";
import { loadEnv as loadAppEnv } from "@crosspost/shared";
import { runAccountIntake } from "../index";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
loadEnv({ path: resolve(root, ".env") });

async function main() {
  const db = createDbClient(process.env.DATABASE_URL!);
  const env = loadAppEnv(process.env);
  const accounts = await db
    .select()
    .from(sourceAccounts)
    .where(and(eq(sourceAccounts.status, "active"), eq(sourceAccounts.platform, "tiktok")));

  for (const account of accounts) {
    console.log(`\n→ ${account.handle}`);
    const result = await runAccountIntake(env, db, {
      accountId: account.id,
      maxReels: 2,
      requestedBy: "live-tiktok",
    });
    console.log({
      ingested: result.results.filter((r) => r.status === "ingested").length,
      failed: result.results.filter((r) => r.status === "failed").length,
      errors: result.results.filter((r) => r.status === "failed").map((r) => r.error?.slice(0, 120)),
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
