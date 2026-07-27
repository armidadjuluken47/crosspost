import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { creatorBatches, creatorProjects, creatorWorkspaceMembers } from "@crosspost/db";
import type { AppEnv } from "@crosspost/shared";
import { importCreatorVideoFromUrl } from "./import-url";
import { buildProjectProgress, createAndProcessCreatorProject } from "./projects";
import { resolveActiveWorkspace } from "./workspaces";
import { createAssetStorage } from "../storage/index";

export const CREATOR_BATCH_MAX_URLS = 10;

export type BatchUrlError = { url: string; error: string };

function normalizeUrlList(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function deriveBatchStatus(
  projects: Array<{ status: string }>,
  errors: BatchUrlError[],
): "processing" | "ready" | "partial" | "failed" {
  if (projects.length === 0) return "failed";
  const hasProcessing = projects.some((p) => p.status === "processing" || p.status === "draft");
  if (hasProcessing) return "processing";
  const readyCount = projects.filter((p) => p.status === "ready").length;
  const failedCount = projects.filter((p) => p.status === "failed").length + errors.length;
  if (readyCount === projects.length && errors.length === 0) return "ready";
  if (readyCount === 0) return "failed";
  if (failedCount > 0) return "partial";
  return "ready";
}

export async function getCreatorBatch(db: DbClient, userId: string, publicId: string) {
  const [batch] = await db
    .select()
    .from(creatorBatches)
    .where(eq(creatorBatches.publicId, publicId))
    .limit(1);

  if (!batch) return null;

  if (batch.externalUserId !== userId) {
    if (!batch.workspaceId) return null;
    const [member] = await db
      .select({ id: creatorWorkspaceMembers.id })
      .from(creatorWorkspaceMembers)
      .where(
        and(
          eq(creatorWorkspaceMembers.workspaceId, batch.workspaceId),
          eq(creatorWorkspaceMembers.userId, userId),
        ),
      )
      .limit(1);
    if (!member) return null;
  }

  const projects = await db
    .select()
    .from(creatorProjects)
    .where(eq(creatorProjects.batchId, batch.id))
    .orderBy(desc(creatorProjects.createdAt));

  const errors = (Array.isArray(batch.errors) ? batch.errors : []) as BatchUrlError[];
  const status = deriveBatchStatus(projects, errors);

  if (status !== batch.status) {
    const [updated] = await db
      .update(creatorBatches)
      .set({ status, updatedAt: new Date() })
      .where(eq(creatorBatches.id, batch.id))
      .returning();
    return { batch: updated ?? { ...batch, status }, projects, errors };
  }

  return { batch, projects, errors };
}

export async function createCreatorBatch(
  env: AppEnv,
  db: DbClient,
  input: {
    userId: string;
    urls: string[];
    rightsAttested: boolean;
    generateCaptions?: boolean;
    generateHashtags?: boolean;
    burnSubtitles?: boolean;
    subtitleStyle?: string | null;
    swapTier?: string | null;
    workspaceId?: number | null;
    notifyEmail?: string | null;
    facePhoto: { buffer: Buffer; mimeType: string; filename: string };
  },
) {
  if (!input.rightsAttested) {
    throw new Error("You must confirm video rights before processing");
  }

  const urls = normalizeUrlList(input.urls);
  if (urls.length === 0) {
    throw new Error("Add at least one Instagram Reel URL");
  }
  if (urls.length > CREATOR_BATCH_MAX_URLS) {
    throw new Error(`Batch is limited to ${CREATOR_BATCH_MAX_URLS} URLs`);
  }

  const publicId = randomUUID().replace(/-/g, "").slice(0, 12);
  const workspace = input.workspaceId
    ? { id: input.workspaceId }
    : await resolveActiveWorkspace(db, input.userId, null);
  const workspaceId = workspace.id;

  const [batch] = await db
    .insert(creatorBatches)
    .values({
      publicId,
      externalUserId: input.userId,
      workspaceId,
      title: `Batch · ${urls.length} clips`,
      status: "processing",
      itemCount: urls.length,
      errors: [],
    })
    .returning();

  if (!batch) {
    throw new Error("Failed to create batch");
  }

  const storage = createAssetStorage(env);
  const errors: BatchUrlError[] = [];
  const projects = [];

  for (const url of urls) {
    try {
      const imported = await importCreatorVideoFromUrl(env, url);
      const videoBuffer = await storage.getObject(imported.videoKey);
      const project = await createAndProcessCreatorProject(env, db, {
        userId: input.userId,
        title: imported.title,
        rightsAttested: true,
        generateCaptions: input.generateCaptions,
        generateHashtags: input.generateHashtags,
        burnSubtitles: input.burnSubtitles,
        subtitleStyle: input.subtitleStyle,
        swapTier: input.swapTier,
        notifyEmail: input.notifyEmail,
        batchId: batch.id,
        workspaceId,
        facePhoto: input.facePhoto,
        video: {
          buffer: videoBuffer,
          mimeType: "video/mp4",
          filename: imported.filename || "imported.mp4",
        },
      });
      projects.push(project);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed";
      errors.push({ url, error: message });
      console.warn(`[creator-batch] URL failed ${url}:`, message);
    }
  }

  const status = deriveBatchStatus(projects, errors);
  const [updated] = await db
    .update(creatorBatches)
    .set({
      status,
      itemCount: projects.length,
      errors,
      updatedAt: new Date(),
    })
    .where(eq(creatorBatches.id, batch.id))
    .returning();

  return {
    batch: updated ?? batch,
    projects,
    errors,
    createdCount: projects.length,
  };
}

export function serializeCreatorBatchProject(
  project: typeof creatorProjects.$inferSelect,
  assetBase = "/api/assets",
) {
  return {
    publicId: project.publicId,
    title: project.title,
    status: project.status,
    errorMessage: project.errorMessage,
    progress: buildProjectProgress(project),
    outputVideoUrl: project.outputVideoKey ? `${assetBase}/${project.outputVideoKey}` : null,
    thumbnailUrl: project.thumbnailKey ? `${assetBase}/${project.thumbnailKey}` : null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

