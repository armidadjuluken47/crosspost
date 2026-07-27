/**
 * Delete fixture TikTok/YouTube reels and re-ingest via live Apify.
 *
 * Usage (from packages/pipeline):
 *   pnpm exec tsx src/scripts/live-cross-platform-intake.ts
 */
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, inArray, like, or } from "drizzle-orm";
import { createDbClient, sourceAccounts, sourceReels } from "@crosspost/db";
import { loadEnv as loadAppEnv } from "@crosspost/shared";
import { runAccountIntake } from "../index";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
loadEnv({ path: resolve(root, ".env") });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required");

  const db = createDbClient(databaseUrl);
  const env = loadAppEnv(process.env);

  if (env.INGESTION_PROVIDER_MODE !== "api" || !env.APIFY_TOKEN?.trim()) {
    throw new Error("Set INGESTION_PROVIDER_MODE=api and APIFY_TOKEN for live intake");
  }

  // Remove fixture clips so Discover isn't polluted
  const deleted = await db
    .delete(sourceReels)
    .where(
      or(
        like(sourceReels.shortcode, "tiktok:fixture-%"),
        like(sourceReels.shortcode, "youtube:fixture-%"),
        and(
          inArray(sourceReels.platform, ["tiktok", "youtube"]),
          like(sourceReels.caption, "Fixture %"),
        ),
      ),
    )
    .returning({ shortcode: sourceReels.shortcode });

  console.log(`Removed ${deleted.length} fixture TT/YT reels`);

  const accounts = await db
    .select()
    .from(sourceAccounts)
    .where(
      and(
        eq(sourceAccounts.status, "active"),
        inArray(sourceAccounts.platform, ["tiktok", "youtube"]),
      ),
    );

  if (accounts.length === 0) {
    throw new Error("No TikTok/YouTube source accounts — add some in /admin/sources first");
  }

  for (const account of accounts) {
    console.log(`\n→ Live intake @${account.handle} (${account.platform})…`);
    try {
      const result = await runAccountIntake(env, db, {
        accountId: account.id,
        maxReels: 2,
        requestedBy: "live-seed",
      });
      console.log({
        handle: account.handle,
        platform: account.platform,
        candidates: result.candidates.length,
        ingested: result.results.filter((r) => r.status === "ingested").length,
        skipped: result.results.filter((r) => r.status === "skipped_duplicate").length,
        failed: result.results.filter((r) => r.status === "failed").length,
        errors: result.results
          .filter((r) => r.status === "failed")
          .map((r) => r.error)
          .slice(0, 3),
      });
    } catch (error) {
      console.error(
        `Failed @${account.handle}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.log("\nDone. Check /discover with platform=tiktok or youtube.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
