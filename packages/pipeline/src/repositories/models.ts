import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { batchItems, creatorProjects, faceReferences, models, runs } from "@crosspost/db";
import type { AppEnv, CreateModelRequest, UpdateModelRequest } from "@crosspost/shared";
import { buildModelRefKey } from "@crosspost/shared";
import { writeAuditEvent } from "../health/buildHealthReport";
import { createAssetStorage } from "../storage/index";

export async function listModelsWithReferences(db: DbClient) {
  const allModels = await db.select().from(models).orderBy(desc(models.id));

  return Promise.all(
    allModels.map(async (model) => {
      const refs = await db
        .select()
        .from(faceReferences)
        .where(eq(faceReferences.modelId, model.id))
        .orderBy(faceReferences.ordinal);

      const activeRefs = refs.filter((ref) => ref.active);

      return {
        ...model,
        faceReferences: refs,
        activeReferenceCount: activeRefs.length,
        generationReady: activeRefs.length >= 3,
      };
    }),
  );
}

export async function getModelWithReferences(db: DbClient, modelId: number) {
  const [model] = await db.select().from(models).where(eq(models.id, modelId)).limit(1);
  if (!model) return null;

  const refs = await db
    .select()
    .from(faceReferences)
    .where(eq(faceReferences.modelId, model.id))
    .orderBy(faceReferences.ordinal);

  const activeRefs = refs.filter((ref) => ref.active);

  return {
    ...model,
    faceReferences: refs,
    activeReferenceCount: activeRefs.length,
    generationReady: activeRefs.length >= 3,
  };
}

export async function createModelRecord(db: DbClient, input: CreateModelRequest) {
  const [existing] = await db.select().from(models).where(eq(models.slug, input.slug)).limit(1);
  if (existing) {
    throw new Error(`Model slug "${input.slug}" already exists`);
  }

  const [model] = await db
    .insert(models)
    .values({
      slug: input.slug,
      displayName: input.displayName,
      notes: input.notes,
      status: "active",
    })
    .returning();

  await writeAuditEvent(db, {
    action: "model.created",
    entityType: "model",
    entityId: String(model!.id),
    payload: { slug: model!.slug, displayName: model!.displayName },
  });

  return model!;
}

export async function updateModelRecord(
  db: DbClient,
  modelId: number,
  input: UpdateModelRequest,
) {
  const [model] = await db
    .update(models)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(models.id, modelId))
    .returning();

  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }

  await writeAuditEvent(db, {
    action: "model.updated",
    entityType: "model",
    entityId: String(modelId),
    payload: input,
  });

  return model;
}

export async function deleteModelRecord(db: DbClient, modelId: number) {
  const [model] = await db.select().from(models).where(eq(models.id, modelId)).limit(1);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }

  const refs = await db
    .select({ id: faceReferences.id })
    .from(faceReferences)
    .where(eq(faceReferences.modelId, modelId));

  // Preserve historical runs and creator projects; just clear their model link.
  await db.update(runs).set({ modelId: null }).where(eq(runs.modelId, modelId));
  await db
    .update(creatorProjects)
    .set({ modelId: null })
    .where(eq(creatorProjects.modelId, modelId));
  const deletedBatchItems = await db
    .delete(batchItems)
    .where(eq(batchItems.modelId, modelId))
    .returning({ id: batchItems.id });
  // face_references cascade on model delete, but delete explicitly for a clear audit count
  await db.delete(faceReferences).where(eq(faceReferences.modelId, modelId));
  await db.delete(models).where(eq(models.id, modelId));

  await writeAuditEvent(db, {
    action: "model.deleted",
    entityType: "model",
    entityId: String(modelId),
    payload: {
      slug: model.slug,
      displayName: model.displayName,
      deletedReferenceCount: refs.length,
      deletedBatchItemCount: deletedBatchItems.length,
    },
  });

  return {
    id: modelId,
    slug: model.slug,
    displayName: model.displayName,
    deletedReferenceCount: refs.length,
    deletedBatchItemCount: deletedBatchItems.length,
  };
}

export async function addModelReference(
  env: AppEnv,
  db: DbClient,
  modelId: number,
  file: { buffer: Buffer; mimeType: string; filename: string },
) {
  const model = await getModelWithReferences(db, modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimeType)) {
    throw new Error("Only JPEG, PNG, and WebP images are allowed");
  }

  if (file.buffer.length > 10 * 1024 * 1024) {
    throw new Error("Image must be under 10MB");
  }

  const ext =
    file.mimeType === "image/png" ? "png" : file.mimeType === "image/webp" ? "webp" : "jpg";
  const ordinal = model.faceReferences.length + 1;
  const r2Key = buildModelRefKey(model.slug, ordinal, randomUUID().slice(0, 8), ext);

  const storage = createAssetStorage(env);
  const stored = await storage.putObject({
    key: r2Key,
    body: file.buffer,
    mimeType: file.mimeType,
  });

  const [ref] = await db
    .insert(faceReferences)
    .values({
      modelId,
      r2Key,
      publicUrl: stored.publicUrl ?? storage.getPublicUrl(r2Key),
      ordinal,
      active: true,
    })
    .returning();

  await writeAuditEvent(db, {
    action: "model.reference_added",
    entityType: "model",
    entityId: String(modelId),
    payload: { r2Key, ordinal },
  });

  return ref!;
}

export async function deactivateModelReference(db: DbClient, modelId: number, refId: number) {
  const [ref] = await db
    .update(faceReferences)
    .set({ active: false })
    .where(and(eq(faceReferences.id, refId), eq(faceReferences.modelId, modelId)))
    .returning();

  if (!ref) {
    throw new Error("Reference not found");
  }

  await writeAuditEvent(db, {
    action: "model.reference_deactivated",
    entityType: "model",
    entityId: String(modelId),
    payload: { refId },
  });

  return ref;
}

export async function countGenerationReadyModels(db: DbClient) {
  const rows = await listModelsWithReferences(db);
  return rows.filter((m) => m.status === "active" && m.generationReady).length;
}
