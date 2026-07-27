import { NextRequest, NextResponse } from "next/server";
import {
  enqueueSocialPost,
  getActiveConnectionForPublish,
  getCreatorProject,
  isSocialPlatform,
  listSocialPostsForProject,
  processSocialPost,
  type SocialPlatform,
} from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { resolveCreatorUserId } from "@/lib/creator-auth";

function serializePost(post: {
  publicId: string;
  platform: string;
  status: string;
  remotePostUrl: string | null;
  error: string | null;
  updatedAt: Date;
}) {
  return {
    publicId: post.publicId,
    platform: post.platform,
    status: post.status,
    remotePostUrl: post.remotePostUrl,
    error: post.error,
    updatedAt: post.updatedAt,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getDb();
    const userId = await resolveCreatorUserId(request);

    const project = await getCreatorProject(db, userId, id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const posts = await listSocialPostsForProject(db, project.id);
    return NextResponse.json({ posts: posts.map(serializePost) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load posts" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const env = getServerEnv();
    const db = getDb();
    const userId = await resolveCreatorUserId(request);

    const project = await getCreatorProject(db, userId, id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.status !== "ready") {
      return NextResponse.json(
        { error: "Project is not ready to publish yet" },
        { status: 409 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      platforms?: unknown;
      privacy?: unknown;
    };
    const requested = Array.isArray(body.platforms) ? body.platforms : [];
    const platforms = requested.filter(
      (value): value is SocialPlatform =>
        typeof value === "string" && isSocialPlatform(value),
    );
    if (platforms.length === 0) {
      return NextResponse.json({ error: "No platforms selected" }, { status: 400 });
    }

    const privacy =
      body.privacy === "public" || body.privacy === "unlisted"
        ? body.privacy
        : "private";

    const enqueued: Awaited<ReturnType<typeof enqueueSocialPost>>[] = [];
    const missing: SocialPlatform[] = [];

    for (const platform of platforms) {
      const connection = await getActiveConnectionForPublish(env, db, userId, platform);
      if (!connection) {
        missing.push(platform);
        continue;
      }
      const post = await enqueueSocialPost(db, {
        projectId: project.id,
        connectionId: connection.id,
        platform,
        privacy,
        titleSnapshot: project.title,
        captionSnapshot: project.caption,
      });
      enqueued.push(post);
    }

    // In inline mode, process immediately (best-effort, non-blocking). In queued
    // mode, the worker picks them up on its next tick.
    if (env.RUN_EXECUTION_MODE !== "queued" && enqueued.length > 0) {
      void Promise.allSettled(enqueued.map((post) => processSocialPost(env, db, post)));
    }

    const posts = await listSocialPostsForProject(db, project.id);
    return NextResponse.json(
      {
        ok: true,
        queued: enqueued.map((post) => post.platform),
        missing,
        posts: posts.map(serializePost),
      },
      { status: 202 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to publish" },
      { status: 500 },
    );
  }
}
