import { and, desc, eq, sql } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { prompts } from "@crosspost/db";
import type { CreatePromptRequest } from "@crosspost/shared";
import { writeAuditEvent } from "../health/buildHealthReport";

export async function listPromptVersions(db: DbClient) {
  return db.select().from(prompts).orderBy(desc(prompts.stage), desc(prompts.version));
}

export async function getNextPromptVersion(
  db: DbClient,
  stage: "image_gen" | "video_gen",
  scope: "global" | "model" | "source_account" = "global",
  scopeId?: number | null,
) {
  const conditions = [
    eq(prompts.stage, stage),
    eq(prompts.scope, scope),
    scopeId == null ? sql`${prompts.scopeId} IS NULL` : eq(prompts.scopeId, scopeId),
  ];

  const [row] = await db
    .select({ maxVersion: sql<number>`coalesce(max(${prompts.version}), 0)::int` })
    .from(prompts)
    .where(and(...conditions));

  return (row?.maxVersion ?? 0) + 1;
}

export async function createPromptVersion(db: DbClient, input: CreatePromptRequest) {
  const version = await getNextPromptVersion(db, input.stage, input.scope, input.scopeId ?? null);

  const [prompt] = await db
    .insert(prompts)
    .values({
      stage: input.stage,
      scope: input.scope,
      scopeId: input.scopeId,
      version,
      body: input.body,
      active: false,
      createdBy: input.createdBy ?? "operator",
    })
    .returning();

  await writeAuditEvent(db, {
    action: "prompt.created",
    entityType: "prompt",
    entityId: String(prompt!.id),
    payload: { stage: input.stage, version },
  });

  return prompt!;
}

export async function activatePromptVersion(db: DbClient, promptId: number) {
  const [target] = await db.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
  if (!target) {
    throw new Error(`Prompt ${promptId} not found`);
  }

  await db
    .update(prompts)
    .set({ active: false })
    .where(
      and(
        eq(prompts.stage, target.stage),
        eq(prompts.scope, target.scope),
        target.scopeId == null
          ? sql`${prompts.scopeId} IS NULL`
          : eq(prompts.scopeId, target.scopeId),
      ),
    );

  const [activated] = await db
    .update(prompts)
    .set({ active: true })
    .where(eq(prompts.id, promptId))
    .returning();

  await writeAuditEvent(db, {
    action: "prompt.activated",
    entityType: "prompt",
    entityId: String(promptId),
    payload: { stage: target.stage, version: target.version },
  });

  return activated!;
}
