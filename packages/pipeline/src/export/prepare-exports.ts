import { eq } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { creatorProjects } from "@crosspost/db";
import type { AppEnv } from "@crosspost/shared";
import {
  buildCreatorProjectBurnedVideoKey,
  buildCreatorProjectSrtKey,
  buildCreatorProjectThumbnailKey,
} from "@crosspost/shared";
import { createAssetStorage } from "../storage/index";
import { burnSubtitlesWithStyle } from "./burn-subtitles";
import { transcriptToSrt } from "./srt";
import { extractCoverThumbnail } from "./thumbnail";

/**
 * Generate SRT (+ optional burned video) and cover thumbnail for a ready project.
 * Soft-fails individual steps so the base MP4 + captions remain downloadable.
 */
export async function prepareCreatorProjectExports(
  env: AppEnv,
  db: DbClient,
  projectId: number,
) {
  const [project] = await db
    .select()
    .from(creatorProjects)
    .where(eq(creatorProjects.id, projectId))
    .limit(1);

  if (!project || project.status !== "ready") {
    return project ?? null;
  }

  const storage = createAssetStorage(env);
  const updates: Partial<typeof creatorProjects.$inferInsert> = {
    updatedAt: new Date(),
  };

  const srtContent = transcriptToSrt(project.transcript);
  if (srtContent && !project.srtKey) {
    try {
      const srtKey = buildCreatorProjectSrtKey(project.publicId);
      await storage.putObject({
        key: srtKey,
        body: Buffer.from(srtContent, "utf8"),
        mimeType: "application/x-subrip",
      });
      updates.srtKey = srtKey;
    } catch (error) {
      console.warn(`[export] SRT upload failed for ${project.publicId}:`, error);
    }
  }

  let videoBuffer: Buffer | null = null;
  async function loadOutputVideo() {
    if (videoBuffer) return videoBuffer;
    if (!project.outputVideoKey) return null;
    videoBuffer = await storage.getObject(project.outputVideoKey);
    return videoBuffer;
  }

  if (!project.thumbnailKey && project.outputVideoKey) {
    try {
      const video = await loadOutputVideo();
      if (video) {
        const thumb = await extractCoverThumbnail(env, video);
        const thumbnailKey = buildCreatorProjectThumbnailKey(project.publicId);
        await storage.putObject({
          key: thumbnailKey,
          body: thumb,
          mimeType: "image/jpeg",
        });
        updates.thumbnailKey = thumbnailKey;
      }
    } catch (error) {
      console.warn(`[export] Thumbnail failed for ${project.publicId}:`, error);
    }
  }

  const shouldBurn = project.burnSubtitles && !project.burnedVideoKey;
  if (shouldBurn && srtContent && project.outputVideoKey) {
    try {
      const video = await loadOutputVideo();
      if (video) {
        const burned = await burnSubtitlesWithStyle(
          env,
          video,
          srtContent,
          project.subtitleStyle,
        );
        const burnedVideoKey = buildCreatorProjectBurnedVideoKey(project.publicId);
        await storage.putObject({
          key: burnedVideoKey,
          body: burned,
          mimeType: "video/mp4",
        });
        updates.burnedVideoKey = burnedVideoKey;
      }
    } catch (error) {
      console.warn(`[export] Burned subtitles failed for ${project.publicId}:`, error);
    }
  }

  const hasUpdates =
    updates.srtKey !== undefined ||
    updates.thumbnailKey !== undefined ||
    updates.burnedVideoKey !== undefined;

  if (!hasUpdates) {
    return project;
  }

  const [updated] = await db
    .update(creatorProjects)
    .set(updates)
    .where(eq(creatorProjects.id, project.id))
    .returning();

  return updated ?? project;
}
