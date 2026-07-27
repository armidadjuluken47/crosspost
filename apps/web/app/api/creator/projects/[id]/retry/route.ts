import { NextRequest, NextResponse } from "next/server";
import { buildProjectProgress, retryCreatorProject } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { resolveCreatorUserId } from "@/lib/creator-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const userId = await resolveCreatorUserId(request);
    const { id } = await context.params;
    const env = getServerEnv();
    const db = getDb();

    const project = await retryCreatorProject(env, db, userId, id);

    return NextResponse.json({
      project: {
        publicId: project.publicId,
        title: project.title,
        status: project.status,
        caption: project.caption,
        hashtags: project.hashtags,
        hookVariants: project.hookVariants,
        errorMessage: project.errorMessage,
        progress: buildProjectProgress(project),
        outputVideoUrl: project.outputVideoKey
          ? `/api/assets/${project.outputVideoKey}`
          : null,
        sourceVideoUrl: project.sourceVideoKey
          ? `/api/assets/${project.sourceVideoKey}`
          : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Retry failed";
    const status = message === "Project not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
