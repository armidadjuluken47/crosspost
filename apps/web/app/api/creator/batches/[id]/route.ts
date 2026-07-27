import { NextRequest, NextResponse } from "next/server";
import { getCreatorBatch, serializeCreatorBatchProject } from "@crosspost/pipeline";
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
    const result = await getCreatorBatch(db, userId, id);

    if (!result) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const assetBase = env.LOCAL_ASSET_PUBLIC_BASE_URL ?? "/api/assets";
    const response = NextResponse.json({
      batch: {
        publicId: result.batch.publicId,
        title: result.batch.title,
        status: result.batch.status,
        itemCount: result.batch.itemCount,
        errors: result.errors,
        createdAt: result.batch.createdAt,
        updatedAt: result.batch.updatedAt,
      },
      projects: result.projects.map((project) =>
        serializeCreatorBatchProject(project, assetBase),
      ),
    });

    if (!request.cookies.get("crosspost_uid")) {
      response.headers.set("Set-Cookie", creatorUserCookieHeader(userId));
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load batch" },
      { status: 500 },
    );
  }
}
