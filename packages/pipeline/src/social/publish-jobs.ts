import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { creatorProjects, socialPosts } from "@crosspost/db";
import type { AppEnv } from "@crosspost/shared";
import { createAssetStorage } from "../storage";
import {
  applyRefreshedToken,
  getDecryptedConnectionById,
  markConnectionStatus,
} from "./connections";
import { getPublisher } from "./publishers/registry";
import { SocialPublishError, type SocialPlatform } from "./publishers/types";

const LOCK_DURATION_MS = 30 * 60 * 1000;

function newPublicId() {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

export type EnqueueSocialPostInput = {
  projectId: number;
  connectionId: number;
  platform: SocialPlatform;
  privacy?: "private" | "public" | "unlisted";
  titleSnapshot?: string | null;
  captionSnapshot?: string | null;
};

export async function enqueueSocialPost(db: DbClient, input: EnqueueSocialPostInput) {
  const [post] = await db
    .insert(socialPosts)
    .values({
      publicId: newPublicId(),
      projectId: input.projectId,
      connectionId: input.connectionId,
      platform: input.platform,
      status: "queued",
      privacy: input.privacy ?? "private",
      titleSnapshot: input.titleSnapshot ?? null,
      captionSnapshot: input.captionSnapshot ?? null,
    })
    .returning();
  return post!;
}

export async function listSocialPostsForProject(db: DbClient, projectId: number) {
  return db
    .select()
    .from(socialPosts)
    .where(eq(socialPosts.projectId, projectId))
    .orderBy(desc(socialPosts.id));
}

export async function releaseStaleSocialPosts(db: DbClient) {
  const now = new Date();
  const stale = await db
    .select()
    .from(socialPosts)
    .where(
      and(
        eq(socialPosts.status, "running"),
        or(isNull(socialPosts.lockedUntil), lte(socialPosts.lockedUntil, now)),
      ),
    );

  for (const post of stale) {
    await db
      .update(socialPosts)
      .set({
        status: "queued",
        lockedBy: null,
        lockedUntil: null,
        error: "Worker lock expired — requeued",
        updatedAt: new Date(),
      })
      .where(eq(socialPosts.id, post.id));
  }

  return stale.length;
}

export async function claimNextSocialPost(db: DbClient, workerId: string) {
  return db.transaction(async (tx) => {
    const [candidate] = await tx
      .select()
      .from(socialPosts)
      .where(
        and(
          inArray(socialPosts.status, ["queued"]),
          lte(socialPosts.availableAt, new Date()),
        ),
      )
      .orderBy(socialPosts.availableAt, socialPosts.id)
      .limit(1)
      .for("update", { skipLocked: true });

    if (!candidate) return null;

    const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
    const [post] = await tx
      .update(socialPosts)
      .set({
        status: "running",
        lockedBy: workerId,
        lockedUntil,
        attempts: candidate.attempts + 1,
        updatedAt: new Date(),
      })
      .where(eq(socialPosts.id, candidate.id))
      .returning();

    return post ?? null;
  });
}

async function markSocialPostFailed(
  db: DbClient,
  post: typeof socialPosts.$inferSelect,
  errorMessage: string,
  retryable: boolean,
) {
  const shouldRetry = retryable && post.attempts < post.maxAttempts;
  const availableAt = new Date(Date.now() + Math.min(60_000 * post.attempts, 300_000));

  await db
    .update(socialPosts)
    .set({
      status: shouldRetry ? "queued" : "failed",
      lockedBy: null,
      lockedUntil: null,
      error: errorMessage.slice(0, 1000),
      availableAt: shouldRetry ? availableAt : post.availableAt,
      updatedAt: new Date(),
    })
    .where(eq(socialPosts.id, post.id));
}

export async function processSocialPost(
  env: AppEnv,
  db: DbClient,
  post: typeof socialPosts.$inferSelect,
) {
  try {
    const platform = post.platform as SocialPlatform;

    if (!post.connectionId) {
      throw new SocialPublishError("No connected account for this post", platform);
    }

    const [project] = await db
      .select()
      .from(creatorProjects)
      .where(eq(creatorProjects.id, post.projectId))
      .limit(1);
    if (!project) {
      throw new SocialPublishError("Project not found", platform);
    }
    if (!project.outputVideoKey) {
      throw new SocialPublishError("Project has no output video yet", platform);
    }

    let connection = await getDecryptedConnectionById(env, db, post.connectionId);
    if (!connection) {
      throw new SocialPublishError("Connected account was removed; reconnect it", platform);
    }

    const publisher = getPublisher(platform);

    // Refresh the access token if needed, and persist it.
    try {
      const refreshed = await publisher.refreshIfNeeded(env, connection);
      if (refreshed) {
        await applyRefreshedToken(env, db, connection.id, refreshed);
        connection = { ...connection, accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt };
      }
    } catch (error) {
      await markConnectionStatus(db, connection.id, "expired");
      throw error;
    }

    const storage = createAssetStorage(env);
    const videoBuffer = await storage.getObject(project.outputVideoKey);
    const videoUrl = storage.getPublicUrl(project.outputVideoKey);

    const caption = post.captionSnapshot ?? project.caption ?? "";
    const title = post.titleSnapshot ?? project.title ?? "Untitled";

    const result = await publisher.publish(env, connection, {
      videoBuffer,
      videoUrl,
      title,
      caption,
      hashtags: project.hashtags,
      aigcLabel: true,
      privacy: (post.privacy as "private" | "public" | "unlisted") ?? "private",
    });

    await db
      .update(socialPosts)
      .set({
        status: "posted",
        remotePostId: result.remotePostId,
        remotePostUrl: result.remotePostUrl ?? null,
        error: null,
        lockedBy: null,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(socialPosts.id, post.id));

    return { ok: true as const, post };
  } catch (error) {
    const retryable = error instanceof SocialPublishError ? error.retryable : true;
    const message = error instanceof Error ? error.message : "Publish failed";
    await markSocialPostFailed(db, post, message, retryable);
    return { ok: false as const, error: message };
  }
}

export async function processNextSocialPost(env: AppEnv, db: DbClient, workerId: string) {
  await releaseStaleSocialPosts(db);

  const post = await claimNextSocialPost(db, workerId);
  if (!post) {
    return { processed: false as const };
  }

  const result = await processSocialPost(env, db, post);
  return { processed: true as const, post, result };
}
