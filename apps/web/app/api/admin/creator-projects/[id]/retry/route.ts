import { NextRequest, NextResponse } from "next/server";
import { adminRetryCreatorProject, buildProjectProgress } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const env = getServerEnv();
    const db = getDb();
    const project = await adminRetryCreatorProject(env, db, id);

    return NextResponse.json({
      project: {
        publicId: project.publicId,
        title: project.title,
        status: project.status,
        runId: project.runId,
        errorMessage: project.errorMessage,
        progress: buildProjectProgress(project),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Retry failed";
    const status = message === "Project not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
