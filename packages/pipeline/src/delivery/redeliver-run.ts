import type { AppEnv } from "@crosspost/shared";
import type { DbClient } from "@crosspost/db";
import { eq } from "drizzle-orm";
import { deliveries } from "@crosspost/db";
import { writeAuditEvent } from "../health/buildHealthReport";
import { getRunDetail } from "../repositories/run-detail";
import { writeRunAudit } from "../repositories/runs";
import { createAssetStorage } from "../storage/index";
import { deliverRunAssets } from "./deliver-run";

export async function redeliverRun(
  env: AppEnv,
  db: DbClient,
  runId: number,
  requestedBy = "operator",
) {
  const detail = await getRunDetail(db, runId);
  if (!detail) {
    throw new Error(`Run ${runId} not found`);
  }

  if (detail.run.status !== "delivered") {
    throw new Error(`Run ${runId} must be delivered before re-delivery (current: ${detail.run.status})`);
  }

  const winnerRender = detail.renders.find((render) => render.isWinner) ?? detail.renders.at(-1);
  if (!winnerRender?.r2Key) {
    throw new Error(`Run ${runId} has no winner video render to deliver`);
  }

  const storage = createAssetStorage(env);
  const deliveryResult = await deliverRunAssets(env, storage, {
    runId,
    modelSlug: detail.model!.slug,
    sourceShortcode: detail.sourceReel!.shortcode,
    videoR2Key: winnerRender.r2Key,
  });

  const [existing] = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.runId, runId))
    .limit(1);

  if (existing) {
    await db
      .update(deliveries)
      .set({
        destination: deliveryResult.destination,
        r2Key: deliveryResult.r2Key,
        drivePath: deliveryResult.drivePath,
        status: "delivered",
        payload: {
          ...(existing.payload as Record<string, unknown> | null),
          ...deliveryResult.payload,
          redeliveredAt: new Date().toISOString(),
          idempotent: true,
        },
      })
      .where(eq(deliveries.id, existing.id));
  }

  await writeRunAudit(db, {
    action: "run.redelivered",
    entityType: "run",
    entityId: String(runId),
    actorUserId: requestedBy,
    payload: {
      drivePath: deliveryResult.drivePath,
      driveFileId: deliveryResult.driveFileId,
      destination: deliveryResult.destination,
    },
  });

  await writeAuditEvent(db, {
    action: "delivery.redelivered",
    entityType: "run",
    entityId: String(runId),
    actorUserId: requestedBy,
    payload: {
      drivePath: deliveryResult.drivePath,
      driveFileId: deliveryResult.driveFileId,
    },
  });

  return deliveryResult;
}
