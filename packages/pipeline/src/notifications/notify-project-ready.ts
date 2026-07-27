import { eq } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { creatorProjects } from "@crosspost/db";
import type { AppEnv } from "@crosspost/shared";
import {
  notifyCreatorProjectFailed,
  notifyCreatorProjectReady,
} from "../notifications/email";

function resolveAppBaseUrl(env: AppEnv): string {
  const base =
    env.APP_BASE_URL?.trim() ||
    env.LOCAL_ASSET_PUBLIC_BASE_URL?.replace(/\/api\/assets\/?$/, "") ||
    "http://localhost:3000";
  return base.startsWith("http") ? base : "http://localhost:3000";
}

/**
 * Send a single terminal-status email (ready or failed) for a creator project.
 * Uses `readyNotifiedAt` as a one-shot marker so we never send more than one
 * status email per project (and never spam on polls).
 */
export async function maybeNotifyCreatorProjectStatus(
  env: AppEnv,
  db: DbClient,
  projectId: number,
) {
  const [project] = await db
    .select()
    .from(creatorProjects)
    .where(eq(creatorProjects.id, projectId))
    .limit(1);

  if (!project) return null;

  const isTerminal = project.status === "ready" || project.status === "failed";
  if (!isTerminal || project.readyNotifiedAt) {
    return project;
  }

  const email = project.notifyEmail?.trim();
  if (!email) {
    return project;
  }

  const appBaseUrl = resolveAppBaseUrl(env);

  const result =
    project.status === "ready"
      ? await notifyCreatorProjectReady(env, {
          to: email,
          projectTitle: project.title,
          publicId: project.publicId,
          appBaseUrl,
        })
      : await notifyCreatorProjectFailed(env, {
          to: email,
          projectTitle: project.title,
          publicId: project.publicId,
          appBaseUrl,
          errorMessage: project.errorMessage,
        });

  // Mark notified for both sent and stub-logged so we don't spam console on polls.
  if (result.sent || result.skipped === "no_resend_key") {
    const [updated] = await db
      .update(creatorProjects)
      .set({ readyNotifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(creatorProjects.id, project.id))
      .returning();
    return updated ?? project;
  }

  return project;
}

/** Back-compat alias — now routes through the shared terminal-status notifier. */
export async function maybeNotifyCreatorProjectReady(
  env: AppEnv,
  db: DbClient,
  projectId: number,
) {
  return maybeNotifyCreatorProjectStatus(env, db, projectId);
}
