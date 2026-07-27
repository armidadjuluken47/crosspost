import { and, eq } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { sourceAccounts, sourceReels } from "@crosspost/db";
import type { AppEnv } from "@crosspost/shared";
import { hasApifyCredentials } from "@crosspost/shared";
import { writeAuditEvent } from "../health/buildHealthReport";
import {
  detectSourcePlatformFromUrl,
  fetchApifyVideoByUrl,
  fetchApifyVideosForPlatform,
  type SourcePlatform,
} from "./apify-client";
import { ingestReelCandidate, type IngestReelResult } from "./ingest-reel";

const FIXTURE_PROVIDER_ID = "fixture_ingestion";
const IMPORTED_ACCOUNT_HANDLE = "imported";

function providerIdForPlatform(platform: string) {
  if (platform === "tiktok") return "apify_tiktok_scraper";
  if (platform === "youtube") return "apify_youtube_scraper";
  return "apify_instagram_reel_scraper";
}

function buildFixtureCandidates(handle: string, maxReels: number, platform: SourcePlatform) {
  return Array.from({ length: maxReels }, (_, index) => {
    const id = `fixture-${handle}-${index + 1}`;
    const shortcode =
      platform === "instagram" ? id : platform === "tiktok" ? `tiktok:${id}` : `youtube:${id}`;
    const reelUrl =
      platform === "tiktok"
        ? `https://www.tiktok.com/@${handle}/video/${index + 1}`
        : platform === "youtube"
          ? `https://www.youtube.com/shorts/${id}`
          : `https://www.instagram.com/reel/${shortcode}/`;
    return {
      shortcode,
      reelUrl,
      caption: `Fixture ${platform} clip ${index + 1} for @${handle}`,
      viewCount: 50_000 + index * 10_000,
      likeCount: 1_000 + index * 100,
      commentCount: 50 + index * 10,
      durationSeconds: 7,
      postedAt: new Date().toISOString(),
      platform,
      raw: { mode: "fixture", handle, ordinal: index + 1, platform },
    };
  });
}

export async function runAccountIntake(
  env: AppEnv,
  db: DbClient,
  input: { accountId: number; maxReels: number; requestedBy?: string },
) {
  const [account] = await db
    .select()
    .from(sourceAccounts)
    .where(eq(sourceAccounts.id, input.accountId))
    .limit(1);

  if (!account) {
    throw new Error(`Source account ${input.accountId} not found`);
  }

  if (account.status !== "active") {
    throw new Error(`Source account @${account.handle} is not active`);
  }

  const platform = (account.platform as SourcePlatform) || "instagram";
  const useApify = env.INGESTION_PROVIDER_MODE === "api" && hasApifyCredentials(env);
  const providerId = useApify ? providerIdForPlatform(platform) : FIXTURE_PROVIDER_ID;

  const candidates = useApify
    ? await fetchApifyVideosForPlatform(env, platform, account.handle, input.maxReels)
    : buildFixtureCandidates(account.handle, input.maxReels, platform);

  const results: IngestReelResult[] = [];
  for (const candidate of candidates) {
    results.push(
      await ingestReelCandidate(env, db, {
        sourceAccountId: account.id,
        accountHandle: account.handle,
        candidate,
        providerId,
      }),
    );
  }

  await writeAuditEvent(db, {
    action: "ingestion.account_completed",
    entityType: "source_account",
    entityId: String(account.id),
    actorUserId: input.requestedBy ?? "operator",
    payload: {
      handle: account.handle,
      platform,
      providerId,
      candidateCount: candidates.length,
      ingested: results.filter((r) => r.status === "ingested").length,
      failed: results.filter((r) => r.status === "failed").length,
    },
  });

  return {
    account,
    providerId,
    candidates: candidates.map((c) => c.shortcode),
    results,
  };
}

export async function runRegisteredIntake(
  env: AppEnv,
  db: DbClient,
  input: { maxReels: number; requestedBy?: string; handles?: string[] },
) {
  let accounts = await db.select().from(sourceAccounts).where(eq(sourceAccounts.status, "active"));

  if (input.handles?.length) {
    const normalized = input.handles.map((h) => h.replace(/^@/, "").toLowerCase());
    accounts = accounts.filter((a) => normalized.includes(a.handle.toLowerCase()));
  }

  if (accounts.length === 0) {
    throw new Error("No active source accounts available for intake");
  }

  const batches = [];
  for (const account of accounts) {
    batches.push(
      await runAccountIntake(env, db, {
        accountId: account.id,
        maxReels: input.maxReels,
        requestedBy: input.requestedBy,
      }),
    );
  }

  await writeAuditEvent(db, {
    action: "ingestion.registered_completed",
    entityType: "ingestion",
    actorUserId: input.requestedBy ?? "operator",
    payload: {
      sourceCount: accounts.length,
      maxReels: input.maxReels,
    },
  });

  return {
    sourceCount: accounts.length,
    providerId:
      env.INGESTION_PROVIDER_MODE === "api" ? "apify_multi_platform" : FIXTURE_PROVIDER_ID,
    batches,
  };
}

export async function importReelByUrl(
  env: AppEnv,
  db: DbClient,
  input: { url: string; requestedBy?: string },
) {
  const platform = detectSourcePlatformFromUrl(input.url);
  if (!platform) {
    throw new Error(
      "Enter a valid Instagram Reel, TikTok, or YouTube Shorts link.",
    );
  }

  const useApify = env.INGESTION_PROVIDER_MODE === "api" && hasApifyCredentials(env);
  const providerId = useApify ? providerIdForPlatform(platform) : FIXTURE_PROVIDER_ID;

  let candidate;
  if (useApify) {
    candidate = await fetchApifyVideoByUrl(env, input.url);
  } else {
    const stamp = Date.now().toString(36);
    const shortcode =
      platform === "instagram"
        ? `fixture-import-${stamp}`
        : platform === "tiktok"
          ? `tiktok:fixture-import-${stamp}`
          : `youtube:fixture-import-${stamp}`;
    candidate = {
      shortcode,
      reelUrl: input.url.trim(),
      caption: `Fixture imported ${platform} clip`,
      viewCount: 12_000,
      likeCount: 400,
      commentCount: 20,
      durationSeconds: 8,
      postedAt: new Date().toISOString(),
      platform,
      raw: { mode: "fixture-import", url: input.url.trim(), platform },
    };
  }

  if (!candidate) {
    throw new Error(`No video found at ${input.url}. It may be private, removed, or unsupported.`);
  }

  if (useApify && !candidate.videoUrl) {
    throw new Error(
      `Video ${candidate.shortcode} returned no downloadable file. Try another public link or upload an MP4.`,
    );
  }

  const [existing] = await db
    .select()
    .from(sourceReels)
    .where(eq(sourceReels.shortcode, candidate.shortcode))
    .limit(1);

  if (existing) {
    return {
      account: null,
      providerId,
      result: {
        status: "skipped_duplicate" as const,
        shortcode: candidate.shortcode,
        reelId: existing.id,
      },
    };
  }

  let [account] = await db
    .select()
    .from(sourceAccounts)
    .where(
      and(
        eq(sourceAccounts.handle, IMPORTED_ACCOUNT_HANDLE),
        eq(sourceAccounts.platform, platform),
      ),
    )
    .limit(1);

  if (!account) {
    const [created] = await db
      .insert(sourceAccounts)
      .values({
        handle: IMPORTED_ACCOUNT_HANDLE,
        platform,
        status: "active",
        notes: `${platform} reels imported by direct URL`,
      })
      .returning();
    account = created!;
  }

  const result = await ingestReelCandidate(env, db, {
    sourceAccountId: account.id,
    accountHandle: account.handle,
    candidate,
    providerId,
  });

  await writeAuditEvent(db, {
    action: "ingestion.reel_imported",
    entityType: "source_reel",
    entityId: result.reelId ? String(result.reelId) : candidate.shortcode,
    actorUserId: input.requestedBy ?? "operator",
    payload: {
      shortcode: candidate.shortcode,
      url: input.url.trim(),
      platform,
      providerId,
      status: result.status,
    },
  });

  return { account, providerId, result };
}

export async function runFixtureIntake(
  env: AppEnv,
  db: DbClient,
  input: { handle: string; maxReels: number; requestedBy?: string },
) {
  const normalized = input.handle.replace(/^@/, "").toLowerCase();
  let [account] = await db
    .select()
    .from(sourceAccounts)
    .where(eq(sourceAccounts.handle, normalized))
    .limit(1);

  if (!account) {
    const [created] = await db
      .insert(sourceAccounts)
      .values({ handle: normalized, status: "active" })
      .returning();
    account = created!;
  }

  const previousMode = env.INGESTION_PROVIDER_MODE;
  const fixtureEnv = { ...env, INGESTION_PROVIDER_MODE: "fixture" as const };

  const outcome = await runAccountIntake(fixtureEnv, db, {
    accountId: account.id,
    maxReels: input.maxReels,
    requestedBy: input.requestedBy,
  });

  return {
    ...outcome,
    providerId: FIXTURE_PROVIDER_ID,
    mode: previousMode,
  };
}
