import { NextRequest, NextResponse } from "next/server";
import {
  buildProjectProgress,
  getCreatorProject,
  prepareCreatorProjectExports,
  syncCreatorProjectFromRun,
} from "@crosspost/pipeline";
import { resolveAssetUrl } from "@/lib/assets";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { creatorUserCookieHeader, resolveCreatorUserId } from "@/lib/creator-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await resolveCreatorUserId(request);
    const db = getDb();
    const env = getServerEnv();

    let project = await getCreatorProject(db, userId, id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.runId && project.status === "processing") {
      project = (await syncCreatorProjectFromRun(db, project.runId, env)) ?? project;
    }

    if (
      project.status === "ready" &&
      (!project.srtKey || !project.thumbnailKey || (project.burnSubtitles && !project.burnedVideoKey))
    ) {
      project = (await prepareCreatorProjectExports(env, db, project.id)) ?? project;
    }

    const response = NextResponse.json({
      project: {
        publicId: project.publicId,
        title: project.title,
        status: project.status,
        caption: project.caption,
        hashtags: project.hashtags,
        hookVariants: project.hookVariants,
        platformVariants: project.platformVariants,
        transcript: project.transcript,
        progress: buildProjectProgress(project),
        outputVideoUrl: resolveAssetUrl(env, project.outputVideoKey),
        sourceVideoUrl: resolveAssetUrl(env, project.sourceVideoKey),
        thumbnailUrl: resolveAssetUrl(env, project.thumbnailKey),
        burnedVideoUrl: resolveAssetUrl(env, project.burnedVideoKey),
        hasSrt: Boolean(project.srtKey || project.transcript),
        burnSubtitles: project.burnSubtitles,
        subtitleStyle: project.subtitleStyle,
        errorMessage: project.errorMessage,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });

    if (!request.cookies.get("crosspost_uid")) {
      response.headers.set("Set-Cookie", creatorUserCookieHeader(userId));
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load project" },
      { status: 500 },
    );
  }
}
