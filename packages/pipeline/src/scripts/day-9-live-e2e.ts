import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { resolve } from "node:path";
import { createDbClient, models, sourceAccounts, sourceReels } from "@crosspost/db";
import { loadEnv } from "@crosspost/shared";
import { executeManualRun } from "../runs/execute-run";
import { runAccountIntake } from "../ingestion/run-intake";

config({ path: resolve(process.cwd(), "../../.env") });

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  const tokens = argv[0] === "--" ? argv.slice(1) : argv;
  for (let i = 0; i < tokens.length; i += 1) {
    const key = tokens[i];
    if (!key?.startsWith("--")) continue;
    const value = tokens[i + 1];
    if (value && !value.startsWith("--")) {
      args.set(key.slice(2), value);
      i += 1;
    } else {
      args.set(key.slice(2), "true");
    }
  }
  return {
    handle: args.get("handle") ?? "mariedeeonline",
    maxReels: Number(args.get("max-reels") ?? "3"),
    intakeOnly: args.has("intake-only"),
    runOnly: args.has("run-only"),
    reelId: args.get("reel-id") ? Number(args.get("reel-id")) : undefined,
  };
}

async function main() {
  const env = loadEnv(process.env);
  const opts = parseArgs(process.argv.slice(2));

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  for (const [name, mode] of [
    ["INGESTION_PROVIDER_MODE", env.INGESTION_PROVIDER_MODE],
    ["IMAGE_PROVIDER_MODE", env.IMAGE_PROVIDER_MODE],
    ["VIDEO_PROVIDER_MODE", env.VIDEO_PROVIDER_MODE],
  ] as const) {
    if (mode !== "api") {
      throw new Error(`${name} must be "api" for Day 9 live runs (current: ${mode})`);
    }
  }

  const db = createDbClient(env.DATABASE_URL);
  const handle = opts.handle.replace(/^@/, "").toLowerCase();

  const [account] = await db
    .select()
    .from(sourceAccounts)
    .where(eq(sourceAccounts.handle, handle))
    .limit(1);

  if (!account) {
    throw new Error(`Source account @${handle} not found — add it in Sources first`);
  }

  if (!opts.runOnly) {
    console.log(`\n=== Day 9 live intake: @${handle} (max ${opts.maxReels} reels) ===`);
    const intake = await runAccountIntake(env, db, {
      accountId: account.id,
      maxReels: opts.maxReels,
      requestedBy: "day-9-script",
    });

    console.log(`Provider: ${intake.providerId}`);
    for (const result of intake.results) {
      console.log(
        `  ${result.shortcode}: ${result.status}${result.error ? ` — ${result.error}` : ""}`,
      );
    }

    if (opts.intakeOnly) {
      return;
    }
  }

  const [model] = await db.select().from(models).where(eq(models.slug, "hazel")).limit(1);
  if (!model) {
    throw new Error("Hazel model not found");
  }

  const reelQuery = opts.reelId
    ? db.select().from(sourceReels).where(eq(sourceReels.id, opts.reelId)).limit(1)
    : db
        .select()
        .from(sourceReels)
        .where(
          and(
            eq(sourceReels.sourceAccountId, account.id),
            eq(sourceReels.status, "preview_ready"),
          ),
        )
        .limit(1);

  const [reel] = await reelQuery;
  if (!reel?.mp4R2Key || !reel.firstFrameR2Key) {
    throw new Error("No preview-ready reel with R2 assets found for this account");
  }

  if (reel.shortcode.startsWith("fixture-")) {
    throw new Error(
      `Reel ${reel.shortcode} is fixture data — run live intake first (provider: apify)`,
    );
  }

  console.log(`\n=== Day 9 live run: Hazel × @${handle}/${reel.shortcode} ===`);
  console.log("This calls WaveSpeed image + Kling video live. Expect several minutes.\n");

  const result = await executeManualRun(env, db, {
    model: { slug: model.slug, displayName: model.displayName },
    sourceAccount: { handle: account.handle },
    sourceReel: {
      shortcode: reel.shortcode,
      reelUrl: reel.reelUrl,
      caption: reel.caption ?? undefined,
      viewCount: reel.viewCount ?? undefined,
      durationSeconds: reel.durationSeconds ?? undefined,
      mp4R2Key: reel.mp4R2Key,
      firstFrameR2Key: reel.firstFrameR2Key,
      postedAt: reel.postedAt?.toISOString(),
    },
    executionMode: "inline",
  });

  console.log("\n=== Run complete ===");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
