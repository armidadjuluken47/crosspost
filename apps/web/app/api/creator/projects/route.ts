import { NextRequest, NextResponse } from "next/server";
import {
  buildProjectProgress,
  createAndProcessCreatorProject,
  listCreatorProjects,
} from "@crosspost/pipeline";
import { resolveAssetUrl } from "@/lib/assets";
import { normalizeSubtitleStyle, normalizeSwapTier } from "@crosspost/shared";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { creatorUserCookieHeader } from "@/lib/creator-auth";
import { resolveCreatorWorkspace } from "@/lib/creator-workspace";
import { authenticateFirebase } from "@/lib/firebase-auth";
import {
  assertCreatorHasQuota,
  consumeCreatorQuota,
  QuotaExceededError,
} from "@/lib/creator-quota";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const env = getServerEnv();
    const { userId, workspacePublicId } = await resolveCreatorWorkspace(request, db);
    const projects = await listCreatorProjects(db, userId, workspacePublicId);

    const response = NextResponse.json({
      projects: projects.map((project) => ({
        publicId: project.publicId,
        title: project.title,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        thumbnailUrl: resolveAssetUrl(env, project.thumbnailKey),
      })),
    });

    if (!request.cookies.get("crosspost_uid")) {
      response.headers.set("Set-Cookie", creatorUserCookieHeader(userId));
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list projects" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const facePhoto = form.get("facePhoto");
    const video = form.get("video");
    const rightsAttested = form.get("rightsAttested") === "true";
    const title = String(form.get("title") ?? "").trim();
    const generateCaptions = form.get("generateCaptions") === "true";
    const generateHashtags = form.get("generateHashtags") === "true";
    const burnSubtitles = form.get("generateSubtitles") === "true";
    const subtitleStyle = normalizeSubtitleStyle(form.get("subtitleStyle"));
    const swapTier = normalizeSwapTier(form.get("swapTier"));

    if (!(facePhoto instanceof File)) {
      return NextResponse.json({ error: "facePhoto is required" }, { status: 400 });
    }

    if (!(video instanceof File)) {
      return NextResponse.json({ error: "video is required" }, { status: 400 });
    }

    const env = getServerEnv();
    const db = getDb();
    const { userId, workspaceId } = await resolveCreatorWorkspace(request, db);

    await assertCreatorHasQuota(db, userId, 1, workspaceId);

    const auth = await authenticateFirebase(request);
    const notifyEmail =
      "user" in auth && auth.user?.email ? auth.user.email : null;

    const project = await createAndProcessCreatorProject(
      env,
      db,
      {
        userId,
        title,
        rightsAttested,
        generateCaptions,
        generateHashtags,
        burnSubtitles,
        subtitleStyle,
        swapTier,
        workspaceId,
        notifyEmail,
        facePhoto: {
          buffer: Buffer.from(await facePhoto.arrayBuffer()),
          mimeType: facePhoto.type || "image/jpeg",
          filename: facePhoto.name,
        },
        video: {
          buffer: Buffer.from(await video.arrayBuffer()),
          mimeType: video.type || "video/mp4",
          filename: video.name,
        },
      },
      { deferProcessing: true },
    );

    const billing = await consumeCreatorQuota(db, userId, 1, workspaceId);

    const response = NextResponse.json(
      {
        project: {
          publicId: project.publicId,
          title: project.title,
          status: project.status,
          caption: project.caption,
          hashtags: project.hashtags,
          hookVariants: project.hookVariants,
          progress: buildProjectProgress(project),
        },
        billing: {
          plan: billing.plan,
          videosRemaining: billing.unlimited ? null : billing.videosRemaining,
          unlimited: billing.unlimited,
        },
      },
      { status: 201 },
    );

    response.headers.set("Set-Cookie", creatorUserCookieHeader(userId));
    return response;
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 402 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create project" },
      { status: 500 },
    );
  }
}
