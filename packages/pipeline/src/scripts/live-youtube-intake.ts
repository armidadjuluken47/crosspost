/**
 * Live YouTube Shorts intake via scraper + downloader actors.
 *
 * Usage (from packages/pipeline):
 *   pnpm exec tsx src/scripts/live-youtube-intake.ts [handle]
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
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required");

  const preferredHandle = process.argv[2]?.replace(/^@/, "").toLowerCase();
  const db = createDbClient(databaseUrl);
  const env = loadAppEnv(process.env);

  if (env.INGESTION_PROVIDER_MODE !== "api" || !env.APIFY_TOKEN?.trim()) {
    throw new Error("Set INGESTION_PROVIDER_MODE=api and APIFY_TOKEN for live intake");
  }

  const accounts = await db
    .select()
    .from(sourceAccounts)
    .where(and(eq(sourceAccounts.status, "active"), eq(sourceAccounts.platform, "youtube")));

  const targets = preferredHandle
    ? accounts.filter((account) => account.handle.toLowerCase() === preferredHandle)
    : accounts;

  if (targets.length === 0) {
    throw new Error(
      preferredHandle
        ? `No active YouTube source account for @${preferredHandle}`
        : "No active YouTube source accounts — add one in /admin/sources first",
    );
  }

  for (const account of targets) {
    console.log(`\n→ Live YouTube intake @${account.handle}…`);
    const result = await runAccountIntake(env, db, {
      accountId: account.id,
      maxReels: 2,
      requestedBy: "live-youtube-seed",
    });
    console.log({
      handle: account.handle,
      candidates: result.candidates.length,
      shortcodes: result.candidates,
      ingested: result.results.filter((row) => row.status === "ingested").length,
      skipped: result.results.filter((row) => row.status === "skipped_duplicate").length,
      failed: result.results.filter((row) => row.status === "failed").length,
      errors: result.results
        .filter((row) => row.status === "failed")
        .map((row) => row.error)
        .slice(0, 5),
    });
  }

  console.log("\nDone. Check /discover?platform=youtube");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
