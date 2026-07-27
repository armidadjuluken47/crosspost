import { resolve } from "node:path";
import { config } from "dotenv";
import { createDbClient } from "@crosspost/db";
import { loadEnv } from "@crosspost/shared";
import { closeOrphanActiveRuns, listOrphanActiveRuns } from "../repositories/dashboard";

config({ path: resolve(process.cwd(), "../../.env") });

async function main() {
  const env = loadEnv(process.env);
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDbClient(env.DATABASE_URL);
  const orphans = await listOrphanActiveRuns(db);

  if (orphans.length === 0) {
    console.log("No orphan active runs found.");
    return;
  }

  console.log(
    "Closing orphan runs:",
    orphans.map((run) => `#${run.id} (${run.status}/${run.currentStage})`).join(", "),
  );

  const closedRunIds = await closeOrphanActiveRuns(db, "close-orphan-runs-script");
  console.log(`Closed ${closedRunIds.length} run(s):`, closedRunIds.join(", "));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
