import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { hostname } from "node:os";
import { resolve } from "node:path";
import { createDbClient } from "@crosspost/db";
import {
  buildHealthReport,
  processNextRunJob,
  processNextSocialPost,
} from "@crosspost/pipeline";
import { loadEnv as parseEnv, logWorkerEvent } from "@crosspost/shared";
import { captureSentryException, initSentry } from "./sentry";

for (const path of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), "../../../.env"),
]) {
  if (existsSync(path)) {
    loadEnv({ path });
    break;
  }
}

const env = parseEnv(process.env);
const workerId = `worker:${hostname()}:${process.pid}`;

async function main() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  await initSentry(env);

  const db = createDbClient(env.DATABASE_URL);
  const health = await buildHealthReport(env);
  logWorkerEvent("worker.ready", {
    workerId,
    health: health.status,
    pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
  });

  if (!env.WORKER_LOOP) {
    return;
  }

  while (true) {
    try {
      const startedAt = Date.now();
      const outcome = await processNextRunJob(env, db, workerId);
      if (outcome.processed) {
        logWorkerEvent("job.completed", {
          workerId,
          jobId: outcome.job.id,
          runId: outcome.result.runId,
          status: outcome.result.status,
          durationMs: Date.now() - startedAt,
        });
      }

      // Publish any queued social posts (one per tick, best-effort).
      const socialOutcome = await processNextSocialPost(env, db, workerId);
      if (socialOutcome.processed) {
        logWorkerEvent("social.post.completed", {
          workerId,
          socialPostId: socialOutcome.post.id,
          platform: socialOutcome.post.platform,
          ok: socialOutcome.result.ok,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      logWorkerEvent("job.failed", { workerId, error: message });
      await captureSentryException(error, { workerId, source: "worker.loop" });
    }

    await new Promise((resolvePromise) =>
      setTimeout(resolvePromise, env.WORKER_POLL_INTERVAL_MS),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
