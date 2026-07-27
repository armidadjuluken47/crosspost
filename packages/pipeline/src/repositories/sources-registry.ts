import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { batchItems, runs, sourceAccounts, sourceReels } from "@crosspost/db";
import type { CreateSourceAccountRequest, UpdateSourceAccountRequest } from "@crosspost/shared";
import { normalizeSourceHandle } from "@crosspost/shared";
import { writeAuditEvent } from "../health/buildHealthReport";

export async function listSourceAccountsWithCounts(db: DbClient) {
  const accounts = await db.select().from(sourceAccounts).orderBy(desc(sourceAccounts.id));

  return Promise.all(
    accounts.map(async (account) => {
      const [stats] = await db
        .select({
          reelCount: sql<number>`count(*)::int`,
          previewReady: sql<number>`count(*) filter (where ${sourceReels.status} in ('preview_ready', 'selected'))::int`,
        })
        .from(sourceReels)
        .where(eq(sourceReels.sourceAccountId, account.id));

      return {
        ...account,
        reelCount: stats?.reelCount ?? 0,
        previewReadyCount: stats?.previewReady ?? 0,
      };
    }),
  );
}

export async function createSourceAccountRecord(db: DbClient, input: CreateSourceAccountRequest) {
  const platform = input.platform ?? "instagram";
  const handle = normalizeSourceHandle(input.handle, platform);
  if (!handle) {
    throw new Error("Invalid account handle");
  }

  const [existing] = await db
    .select()
    .from(sourceAccounts)
    .where(and(eq(sourceAccounts.handle, handle), eq(sourceAccounts.platform, platform)))
    .limit(1);

  if (existing) {
    throw new Error(`Source account @${handle} (${platform}) already exists`);
  }

  const [account] = await db
    .insert(sourceAccounts)
    .values({
      handle,
      platform,
      status: "active",
      notes: input.notes,
    })
    .returning();

  await writeAuditEvent(db, {
    action: "source_account.created",
    entityType: "source_account",
    entityId: String(account!.id),
    payload: { handle, platform },
  });

  return account!;
}

export async function updateSourceAccountRecord(
  db: DbClient,
  accountId: number,
  input: UpdateSourceAccountRequest,
) {
  const [account] = await db
    .update(sourceAccounts)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(sourceAccounts.id, accountId))
    .returning();

  if (!account) {
    throw new Error(`Source account ${accountId} not found`);
  }

  await writeAuditEvent(db, {
    action: "source_account.updated",
    entityType: "source_account",
    entityId: String(accountId),
    payload: input,
  });

  return account;
}

export async function deleteSourceAccountRecord(db: DbClient, accountId: number) {
  const [account] = await db
    .select()
    .from(sourceAccounts)
    .where(eq(sourceAccounts.id, accountId))
    .limit(1);

  if (!account) {
    throw new Error(`Source account ${accountId} not found`);
  }

  const reels = await db
    .select({ id: sourceReels.id })
    .from(sourceReels)
    .where(eq(sourceReels.sourceAccountId, accountId));

  const reelIds = reels.map((reel) => reel.id);

  if (reelIds.length > 0) {
    await db.update(runs).set({ sourceReelId: null }).where(inArray(runs.sourceReelId, reelIds));
    await db.delete(batchItems).where(inArray(batchItems.sourceReelId, reelIds));
    await db.delete(sourceReels).where(eq(sourceReels.sourceAccountId, accountId));
  }

  await db.delete(sourceAccounts).where(eq(sourceAccounts.id, accountId));

  await writeAuditEvent(db, {
    action: "source_account.deleted",
    entityType: "source_account",
    entityId: String(accountId),
    payload: { handle: account.handle, deletedReelCount: reelIds.length },
  });

  return {
    id: accountId,
    handle: account.handle,
    deletedReelCount: reelIds.length,
  };
}

export async function listSourceReels(
  db: DbClient,
  filters?: { accountId?: number; status?: string },
  limit = 100,
) {
  const conditions = [];
  if (filters?.accountId) {
    conditions.push(eq(sourceReels.sourceAccountId, filters.accountId));
  }
  if (filters?.status) {
    conditions.push(eq(sourceReels.status, filters.status as (typeof sourceReels.$inferSelect)["status"]));
  }

  const rows = await db
    .select({
      reel: sourceReels,
      accountHandle: sourceAccounts.handle,
    })
    .from(sourceReels)
    .innerJoin(sourceAccounts, eq(sourceReels.sourceAccountId, sourceAccounts.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(sourceReels.id))
    .limit(limit);

  return rows.map((row) => ({
    ...row.reel,
    accountHandle: row.accountHandle,
  }));
}

export async function updateSourceReelStatus(
  db: DbClient,
  reelId: number,
  status: (typeof sourceReels.$inferInsert)["status"],
) {
  const [reel] = await db
    .update(sourceReels)
    .set({ status, updatedAt: new Date() })
    .where(eq(sourceReels.id, reelId))
    .returning();

  if (!reel) {
    throw new Error(`Source reel ${reelId} not found`);
  }

  await writeAuditEvent(db, {
    action: "source_reel.updated",
    entityType: "source_reel",
    entityId: String(reelId),
    payload: { status },
  });

  return reel;
}

export async function markSourceReelsAsUsed(db: DbClient, reelIds: number[]) {
  const uniqueIds = [...new Set(reelIds)].filter((id) => id > 0);
  if (uniqueIds.length === 0) return [];

  const now = new Date();

  const updated = await db
    .update(sourceReels)
    .set({ usedAt: now, updatedAt: now })
    .where(inArray(sourceReels.id, uniqueIds))
    .returning();

  await db
    .update(sourceReels)
    .set({ status: "used", updatedAt: now })
    .where(
      and(
        inArray(sourceReels.id, uniqueIds),
        inArray(sourceReels.status, ["ingested", "asset_ready", "preview_ready", "selected"]),
      ),
    );

  const refreshed = await db
    .select()
    .from(sourceReels)
    .where(inArray(sourceReels.id, uniqueIds));

  for (const reel of refreshed) {
    await writeAuditEvent(db, {
      action: "source_reel.used",
      entityType: "source_reel",
      entityId: String(reel.id),
      payload: {
        shortcode: reel.shortcode,
        status: reel.status,
        usedAt: reel.usedAt?.toISOString(),
      },
    });
  }

  return updated;
}

export function isSourceReelUsed(reel: { status: string; usedAt?: Date | null }) {
  return reel.status === "used";
}
