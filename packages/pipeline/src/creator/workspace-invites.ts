import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, lt, sql } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import {
  creatorWorkspaceInvites,
  creatorWorkspaceMembers,
  creatorWorkspaces,
} from "@crosspost/db";
import type { AppEnv } from "@crosspost/shared";
import { notifyWorkspaceInvite } from "../notifications/email";
import { getWorkspaceMembership, type WorkspaceRole } from "./workspaces";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type WorkspaceInviteSummary = {
  id: number;
  email: string;
  role: WorkspaceRole;
  status: string;
  expiresAt: Date;
  createdAt: Date;
};

function newInviteToken() {
  return randomBytes(24).toString("hex");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function appBaseUrl(env: AppEnv) {
  return (env.APP_BASE_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
}

async function assertCanManageInvites(
  db: DbClient,
  actorUserId: string,
  workspacePublicId: string,
) {
  const membership = await getWorkspaceMembership(db, actorUserId, workspacePublicId);
  if (!membership || membership.workspace.isPersonal) {
    throw new Error("Team workspace not found");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Only workspace owners or admins can manage invites");
  }
  return membership;
}

async function expireStaleInvites(db: DbClient, workspaceId?: number) {
  const conditions = [
    eq(creatorWorkspaceInvites.status, "pending"),
    lt(creatorWorkspaceInvites.expiresAt, new Date()),
  ];
  if (workspaceId != null) {
    conditions.push(eq(creatorWorkspaceInvites.workspaceId, workspaceId));
  }
  await db
    .update(creatorWorkspaceInvites)
    .set({ status: "expired" })
    .where(and(...conditions));
}

export async function listWorkspaceInvites(
  db: DbClient,
  actorUserId: string,
  workspacePublicId: string,
): Promise<WorkspaceInviteSummary[]> {
  const membership = await assertCanManageInvites(db, actorUserId, workspacePublicId);
  await expireStaleInvites(db, membership.workspace.id);

  const rows = await db
    .select({
      id: creatorWorkspaceInvites.id,
      email: creatorWorkspaceInvites.email,
      role: creatorWorkspaceInvites.role,
      status: creatorWorkspaceInvites.status,
      expiresAt: creatorWorkspaceInvites.expiresAt,
      createdAt: creatorWorkspaceInvites.createdAt,
    })
    .from(creatorWorkspaceInvites)
    .where(
      and(
        eq(creatorWorkspaceInvites.workspaceId, membership.workspace.id),
        eq(creatorWorkspaceInvites.status, "pending"),
        gt(creatorWorkspaceInvites.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(creatorWorkspaceInvites.createdAt));

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as WorkspaceRole,
    status: row.status,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  }));
}

export async function createWorkspaceInvite(
  db: DbClient,
  env: AppEnv,
  input: {
    actorUserId: string;
    workspacePublicId: string;
    email: string;
    role?: "member" | "admin";
    inviterLabel?: string | null;
  },
) {
  const membership = await assertCanManageInvites(
    db,
    input.actorUserId,
    input.workspacePublicId,
  );

  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    throw new Error("A valid email address is required");
  }

  const role = input.role === "admin" ? "admin" : "member";
  await expireStaleInvites(db, membership.workspace.id);

  const [existingMember] = await db
    .select({ id: creatorWorkspaceMembers.id })
    .from(creatorWorkspaceMembers)
    .where(
      and(
        eq(creatorWorkspaceMembers.workspaceId, membership.workspace.id),
        sql`lower(coalesce(${creatorWorkspaceMembers.email}, '')) = ${email}`,
      ),
    )
    .limit(1);

  if (existingMember) {
    throw new Error("That email is already a member of this workspace");
  }

  const pending = await db
    .select()
    .from(creatorWorkspaceInvites)
    .where(
      and(
        eq(creatorWorkspaceInvites.workspaceId, membership.workspace.id),
        eq(creatorWorkspaceInvites.email, email),
        eq(creatorWorkspaceInvites.status, "pending"),
        gt(creatorWorkspaceInvites.expiresAt, new Date()),
      ),
    )
    .limit(1);

  let invite = pending[0];
  if (invite) {
    await db
      .update(creatorWorkspaceInvites)
      .set({
        role,
        invitedByUserId: input.actorUserId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      })
      .where(eq(creatorWorkspaceInvites.id, invite.id));
    const [refreshed] = await db
      .select()
      .from(creatorWorkspaceInvites)
      .where(eq(creatorWorkspaceInvites.id, invite.id))
      .limit(1);
    invite = refreshed!;
  } else {
    const token = newInviteToken();
    const [created] = await db
      .insert(creatorWorkspaceInvites)
      .values({
        workspaceId: membership.workspace.id,
        email,
        role,
        token,
        invitedByUserId: input.actorUserId,
        status: "pending",
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      })
      .returning();
    if (!created) {
      throw new Error("Failed to create invite");
    }
    invite = created;
  }

  const inviteUrl = `${appBaseUrl(env)}/invite/${invite.token}`;
  const emailResult = await notifyWorkspaceInvite(env, {
    to: email,
    workspaceName: membership.workspace.name,
    inviteUrl,
    inviterLabel: input.inviterLabel,
  });

  return {
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role as WorkspaceRole,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      inviteUrl: emailResult.skipped === "no_resend_key" ? inviteUrl : undefined,
    },
    email: emailResult,
  };
}

export async function revokeWorkspaceInvite(
  db: DbClient,
  actorUserId: string,
  workspacePublicId: string,
  inviteId: number,
) {
  const membership = await assertCanManageInvites(db, actorUserId, workspacePublicId);

  const [updated] = await db
    .update(creatorWorkspaceInvites)
    .set({ status: "revoked" })
    .where(
      and(
        eq(creatorWorkspaceInvites.id, inviteId),
        eq(creatorWorkspaceInvites.workspaceId, membership.workspace.id),
        eq(creatorWorkspaceInvites.status, "pending"),
      ),
    )
    .returning();

  if (!updated) {
    throw new Error("Pending invite not found");
  }

  return listWorkspaceInvites(db, actorUserId, workspacePublicId);
}

export async function getWorkspaceInviteByToken(db: DbClient, token: string) {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error("Invite not found");
  }

  const [row] = await db
    .select({
      invite: creatorWorkspaceInvites,
      workspace: creatorWorkspaces,
    })
    .from(creatorWorkspaceInvites)
    .innerJoin(
      creatorWorkspaces,
      eq(creatorWorkspaces.id, creatorWorkspaceInvites.workspaceId),
    )
    .where(eq(creatorWorkspaceInvites.token, trimmed))
    .limit(1);

  if (!row) {
    throw new Error("Invite not found");
  }

  if (
    row.invite.status === "pending" &&
    row.invite.expiresAt.getTime() < Date.now()
  ) {
    await db
      .update(creatorWorkspaceInvites)
      .set({ status: "expired" })
      .where(eq(creatorWorkspaceInvites.id, row.invite.id));
    row.invite.status = "expired";
  }

  return {
    email: row.invite.email,
    role: row.invite.role as WorkspaceRole,
    status: row.invite.status,
    expiresAt: row.invite.expiresAt,
    workspace: {
      publicId: row.workspace.publicId,
      name: row.workspace.name,
    },
  };
}

export async function acceptWorkspaceInvite(
  db: DbClient,
  input: {
    token: string;
    userId: string;
    email?: string | null;
  },
) {
  const trimmed = input.token.trim();
  if (!trimmed) {
    throw new Error("Invite not found");
  }

  const [row] = await db
    .select({
      invite: creatorWorkspaceInvites,
      workspace: creatorWorkspaces,
    })
    .from(creatorWorkspaceInvites)
    .innerJoin(
      creatorWorkspaces,
      eq(creatorWorkspaces.id, creatorWorkspaceInvites.workspaceId),
    )
    .where(eq(creatorWorkspaceInvites.token, trimmed))
    .limit(1);

  if (!row) {
    throw new Error("Invite not found");
  }

  if (row.invite.status === "accepted") {
    const existing = await getWorkspaceMembership(
      db,
      input.userId,
      row.workspace.publicId,
    );
    if (existing) {
      return {
        workspacePublicId: row.workspace.publicId,
        workspaceName: row.workspace.name,
        alreadyMember: true,
      };
    }
    throw new Error("This invite was already accepted by someone else");
  }

  if (row.invite.status === "revoked") {
    throw new Error("This invite was revoked");
  }

  if (row.invite.status === "expired" || row.invite.expiresAt.getTime() < Date.now()) {
    if (row.invite.status === "pending") {
      await db
        .update(creatorWorkspaceInvites)
        .set({ status: "expired" })
        .where(eq(creatorWorkspaceInvites.id, row.invite.id));
    }
    throw new Error("This invite has expired");
  }

  if (row.invite.status !== "pending") {
    throw new Error("Invite is no longer valid");
  }

  const acceptorEmail = input.email ? normalizeEmail(input.email) : null;
  if (acceptorEmail && acceptorEmail !== row.invite.email) {
    throw new Error(
      `Sign in with ${row.invite.email} to accept this invite (currently ${acceptorEmail})`,
    );
  }

  const [existingMembership] = await db
    .select({ id: creatorWorkspaceMembers.id })
    .from(creatorWorkspaceMembers)
    .where(
      and(
        eq(creatorWorkspaceMembers.workspaceId, row.workspace.id),
        eq(creatorWorkspaceMembers.userId, input.userId),
      ),
    )
    .limit(1);

  if (!existingMembership) {
    await db.insert(creatorWorkspaceMembers).values({
      workspaceId: row.workspace.id,
      userId: input.userId,
      role: row.invite.role === "admin" ? "admin" : "member",
      email: acceptorEmail ?? row.invite.email,
    });
  }

  await db
    .update(creatorWorkspaceInvites)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      acceptedUserId: input.userId,
    })
    .where(eq(creatorWorkspaceInvites.id, row.invite.id));

  return {
    workspacePublicId: row.workspace.publicId,
    workspaceName: row.workspace.name,
    alreadyMember: Boolean(existingMembership),
  };
}
