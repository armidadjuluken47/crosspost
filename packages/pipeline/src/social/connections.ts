import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { socialConnections } from "@crosspost/db";
import type { AppEnv } from "@crosspost/shared";
import { decryptToken, encryptToken } from "./crypto";
import type {
  DecryptedConnection,
  RefreshedToken,
  SocialAccountInfo,
  SocialPlatform,
} from "./publishers/types";

function newPublicId() {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

export type PublicSocialConnection = {
  publicId: string;
  platform: SocialPlatform;
  accountLabel: string;
  accountRef: string;
  status: string;
  expiresAt: string | null;
  createdAt: string;
};

/** List a user's connections without exposing tokens. */
export async function listSocialConnections(
  db: DbClient,
  userId: string,
): Promise<PublicSocialConnection[]> {
  const rows = await db
    .select()
    .from(socialConnections)
    .where(eq(socialConnections.externalUserId, userId))
    .orderBy(desc(socialConnections.id));

  return rows.map((row) => ({
    publicId: row.publicId,
    platform: row.platform as SocialPlatform,
    accountLabel: row.accountLabel,
    accountRef: row.accountRef,
    status: row.status,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }));
}

function toDecrypted(env: AppEnv, row: typeof socialConnections.$inferSelect): DecryptedConnection {
  return {
    id: row.id,
    platform: row.platform as SocialPlatform,
    accountRef: row.accountRef,
    accountLabel: row.accountLabel,
    accessToken: decryptToken(env, row.accessTokenEnc),
    refreshToken: row.refreshTokenEnc ? decryptToken(env, row.refreshTokenEnc) : null,
    scopes: row.scopes,
    expiresAt: row.expiresAt,
    metadata: row.metadata,
  };
}

export async function getDecryptedConnectionById(
  env: AppEnv,
  db: DbClient,
  connectionId: number,
): Promise<DecryptedConnection | null> {
  const [row] = await db
    .select()
    .from(socialConnections)
    .where(eq(socialConnections.id, connectionId))
    .limit(1);
  return row ? toDecrypted(env, row) : null;
}

/** The active connection a given user has for a platform, if any (tokens decrypted). */
export async function getActiveConnectionForPublish(
  env: AppEnv,
  db: DbClient,
  userId: string,
  platform: SocialPlatform,
): Promise<DecryptedConnection | null> {
  const [row] = await db
    .select()
    .from(socialConnections)
    .where(
      and(
        eq(socialConnections.externalUserId, userId),
        eq(socialConnections.platform, platform),
        eq(socialConnections.status, "active"),
      ),
    )
    .orderBy(desc(socialConnections.id))
    .limit(1);
  return row ? toDecrypted(env, row) : null;
}

/** Insert or update (by user+platform+account) a connection after OAuth. */
export async function upsertSocialConnection(
  env: AppEnv,
  db: DbClient,
  input: {
    userId: string;
    workspaceId: number | null;
    platform: SocialPlatform;
    info: SocialAccountInfo;
  },
) {
  const { userId, workspaceId, platform, info } = input;

  const [existing] = await db
    .select()
    .from(socialConnections)
    .where(
      and(
        eq(socialConnections.externalUserId, userId),
        eq(socialConnections.platform, platform),
        eq(socialConnections.accountRef, info.accountRef),
      ),
    )
    .limit(1);

  const accessTokenEnc = encryptToken(env, info.accessToken);
  const refreshTokenEnc = info.refreshToken ? encryptToken(env, info.refreshToken) : null;

  if (existing) {
    const [updated] = await db
      .update(socialConnections)
      .set({
        workspaceId,
        accountLabel: info.accountLabel,
        accessTokenEnc,
        // Providers may omit a fresh refresh token; keep the previous one if so.
        refreshTokenEnc: refreshTokenEnc ?? existing.refreshTokenEnc,
        scopes: info.scopes,
        expiresAt: info.expiresAt,
        status: "active",
        metadata: info.metadata ?? existing.metadata,
        updatedAt: new Date(),
      })
      .where(eq(socialConnections.id, existing.id))
      .returning();
    return updated!;
  }

  const [created] = await db
    .insert(socialConnections)
    .values({
      publicId: newPublicId(),
      externalUserId: userId,
      workspaceId,
      platform,
      accountLabel: info.accountLabel,
      accountRef: info.accountRef,
      accessTokenEnc,
      refreshTokenEnc,
      scopes: info.scopes,
      expiresAt: info.expiresAt,
      status: "active",
      metadata: info.metadata ?? null,
    })
    .returning();
  return created!;
}

/** Persist a refreshed access token (and optional new refresh token). */
export async function applyRefreshedToken(
  env: AppEnv,
  db: DbClient,
  connectionId: number,
  refreshed: RefreshedToken,
) {
  await db
    .update(socialConnections)
    .set({
      accessTokenEnc: encryptToken(env, refreshed.accessToken),
      refreshTokenEnc: refreshed.refreshToken
        ? encryptToken(env, refreshed.refreshToken)
        : undefined,
      expiresAt: refreshed.expiresAt,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(socialConnections.id, connectionId));
}

export async function markConnectionStatus(
  db: DbClient,
  connectionId: number,
  status: "active" | "expired" | "revoked" | "error",
) {
  await db
    .update(socialConnections)
    .set({ status, updatedAt: new Date() })
    .where(eq(socialConnections.id, connectionId));
}

/** Delete a connection the user owns. Returns true if a row was removed. */
export async function deleteSocialConnection(
  db: DbClient,
  userId: string,
  publicId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(socialConnections)
    .where(
      and(
        eq(socialConnections.externalUserId, userId),
        eq(socialConnections.publicId, publicId),
      ),
    )
    .returning({ id: socialConnections.id });
  return deleted.length > 0;
}
