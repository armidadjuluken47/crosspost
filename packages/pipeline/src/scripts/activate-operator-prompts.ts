import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { and, desc, eq } from "drizzle-orm";
import { createDbClient, prompts } from "@crosspost/db";
import { loadEnv, OPERATOR_IMAGE_PROMPT, OPERATOR_VIDEO_PROMPT } from "@crosspost/shared";
import { getNextPromptVersion } from "../repositories/prompts-registry";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });

async function setActiveOperatorPrompt(
  db: ReturnType<typeof createDbClient>,
  stage: "image_gen" | "video_gen",
  body: string,
) {
  await db.update(prompts).set({ active: false }).where(eq(prompts.stage, stage));

  const version = await getNextPromptVersion(db, stage, "global", null);

  const [created] = await db
    .insert(prompts)
    .values({
      stage,
      scope: "global",
      version,
      body,
      active: true,
      createdBy: "operator-default",
    })
    .returning();

  if (!created) {
    throw new Error(`Failed to create ${stage} operator prompt`);
  }

  return created;
}

async function main() {
  const env = loadEnv(process.env);
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDbClient(env.DATABASE_URL);

  const image = await setActiveOperatorPrompt(db, "image_gen", OPERATOR_IMAGE_PROMPT);
  const video = await setActiveOperatorPrompt(db, "video_gen", OPERATOR_VIDEO_PROMPT);

  console.log("Operator prompts activated:");
  console.log(`  image_gen v${image.version} (id ${image.id})`);
  console.log(`  video_gen v${video.version} (id ${video.id})`);
  console.log("  All other prompts for each stage are inactive.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
