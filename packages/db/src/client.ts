import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { schema } from "./schema";

export type DbClient = ReturnType<typeof createDbClient>;

export function createDbClient(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 10 });
  return drizzle(client, { schema });
}

export async function pingDatabase(databaseUrl: string): Promise<boolean> {
  const client = postgres(databaseUrl, { max: 1 });
  try {
    await client`select 1 as ok`;
    return true;
  } finally {
    await client.end({ timeout: 5 });
  }
}
