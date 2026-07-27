import { NextRequest, NextResponse } from "next/server";
import {
  CREATOR_BATCH_MAX_URLS,
  createCreatorBatch,
  serializeCreatorBatchProject,
} from "@crosspost/pipeline";
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

function parseUrls(form: FormData): string[] {
  const rawJson = form.get("urls");
  if (typeof rawJson === "string" && rawJson.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(rawJson) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch {
      // fall through
    }
  }
  if (typeof rawJson === "string") {
    return rawJson.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }
  return [];
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const facePhoto = form.get("facePhoto");
    const rightsAttested = form.get("rightsAttested") === "true";
    const generateCaptions = form.get("generateCaptions") === "true";
    const generateHashtags = form.get("generateHashtags") === "true";
    const burnSubtitles = form.get("generateSubtitles") === "true";
    const subtitleStyle = normalizeSubtitleStyle(form.get("subtitleStyle"));
    const swapTier = normalizeSwapTier(form.get("swapTier"));
    const urls = parseUrls(form);

    if (!(facePhoto instanceof File)) {
      return NextResponse.json({ error: "facePhoto is required" }, { status: 400 });
    }
    if (urls.length === 0) {
      return NextResponse.json({ error: "Add at least one URL" }, { status: 400 });
    }
    if (urls.length > CREATOR_BATCH_MAX_URLS) {
      return NextResponse.json(
        { error: `Batch is limited to ${CREATOR_BATCH_MAX_URLS} URLs` },
        { status: 400 },
      );
    }

    const env = getServerEnv();
    const db = getDb();
    const { userId, workspaceId } = await resolveCreatorWorkspace(request, db);
    await assertCreatorHasQuota(db, userId, urls.length, workspaceId);

    const auth = await authenticateFirebase(request);
    const notifyEmail =
      "user" in auth && auth.user?.email ? auth.user.email : null;

    const result = await createCreatorBatch(env, db, {
      userId,
      urls,
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
    });

    if (result.createdCount === 0) {
      return NextResponse.json(
        {
          error: "No URLs could be imported",
          errors: result.errors,
        },
        { status: 400 },
      );
    }

    const billing = await consumeCreatorQuota(db, userId, result.createdCount, workspaceId);
    const assetBase = env.LOCAL_ASSET_PUBLIC_BASE_URL ?? "/api/assets";

    const response = NextResponse.json(
      {
        batch: {
          publicId: result.batch.publicId,
          title: result.batch.title,
          status: result.batch.status,
          itemCount: result.batch.itemCount,
          errors: result.errors,
        },
        projects: result.projects.map((project) =>
          serializeCreatorBatchProject(project, assetBase),
        ),
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
      { error: error instanceof Error ? error.message : "Batch create failed" },
      { status: 500 },
    );
  }
}
