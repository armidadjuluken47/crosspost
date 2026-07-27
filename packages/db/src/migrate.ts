import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

loadEnv({ path: resolve(process.cwd(), "../../.env") });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations applied");
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
