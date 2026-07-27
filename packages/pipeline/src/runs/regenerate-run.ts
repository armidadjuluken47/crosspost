import { eq } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { sourceAccounts } from "@crosspost/db";
import type { ManualRunRequest } from "@crosspost/shared";
import { enqueueManualRun } from "../queue/run-jobs";
import { getRunDetail } from "../repositories/run-detail";
import { writeRunAudit } from "../repositories/runs";

export async function regenerateRun(db: DbClient, runId: number, requestedBy = "dashboard") {
  const detail = await getRunDetail(db, runId);
  if (!detail?.model || !detail?.sourceReel) {
    throw new Error(`Run ${runId} is missing model or source reel`);
  }

  const [sourceAccount] = await db
    .select()
    .from(sourceAccounts)
    .where(eq(sourceAccounts.id, detail.sourceReel.sourceAccountId))
    .limit(1);

  if (!sourceAccount) {
    throw new Error(`Source account not found for run ${runId}`);
  }

  const request: ManualRunRequest = {
    sourceAccount: { handle: sourceAccount.handle },
    sourceReel: {
      shortcode: detail.sourceReel.shortcode,
      reelUrl: detail.sourceReel.reelUrl,
      postedAt: detail.sourceReel.postedAt?.toISOString(),
      caption: detail.sourceReel.caption ?? undefined,
      viewCount: detail.sourceReel.viewCount ?? undefined,
      durationSeconds: detail.sourceReel.durationSeconds ?? undefined,
      mp4R2Key: detail.sourceReel.mp4R2Key ?? undefined,
      firstFrameR2Key: detail.sourceReel.firstFrameR2Key ?? undefined,
    },
    model: {
      slug: detail.model.slug,
      displayName: detail.model.displayName,
    },
    prompt: "",
    executionMode: "queued",
  };

  const queued = await enqueueManualRun(db, request, {
    idempotencyKey: `regenerate:from-run-${runId}:${Date.now()}`,
  });

  await writeRunAudit(db, {
    action: "run.regenerated",
    entityType: "run",
    entityId: String(queued.run.id),
    actorUserId: requestedBy,
    payload: { fromRunId: runId, modelSlug: detail.model.slug, shortcode: detail.sourceReel.shortcode },
  });

  return queued;
}
