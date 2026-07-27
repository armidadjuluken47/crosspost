import { FieldValue } from "firebase-admin/firestore";
import type { DbClient } from "@crosspost/db";
import { countCreatorProjects, getWorkspaceBillingContext } from "@crosspost/pipeline";
import { getAdminDb, isFirebaseReady } from "@/lib/firebase-admin";
import {
  FREE_VIDEO_LIMIT,
  hasVideoQuota,
  isPaidPlan,
  planToUserFields,
} from "@/lib/stripe/plans";

export { FREE_VIDEO_LIMIT };

export class QuotaExceededError extends Error {
  readonly code = "QUOTA_EXCEEDED" as const;

  constructor(message = "Free video quota used up. Upgrade to continue.") {
    super(message);
    this.name = "QuotaExceededError";
  }
}

export type CreatorQuotaProfile = {
  plan: string;
  videosRemaining: number;
  unlimited: boolean;
  source: "firestore" | "postgres" | "workspace_owner";
  billingSource: "self" | "workspace_owner";
  workspaceName?: string | null;
};

async function loadUserQuotaProfile(
  db: DbClient,
  userId: string,
): Promise<Omit<CreatorQuotaProfile, "billingSource" | "workspaceName">> {
  if (isFirebaseReady() && !userId.startsWith("dev_")) {
    try {
      const snap = await getAdminDb().collection("users").doc(userId).get();
      if (snap.exists) {
        const data = snap.data() ?? {};
        const plan = typeof data.plan === "string" ? data.plan : "free";
        const unlimited = isPaidPlan({
          plan,
          unlimited: Boolean(data.unlimited),
          videosRemaining:
            typeof data.videosRemaining === "number" ? data.videosRemaining : undefined,
        });
        return {
          plan: unlimited && plan === "free" ? "monthly" : plan,
          videosRemaining: unlimited
            ? -1
            : typeof data.videosRemaining === "number"
              ? data.videosRemaining
              : FREE_VIDEO_LIMIT,
          unlimited,
          source: "firestore",
        };
      }

      const seed = planToUserFields("free");
      await getAdminDb().collection("users").doc(userId).set(
        {
          ...seed,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return { ...seed, source: "firestore" };
    } catch {
      // fall through to postgres counting
    }
  }

  const used = await countCreatorProjects(db, userId);
  return {
    plan: "free",
    videosRemaining: Math.max(0, FREE_VIDEO_LIMIT - used),
    unlimited: false,
    source: "postgres",
  };
}

/**
 * Load effective billing profile.
 * Team workspaces inherit the owner's Pro (unlimited) for all members.
 */
export async function getCreatorQuotaProfile(
  db: DbClient,
  userId: string,
  workspaceId?: number | null,
): Promise<CreatorQuotaProfile> {
  const self = await loadUserQuotaProfile(db, userId);
  const selfProfile: CreatorQuotaProfile = {
    ...self,
    billingSource: "self",
    workspaceName: null,
  };

  if (workspaceId == null) {
    return selfProfile;
  }

  try {
    const ctx = await getWorkspaceBillingContext(db, workspaceId);
    if (!ctx || ctx.isPersonal) {
      return selfProfile;
    }

    // Already the owner with Pro — still "self"
    if (ctx.ownerUserId === userId && self.unlimited) {
      return { ...selfProfile, workspaceName: ctx.name };
    }

    const owner = await loadUserQuotaProfile(db, ctx.ownerUserId);
    if (owner.unlimited) {
      return {
        plan: owner.plan,
        videosRemaining: -1,
        unlimited: true,
        source: "workspace_owner",
        billingSource: "workspace_owner",
        workspaceName: ctx.name,
      };
    }
  } catch {
    // fall back to self
  }

  return selfProfile;
}

export async function assertCreatorHasQuota(
  db: DbClient,
  userId: string,
  count = 1,
  workspaceId?: number | null,
) {
  const n = Math.max(1, Math.floor(count));
  const profile = await getCreatorQuotaProfile(db, userId, workspaceId);
  if (profile.unlimited) return profile;

  if (!hasVideoQuota(profile) || profile.videosRemaining < n) {
    throw new QuotaExceededError(
      n > 1
        ? `Need ${n} videos remaining for this batch. Upgrade or reduce the URL list.`
        : "Free video quota used up. Upgrade to continue.",
    );
  }
  return profile;
}

/** Decrement remaining videos after successful project create(s). No-op for unlimited / pooled Pro. */
export async function consumeCreatorQuota(
  db: DbClient,
  userId: string,
  count = 1,
  workspaceId?: number | null,
) {
  const n = Math.max(1, Math.floor(count));
  const profile = await getCreatorQuotaProfile(db, userId, workspaceId);
  if (profile.unlimited || profile.billingSource === "workspace_owner") {
    return profile;
  }

  if (profile.source === "firestore" && isFirebaseReady() && !userId.startsWith("dev_")) {
    const ref = getAdminDb().collection("users").doc(userId);
    await ref.set(
      {
        videosRemaining: FieldValue.increment(-n),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    const next = Math.max(0, profile.videosRemaining - n);
    return { ...profile, videosRemaining: next };
  }

  const used = await countCreatorProjects(db, userId);
  return {
    ...profile,
    videosRemaining: Math.max(0, FREE_VIDEO_LIMIT - used),
  };
}
