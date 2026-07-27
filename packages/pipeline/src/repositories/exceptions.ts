import { and, desc, eq, sql } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { exceptions, runs } from "@crosspost/db";
import type { UpdateExceptionRequest } from "@crosspost/shared";
import { writeAuditEvent } from "../health/buildHealthReport";

export async function listExceptions(
  db: DbClient,
  filters?: {
    status?: "open" | "resolved" | "dismissed";
    stage?: string;
    batchId?: number;
    modelId?: number;
  },
  limit = 50,
) {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(exceptions.status, filters.status));
  }
  if (filters?.stage) {
    conditions.push(eq(exceptions.stage, filters.stage));
  }
  if (filters?.batchId) {
    conditions.push(eq(exceptions.batchId, filters.batchId));
  }
  if (filters?.modelId) {
    conditions.push(eq(runs.modelId, filters.modelId));
  }

  const query = db
    .select({
      id: exceptions.id,
      runId: exceptions.runId,
      batchId: exceptions.batchId,
      stage: exceptions.stage,
      reason: exceptions.reason,
      payload: exceptions.payload,
      status: exceptions.status,
      resolutionAction: exceptions.resolutionAction,
      resolvedBy: exceptions.resolvedBy,
      resolvedAt: exceptions.resolvedAt,
      createdAt: exceptions.createdAt,
    })
    .from(exceptions)
    .leftJoin(runs, eq(exceptions.runId, runs.id))
    .orderBy(desc(exceptions.id))
    .limit(limit);

  if (conditions.length === 0) {
    return query;
  }

  return query.where(and(...conditions));
}

export async function updateException(db: DbClient, input: UpdateExceptionRequest) {
  const [existing] = await db
    .select()
    .from(exceptions)
    .where(eq(exceptions.id, input.id))
    .limit(1);

  if (!existing) {
    throw new Error(`Exception ${input.id} not found`);
  }

  if (existing.status !== "open") {
    throw new Error(`Exception ${input.id} is already ${existing.status}`);
  }

  const [updated] = await db
    .update(exceptions)
    .set({
      status: input.status,
      resolvedBy: input.resolvedByUserId ?? "operator",
      resolutionAction: input.resolutionAction ?? `${input.status} via dashboard`,
      resolvedAt: new Date(),
    })
    .where(eq(exceptions.id, input.id))
    .returning();

  await writeAuditEvent(db, {
    action: `exception.${input.status}`,
    entityType: "exception",
    entityId: String(input.id),
    actorUserId: input.resolvedByUserId ?? "operator",
    payload: {
      runId: existing.runId,
      stage: existing.stage,
      resolutionAction: input.resolutionAction,
    },
  });

  return updated!;
}

export async function countOpenExceptions(db: DbClient) {
  const rows = await db.select().from(exceptions).where(eq(exceptions.status, "open"));
  return rows.length;
}

/** Close open exceptions when a run completes successfully (e.g. after retry → delivered). */
export async function resolveOpenExceptionsForRun(
  db: DbClient,
  runId: number,
  options?: { resolvedBy?: string; resolutionAction?: string },
) {
  const openRows = await db
    .select()
    .from(exceptions)
    .where(and(eq(exceptions.runId, runId), eq(exceptions.status, "open")));

  if (openRows.length === 0) {
    return [];
  }

  const resolvedBy = options?.resolvedBy ?? "system";
  const resolutionAction =
    options?.resolutionAction ?? "Auto-resolved: run delivered successfully";
  const resolvedIds: number[] = [];

  for (const existing of openRows) {
    await db
      .update(exceptions)
      .set({
        status: "resolved",
        resolvedBy,
        resolutionAction,
        resolvedAt: new Date(),
      })
      .where(eq(exceptions.id, existing.id));

    await writeAuditEvent(db, {
      action: "exception.resolved",
      entityType: "exception",
      entityId: String(existing.id),
      actorUserId: resolvedBy,
      payload: {
        runId,
        stage: existing.stage,
        resolutionAction,
        auto: true,
      },
    });

    resolvedIds.push(existing.id);
  }

  return resolvedIds;
}

export async function openSourceException(
  db: DbClient,
  input: {
    stage: string;
    reason: string;
    payload?: Record<string, unknown>;
  },
) {
  const [exception] = await db
    .insert(exceptions)
    .values({
      stage: input.stage,
      reason: input.reason,
      payload: input.payload,
      status: "open",
    })
    .returning();

  await writeAuditEvent(db, {
    action: "exception.opened",
    entityType: "exception",
    entityId: String(exception!.id),
    payload: input.payload,
  });

  return exception!;
}
