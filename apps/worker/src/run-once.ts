import { config as loadEnv } from "dotenv";
import { hostname } from "node:os";
import { resolve } from "node:path";
import { createDbClient } from "@crosspost/db";
import { processNextRunJob } from "@crosspost/pipeline";
import { loadEnv as parseEnv } from "@crosspost/shared";

loadEnv({ path: resolve(process.cwd(), "../../.env") });

async function main() {
  const env = parseEnv(process.env);
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDbClient(env.DATABASE_URL);
  const workerId = `worker:${hostname()}:${process.pid}`;
  const outcome = await processNextRunJob(env, db, workerId);

  if (!outcome.processed) {
    console.log(JSON.stringify({ message: "No queued jobs" }, null, 2));
    return;
  }

  console.log(
    JSON.stringify(
      {
        message: "Processed queued job",
        jobId: outcome.job.id,
        runId: outcome.result.runId,
        status: outcome.result.status,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
