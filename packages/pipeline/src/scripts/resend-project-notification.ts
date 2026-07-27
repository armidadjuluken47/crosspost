import { resolve } from "node:path";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { createDbClient, creatorProjects } from "@crosspost/db";
import { loadEnv } from "@crosspost/shared";
import { maybeNotifyCreatorProjectStatus } from "../notifications/notify-project-ready";

config({ path: resolve(process.cwd(), "../../.env") });

async function main() {
  const publicId = process.argv[2];
  if (!publicId) {
    throw new Error("Usage: tsx resend-project-notification.ts <publicId>");
  }

  const env = loadEnv(process.env);
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDbClient(env.DATABASE_URL);

  const [project] = await db
    .select()
    .from(creatorProjects)
    .where(eq(creatorProjects.publicId, publicId))
    .limit(1);

  if (!project) {
    throw new Error(`Project ${publicId} not found`);
  }

  // Clear the one-shot guard so the correct terminal notification can fire.
  await db
    .update(creatorProjects)
    .set({ readyNotifiedAt: null })
    .where(eq(creatorProjects.id, project.id));

  const result = await maybeNotifyCreatorProjectStatus(env, db, project.id);
  console.log(
    `Notification attempted for ${publicId} (status=${project.status}). readyNotifiedAt=${
      result?.readyNotifiedAt?.toISOString() ?? "null"
    }`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
