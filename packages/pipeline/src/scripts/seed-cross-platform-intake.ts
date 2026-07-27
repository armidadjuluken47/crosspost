import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";
import { createDbClient, sourceAccounts } from "@crosspost/db";
import { loadEnv as loadAppEnv } from "@crosspost/shared";
import { createSourceAccountRecord, runAccountIntake } from "../index";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
loadEnv({ path: resolve(root, ".env") });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required");
  const db = createDbClient(databaseUrl);
  const env = { ...loadAppEnv(process.env), INGESTION_PROVIDER_MODE: "fixture" as const };

  const targets = [
    { handle: "charlidamelio", platform: "tiktok" as const },
    { handle: "khaby.lame", platform: "tiktok" as const },
    { handle: "mrbeast", platform: "youtube" as const },
    { handle: "mkbhd", platform: "youtube" as const },
  ];

  for (const t of targets) {
    let account;
    try {
      account = await createSourceAccountRecord(db, t);
      console.log("created", t.platform, account.handle, account.id);
    } catch (e) {
      console.log("skip create", t.handle, e instanceof Error ? e.message : e);
      const rows = await db
        .select()
        .from(sourceAccounts)
        .where(and(eq(sourceAccounts.handle, t.handle), eq(sourceAccounts.platform, t.platform)));
      account = rows[0];
    }
    if (!account) continue;
    const result = await runAccountIntake(env, db, {
      accountId: account.id,
      maxReels: 3,
      requestedBy: "seed",
    });
    console.log("intake", t.platform, t.handle, {
      ingested: result.results.filter((r) => r.status === "ingested").length,
      skipped: result.results.filter((r) => r.status === "skipped_duplicate").length,
      failed: result.results.filter((r) => r.status === "failed").length,
      errors: result.results.filter((r) => r.status === "failed").map((r) => r.error),
    });
  }
  console.log("done");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
