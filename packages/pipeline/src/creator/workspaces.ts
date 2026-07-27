import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import {
  creatorBatches,
  creatorProjects,
  creatorWorkspaceInvites,
  creatorWorkspaceMembers,
  creatorWorkspaces,
} from "@crosspost/db";

export type WorkspaceRole = "owner" | "admin" | "member";

export type WorkspaceSummary = {
  publicId: string;
  name: string;
  isPersonal: boolean;
  role: WorkspaceRole;
  memberCount: number;
};

function newPublicId() {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

export async function getWorkspaceMembership(
  db: DbClient,
  userId: string,
  workspacePublicId: string,
) {
  const [row] = await db
    .select({
      workspace: creatorWorkspaces,
      role: creatorWorkspaceMembers.role,
    })
    .from(creatorWorkspaces)
    .innerJoin(
      creatorWorkspaceMembers,
      eq(creatorWorkspaceMembers.workspaceId, creatorWorkspaces.id),
    )
    .where(
      and(
        eq(creatorWorkspaces.publicId, workspacePublicId),
        eq(creatorWorkspaceMembers.userId, userId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function ensurePersonalWorkspace(db: DbClient, userId: string) {
  const [existing] = await db
    .select()
    .from(creatorWorkspaces)
    .where(and(eq(creatorWorkspaces.ownerUserId, userId), eq(creatorWorkspaces.isPersonal, true)))
    .limit(1);

  if (existing) {
    const member = await db
      .select()
      .from(creatorWorkspaceMembers)
      .where(
        and(
          eq(creatorWorkspaceMembers.workspaceId, existing.id),
          eq(creatorWorkspaceMembers.userId, userId),
        ),
      )
      .limit(1);
    if (!member[0]) {
      await db.insert(creatorWorkspaceMembers).values({
        workspaceId: existing.id,
        userId,
        role: "owner",
      });
    }
    return existing;
  }

  const publicId = newPublicId();
  const [workspace] = await db
    .insert(creatorWorkspaces)
    .values({
      publicId,
      name: "Personal",
      ownerUserId: userId,
      isPersonal: true,
    })
    .returning();

  if (!workspace) {
    throw new Error("Failed to create personal workspace");
  }

  await db.insert(creatorWorkspaceMembers).values({
    workspaceId: workspace.id,
    userId,
    role: "owner",
  });

  return workspace;
}

export async function listUserWorkspaces(db: DbClient, userId: string): Promise<WorkspaceSummary[]> {
  await ensurePersonalWorkspace(db, userId);

  const rows = await db
    .select({
      publicId: creatorWorkspaces.publicId,
      name: creatorWorkspaces.name,
      isPersonal: creatorWorkspaces.isPersonal,
      role: creatorWorkspaceMembers.role,
      memberCount: sql<number>`(
        select count(*)::int from ${creatorWorkspaceMembers}
        where ${creatorWorkspaceMembers.workspaceId} = ${creatorWorkspaces.id}
      )`,
    })
    .from(creatorWorkspaces)
    .innerJoin(
      creatorWorkspaceMembers,
      eq(creatorWorkspaceMembers.workspaceId, creatorWorkspaces.id),
    )
    .where(eq(creatorWorkspaceMembers.userId, userId))
    .orderBy(desc(creatorWorkspaces.isPersonal), desc(creatorWorkspaces.updatedAt));

  return rows.map((row) => ({
    publicId: row.publicId,
    name: row.name,
    isPersonal: row.isPersonal,
    role: row.role as WorkspaceRole,
    memberCount: Number(row.memberCount),
  }));
}

export async function resolveActiveWorkspace(
  db: DbClient,
  userId: string,
  workspacePublicId?: string | null,
) {
  const personal = await ensurePersonalWorkspace(db, userId);
  if (!workspacePublicId) {
    return personal;
  }

  const membership = await getWorkspaceMembership(db, userId, workspacePublicId);
  return membership?.workspace ?? personal;
}

export async function createTeamWorkspace(db: DbClient, userId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Workspace name is required");
  }

  const publicId = newPublicId();
  const [workspace] = await db
    .insert(creatorWorkspaces)
    .values({
      publicId,
      name: trimmed,
      ownerUserId: userId,
      isPersonal: false,
    })
    .returning();

  if (!workspace) {
    throw new Error("Failed to create workspace");
  }

  await db.insert(creatorWorkspaceMembers).values({
    workspaceId: workspace.id,
    userId,
    role: "owner",
  });

  return workspace;
}

/**
 * Delete a team workspace (an "agency"). Owner-only. Personal workspaces can
 * never be deleted. Projects and batches are moved to the owner's personal
 * workspace so nothing is destroyed; members and pending invites are removed.
 */
export async function deleteTeamWorkspace(
  db: DbClient,
  actorUserId: string,
  workspacePublicId: string,
) {
  const membership = await getWorkspaceMembership(db, actorUserId, workspacePublicId);
  if (!membership) {
    throw new Error("Workspace not found");
  }
  if (membership.workspace.isPersonal) {
    throw new Error("Your personal workspace can't be deleted");
  }
  if (membership.role !== "owner" && membership.workspace.ownerUserId !== actorUserId) {
    throw new Error("Only the workspace owner can delete it");
  }

  const workspaceId = membership.workspace.id;
  const personal = await ensurePersonalWorkspace(db, actorUserId);

  // Move content to the owner's personal workspace so it survives the delete.
  await db
    .update(creatorProjects)
    .set({ workspaceId: personal.id, updatedAt: new Date() })
    .where(eq(creatorProjects.workspaceId, workspaceId));

  await db
    .update(creatorBatches)
    .set({ workspaceId: personal.id })
    .where(eq(creatorBatches.workspaceId, workspaceId));

  await db
    .delete(creatorWorkspaceInvites)
    .where(eq(creatorWorkspaceInvites.workspaceId, workspaceId));

  await db
    .delete(creatorWorkspaceMembers)
    .where(eq(creatorWorkspaceMembers.workspaceId, workspaceId));

  await db.delete(creatorWorkspaces).where(eq(creatorWorkspaces.id, workspaceId));

  return { ok: true, movedToPublicId: personal.publicId };
}

export async function addWorkspaceMember(
  db: DbClient,
  actorUserId: string,
  workspacePublicId: string,
  memberUserId: string,
  email?: string | null,
) {
  const membership = await getWorkspaceMembership(db, actorUserId, workspacePublicId);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error("Only workspace owners or admins can invite members");
  }

  const uid = memberUserId.trim();
  if (!uid) {
    throw new Error("Member user id is required");
  }

  await db
    .insert(creatorWorkspaceMembers)
    .values({
      workspaceId: membership.workspace.id,
      userId: uid,
      role: "member",
      email: email?.trim() || null,
    })
    .onConflictDoNothing();

  return listWorkspaceMembers(db, workspacePublicId, actorUserId);
}

export async function listWorkspaceMembers(
  db: DbClient,
  workspacePublicId: string,
  actorUserId: string,
) {
  const membership = await getWorkspaceMembership(db, actorUserId, workspacePublicId);
  if (!membership) {
    throw new Error("Workspace not found");
  }

  return db
    .select({
      userId: creatorWorkspaceMembers.userId,
      role: creatorWorkspaceMembers.role,
      email: creatorWorkspaceMembers.email,
      joinedAt: creatorWorkspaceMembers.joinedAt,
    })
    .from(creatorWorkspaceMembers)
    .where(eq(creatorWorkspaceMembers.workspaceId, membership.workspace.id))
    .orderBy(desc(creatorWorkspaceMembers.joinedAt));
}

export async function userCanAccessProject(
  db: DbClient,
  userId: string,
  project: typeof creatorProjects.$inferSelect,
) {
  if (project.externalUserId === userId) {
    return true;
  }
  if (!project.workspaceId) {
    return false;
  }

  const [member] = await db
    .select({ id: creatorWorkspaceMembers.id })
    .from(creatorWorkspaceMembers)
    .where(
      and(
        eq(creatorWorkspaceMembers.workspaceId, project.workspaceId),
        eq(creatorWorkspaceMembers.userId, userId),
      ),
    )
    .limit(1);

  return Boolean(member);
}

export async function listWorkspaceProjects(
  db: DbClient,
  userId: string,
  workspaceId: number,
) {
  const [member] = await db
    .select({ id: creatorWorkspaceMembers.id })
    .from(creatorWorkspaceMembers)
    .where(
      and(
        eq(creatorWorkspaceMembers.workspaceId, workspaceId),
        eq(creatorWorkspaceMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!member) {
    return [];
  }

  return db
    .select()
    .from(creatorProjects)
    .where(eq(creatorProjects.workspaceId, workspaceId))
    .orderBy(desc(creatorProjects.createdAt));
}

export async function backfillLegacyProjectsToPersonalWorkspace(db: DbClient, userId: string) {
  const personal = await ensurePersonalWorkspace(db, userId);
  await db
    .update(creatorProjects)
    .set({ workspaceId: personal.id, updatedAt: new Date() })
    .where(
      and(eq(creatorProjects.externalUserId, userId), sql`${creatorProjects.workspaceId} is null`),
    );
}

/** Billing context for pooled quota — team workspaces can inherit the owner's Pro. */
export async function getWorkspaceBillingContext(db: DbClient, workspaceId: number) {
  const [row] = await db
    .select({
      ownerUserId: creatorWorkspaces.ownerUserId,
      isPersonal: creatorWorkspaces.isPersonal,
      name: creatorWorkspaces.name,
      publicId: creatorWorkspaces.publicId,
    })
    .from(creatorWorkspaces)
    .where(eq(creatorWorkspaces.id, workspaceId))
    .limit(1);

  return row ?? null;
}
