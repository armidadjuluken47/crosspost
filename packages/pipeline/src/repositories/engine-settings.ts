import { eq } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { engineSettings } from "@crosspost/db";
import {
  DEFAULT_OUTPUT_SETTINGS,
  ENGINE_SETTINGS_OUTPUT_KEY,
  parseOutputSettings,
  type OutputSettings,
} from "@crosspost/shared";

export async function getOutputSettings(db: DbClient): Promise<OutputSettings> {
  const [row] = await db
    .select()
    .from(engineSettings)
    .where(eq(engineSettings.key, ENGINE_SETTINGS_OUTPUT_KEY))
    .limit(1);

  if (!row) {
    return DEFAULT_OUTPUT_SETTINGS;
  }

  return parseOutputSettings(row.value);
}

export async function saveOutputSettings(db: DbClient, settings: OutputSettings): Promise<OutputSettings> {
  const value = parseOutputSettings(settings);

  await db
    .insert(engineSettings)
    .values({
      key: ENGINE_SETTINGS_OUTPUT_KEY,
      value,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: engineSettings.key,
      set: {
        value,
        updatedAt: new Date(),
      },
    });

  return value;
}
