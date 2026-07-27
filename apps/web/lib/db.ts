import { createDbClient, type DbClient } from "@crosspost/db";
import { getServerEnv } from "./env";

let cached: DbClient | null = null;

export function getDb(): DbClient {
  if (cached) return cached;

  const env = getServerEnv();
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  cached = createDbClient(env.DATABASE_URL);
  return cached;
}
