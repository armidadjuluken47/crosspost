import { eq } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { sourceAccounts, sourceReels } from "@crosspost/db";
import type { AppEnv } from "@crosspost/shared";
import { buildSourceFirstFrameKey, buildSourceMp4Key } from "@crosspost/shared";
import { extractFirstFrameFromMp4 } from "../media/extract-first-frame";
import { loadFixtureImageBuffer } from "../media/assets";
import { writeAuditEvent } from "../health/buildHealthReport";
import { openSourceException } from "../repositories/exceptions";
import { notifyRunException } from "../notifications/telegram";
import { createAssetStorage } from "../storage/index";
import { downloadBinary } from "./download";
import type { ApifyReelCandidate } from "./apify-client";

export interface IngestReelInput {
  sourceAccountId: number;
  accountHandle: string;
  candidate: ApifyReelCandidate;
  providerId: string;
}

export interface IngestReelResult {
  status: "ingested" | "skipped_duplicate" | "failed";
  reelId?: number;
  shortcode: string;
  error?: string;
}

async function buildFixtureMp4(env: AppEnv): Promise<Buffer> {
  const image = await loadFixtureImageBuffer();
  const { spawnSync } = await import("node:child_process");
  const { mkdtemp, readFile, rm, writeFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { resolveFfmpegPath } = await import("../ffmpeg/check");

  const ffmpegPath = resolveFfmpegPath(env);
  if (!ffmpegPath) {
    return image;
  }

  const tempDir = await mkdtemp(join(tmpdir(), "amve-fixture-mp4-"));
  const imagePath = join(tempDir, "frame.png");
  const outputPath = join(tempDir, "clip.mp4");

  try {
    await writeFile(imagePath, image);
    const result = spawnSync(
      ffmpegPath,
      [
        "-y",
        "-loop",
        "1",
        "-i",
        imagePath,
        "-c:v",
        "libx264",
        "-t",
        "3",
        "-pix_fmt",
        "yuv420p",
        "-vf",
        "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        outputPath,
      ],
      { encoding: "utf8" },
    );

    if (result.status !== 0) {
      throw new Error(result.stderr || "fixture mp4 generation failed");
    }

    return await readFile(outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function ingestReelCandidate(
  env: AppEnv,
  db: DbClient,
  input: IngestReelInput,
): Promise<IngestReelResult> {
  const { candidate, accountHandle, sourceAccountId, providerId } = input;
  const shortcode = candidate.shortcode;

  const [existing] = await db
    .select()
    .from(sourceReels)
    .where(eq(sourceReels.shortcode, shortcode))
    .limit(1);

  if (existing) {
    return { status: "skipped_duplicate", shortcode, reelId: existing.id };
  }

  try {
    const storage = createAssetStorage(env);
    const mp4R2Key = buildSourceMp4Key(accountHandle, shortcode);
    const firstFrameR2Key = buildSourceFirstFrameKey(accountHandle, shortcode);

    let mp4Buffer: Buffer;
    if (candidate.videoUrl) {
      const apifyToken = env.APIFY_TOKEN?.trim();
      mp4Buffer = await downloadBinary(candidate.videoUrl, 120_000, {
        referer: candidate.reelUrl,
        authorization:
          apifyToken && /api\.apify\.com/i.test(candidate.videoUrl) ? apifyToken : undefined,
      });
      // Reject tiny / non-media payloads (HTML error pages, empty KV records)
      if (mp4Buffer.length < 50_000) {
        throw new Error(
          `Downloaded file too small (${mp4Buffer.length} bytes) — not a usable MP4`,
        );
      }
    } else if (env.INGESTION_PROVIDER_MODE === "fixture") {
      mp4Buffer = await buildFixtureMp4(env);
    } else {
      throw new Error("No downloadable video URL in Apify result");
    }

    const mp4Stored = await storage.putObject({
      key: mp4R2Key,
      body: mp4Buffer,
      mimeType: "video/mp4",
    });

    const frame = await extractFirstFrameFromMp4(env, mp4Buffer);
    const frameStored = await storage.putObject({
      key: firstFrameR2Key,
      body: frame.buffer,
      mimeType: "image/png",
    });

    const [reel] = await db
      .insert(sourceReels)
      .values({
        sourceAccountId,
        shortcode,
        platform: candidate.platform ?? "instagram",
        reelUrl: candidate.reelUrl,
        caption: candidate.caption,
        viewCount: candidate.viewCount,
        likeCount: candidate.likeCount,
        commentCount: candidate.commentCount,
        durationSeconds: candidate.durationSeconds,
        postedAt: candidate.postedAt ? new Date(candidate.postedAt) : undefined,
        mp4R2Key: mp4Stored.key,
        firstFrameR2Key: frameStored.key,
        width: frame.width,
        height: frame.height,
        status: "preview_ready",
        rankPayload: {
          providerId,
          platform: candidate.platform ?? "instagram",
          raw: candidate.raw,
          mp4PublicUrl: mp4Stored.publicUrl,
          firstFramePublicUrl: frameStored.publicUrl,
        },
      })
      .returning();

    await db
      .update(sourceAccounts)
      .set({ lastScrapedAt: new Date(), updatedAt: new Date() })
      .where(eq(sourceAccounts.id, sourceAccountId));

    await writeAuditEvent(db, {
      action: "source_reel.ingested",
      entityType: "source_reel",
      entityId: String(reel!.id),
      payload: { shortcode, accountHandle, providerId },
    });

    return { status: "ingested", shortcode, reelId: reel!.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Intake failed";

    await openSourceException(db, {
      stage: "source_intake",
      reason: `Failed to ingest reel ${shortcode}: ${message}`,
      payload: { shortcode, accountHandle, error: message, providerId },
    });

    await notifyRunException(env, {
      stage: "source_intake",
      reason: `Failed to ingest reel ${shortcode}: ${message}`,
    });

    return { status: "failed", shortcode, error: message };
  }
}
