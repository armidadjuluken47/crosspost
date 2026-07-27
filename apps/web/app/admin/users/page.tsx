import { countCreatorProjectsByUserIds, listAllCreatorProjects } from "@crosspost/pipeline";
import { AdminCreatorUsersPanel } from "@/components/admin-creator-users";
import { PageHeader } from "@/components/page-header";
import { getDb } from "@/lib/db";
import { getAdminDb, isFirebaseReady } from "@/lib/firebase-admin";
import { FREE_VIDEO_LIMIT } from "@/lib/creator-quota";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();

  const users: Array<{
    uid: string;
    email: string | null;
    name: string | null;
    plan: string;
    videosRemaining: number | null;
    unlimited: boolean;
    createdAt: string | null;
  }> = [];

  if (isFirebaseReady()) {
    try {
      const snap = await getAdminDb().collection("users").limit(300).get();
      for (const doc of snap.docs) {
        const data = doc.data();
        const unlimited = Boolean(data.unlimited) || data.videosRemaining === -1;
        const createdAt =
          data.createdAt?.toDate?.() instanceof Date
            ? data.createdAt.toDate().toISOString()
            : null;
        users.push({
          uid: doc.id,
          email: typeof data.email === "string" ? data.email : null,
          name: typeof data.name === "string" ? data.name : typeof data.displayName === "string" ? data.displayName : null,
          plan: typeof data.plan === "string" ? data.plan : "free",
          videosRemaining: unlimited
            ? null
            : typeof data.videosRemaining === "number"
              ? data.videosRemaining
              : FREE_VIDEO_LIMIT,
          unlimited,
          createdAt,
        });
      }
    } catch (error) {
      console.warn("[admin/users] Firestore list failed:", error);
    }
  }

  // Include Postgres-only creators (dev_* or missing Firestore docs).
  const projects = await listAllCreatorProjects(db, { limit: 500 });
  const known = new Set(users.map((user) => user.uid));
  for (const project of projects) {
    if (!known.has(project.externalUserId)) {
      known.add(project.externalUserId);
      users.push({
        uid: project.externalUserId,
        email: project.notifyEmail,
        name: null,
        plan: "free",
        videosRemaining: FREE_VIDEO_LIMIT,
        unlimited: false,
        createdAt: project.createdAt.toISOString(),
      });
    }
  }

  const counts = await countCreatorProjectsByUserIds(
    db,
    users.map((user) => user.uid),
  );

  return (
    <div>
      <PageHeader
        title="Creator Users"
        subtitle="Firestore billing profiles + Postgres project counts"
      />
      <AdminCreatorUsersPanel
        highlightUid={params.uid ?? null}
        initialUsers={users
          .map((user) => ({
            ...user,
            projectCount: counts.get(user.uid) ?? 0,
          }))
          .sort((a, b) => b.projectCount - a.projectCount)}
      />
    </div>
  );
}
