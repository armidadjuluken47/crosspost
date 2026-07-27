import { desc } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { auditLog } from "@crosspost/db";

export async function listRecentAuditEvents(db: DbClient, limit = 50) {
  return db.select().from(auditLog).orderBy(desc(auditLog.id)).limit(limit);
}

export async function getLatestAuditEvent(db: DbClient) {
  const [event] = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.id))
    .limit(1);

  return event ?? null;
}
