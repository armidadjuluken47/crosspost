import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { config as loadDotenv } from "dotenv";
import { createDbClient, sourceReels } from "@crosspost/db";
import { estimateBatchCostCents, loadEnv } from "@crosspost/shared";
import { inArray } from "drizzle-orm";
import { createAndQueueBatch, getBatchDetail } from "../repositories/batches";
import { listModelsWithReferences } from "../repositories/models";
import { countRunningRunJobs } from "../queue/run-jobs";
import { getTodaySpendCents } from "../repositories/spend-cap";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });

/** Proven preview_ready reels used in prior delivered runs. */
const DEFAULT_REEL_IDS = [96, 110, 121, 125, 114] as const;
const DEFAULT_MODEL_SLUGS = ["mia", "poppy"] as const;

function parseArgs(argv: string[]) {
  const batchIdArg = argv.find((arg) => arg.startsWith("--batch-id="));
  return {
    dryRun: argv.includes("--dry-run"),
    dispatch: argv.includes("--dispatch"),
    watch: argv.includes("--watch"),
    batchId: batchIdArg ? Number(batchIdArg.split("=")[1]) : undefined,
  };
}

async function resolveMatrix(db: ReturnType<typeof createDbClient>) {
  const models = await listModelsWithReferences(db);
  const selectedModels = DEFAULT_MODEL_SLUGS.map((slug) => {
    const model = models.find((row) => row.slug === slug);
    if (!model) {
      throw new Error(`Model @${slug} not found`);
    }
    if (!model.generationReady) {
      throw new Error(`Model @${slug} needs 3+ active reference images`);
    }
    return model;
  });

  const reels = await db
    .select()
    .from(sourceReels)
    .where(inArray(sourceReels.id, [...DEFAULT_REEL_IDS]));

  if (reels.length !== DEFAULT_REEL_IDS.length) {
    throw new Error("One or more soak reels were not found");
  }

  for (const reel of reels) {
    if (!["preview_ready", "selected"].includes(reel.status)) {
      throw new Error(`Reel ${reel.shortcode} is not batch-ready (${reel.status})`);
    }
    if (!reel.mp4R2Key || !reel.firstFrameR2Key) {
      throw new Error(`Reel ${reel.shortcode} is missing source assets`);
    }
  }

  return {
    modelIds: selectedModels.map((model) => model.id),
    sourceReelIds: [...DEFAULT_REEL_IDS],
    models: selectedModels,
    reels,
  };
}

async function printPreflight(
  env: ReturnType<typeof loadEnv>,
  db: ReturnType<typeof createDbClient>,
  matrix: Awaited<ReturnType<typeof resolveMatrix>>,
) {
  const runCount = matrix.modelIds.length * matrix.sourceReelIds.length;
  const costMode =
    env.IMAGE_PROVIDER_MODE === "api" || env.VIDEO_PROVIDER_MODE === "api" ? "live" : "fixture";
  const estimatedCostCents = estimateBatchCostCents(runCount, costMode);
  const spentTodayCents = await getTodaySpendCents(db);
  const runningJobs = await countRunningRunJobs(db);

  console.log("Part 2 soak preflight");
  console.log("=====================");
  console.log(`Concurrency cap (this env): ${env.WAVESPEED_MAX_CONCURRENT_JOBS}`);
  console.log(`Running jobs now: ${runningJobs}`);
  console.log(`Today's recorded spend: $${(spentTodayCents / 100).toFixed(2)}`);
  console.log(
    `Daily spend cap: ${
      env.DAILY_SPEND_CAP_CENTS > 0
        ? `$${(env.DAILY_SPEND_CAP_CENTS / 100).toFixed(2)}`
        : "disabled"
    }`,
  );
  console.log("");
  console.log(`Matrix: ${matrix.modelIds.length} models × ${matrix.sourceReelIds.length} reels = ${runCount} runs`);
  console.log(`Models: ${matrix.models.map((model) => `@${model.slug}`).join(", ")}`);
  console.log(
    `Reels: ${matrix.reels.map((reel) => reel.shortcode).join(", ")}`,
  );
  console.log(
    `Estimated cost (${costMode}): $${(estimatedCostCents / 100).toFixed(2)} (~${estimatedCostCents} cents)`,
  );

  if (env.WAVESPEED_MAX_CONCURRENT_JOBS <= 2) {
    console.log("");
    console.log(
      "Note: concurrency is still 2 in this env. Set WAVESPEED_MAX_CONCURRENT_JOBS=4 on Railway web + worker before soak for parallel proof.",
    );
  }

  return { runCount, estimatedCostCents, costMode };
}

async function watchBatch(db: ReturnType<typeof createDbClient>, batchId: number) {
  console.log("");
  console.log(`Watching batch #${batchId} (Ctrl+C to stop)...`);

  for (let attempt = 1; attempt <= 360; attempt += 1) {
    const detail = await getBatchDetail(db, batchId);
    if (!detail) {
      throw new Error(`Batch ${batchId} not found`);
    }

    const { statusCounts, batch, runCount } = detail;
    const runningJobs = await countRunningRunJobs(db);
    console.log(
      `[${new Date().toISOString()}] batch=${batch.status} delivered=${statusCounts.delivered}/${runCount} running=${statusCounts.running} failed=${statusCounts.failed} worker_jobs=${runningJobs}`,
    );

    if (batch.status === "completed" || batch.status === "completed_with_exceptions") {
      console.log("");
      console.log("Soak batch finished:");
      console.log(JSON.stringify({ batchId, status: batch.status, statusCounts }, null, 2));
      return detail;
    }

    await sleep(30_000);
  }

  throw new Error(`Timed out waiting for batch #${batchId}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadEnv(process.env);
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDbClient(env.DATABASE_URL);

  if (args.batchId && args.watch) {
    await watchBatch(db, args.batchId);
    return;
  }

  const matrix = await resolveMatrix(db);
  await printPreflight(env, db, matrix);

  if (args.dryRun || !args.dispatch) {
    console.log("");
    console.log("Dry run only. Re-run with --dispatch to queue the soak batch.");
    return;
  }

  const outcome = await createAndQueueBatch(env, db, {
    name: `part-2-soak-${new Date().toISOString().slice(0, 10)}`,
    modelIds: matrix.modelIds,
    sourceReelIds: matrix.sourceReelIds,
    requestedBy: "part-2-soak",
    operatorInstruction: "Part 2 volume soak — same pipeline as Part 1.",
  });

  console.log("");
  console.log("Soak batch queued:");
  console.log(`  Batch #${outcome.batch.id} (${outcome.batch.name})`);
  console.log(`  Runs: ${outcome.runCount}`);
  console.log(`  Estimated cost: $${(outcome.estimatedCostCents / 100).toFixed(2)}`);
  console.log(
    `  Run IDs: ${outcome.items.map((item) => item.run.id).join(", ")}`,
  );
  console.log("");
  console.log(
    `Monitor: Queue page or \`pnpm db:part-2-soak -- --watch --batch-id ${outcome.batch.id}\``,
  );

  if (args.watch) {
    await watchBatch(db, outcome.batch.id);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
