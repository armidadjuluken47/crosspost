import { listAllCreatorProjects } from "@crosspost/pipeline";
import { AdminCreatorProjectsPanel } from "@/components/admin-creator-projects";
import { PageHeader } from "@/components/page-header";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; status?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();
  const env = getServerEnv();
  const assetBase = env.LOCAL_ASSET_PUBLIC_BASE_URL ?? "/api/assets";

  const status =
    params.status === "processing" ||
    params.status === "ready" ||
    params.status === "failed" ||
    params.status === "draft"
      ? params.status
      : undefined;

  const projects = await listAllCreatorProjects(db, {
    userId: params.user,
    status,
    limit: 200,
  });

  return (
    <div>
      <PageHeader
        title="Creator Projects"
        subtitle="CrossPost uploads — product view with run deep-links"
      />
      <AdminCreatorProjectsPanel
        initialProjects={projects.map((project) => ({
          publicId: project.publicId,
          title: project.title,
          status: project.status,
          externalUserId: project.externalUserId,
          runId: project.runId,
          errorMessage: project.errorMessage,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
          thumbnailUrl: project.thumbnailKey ? `${assetBase}/${project.thumbnailKey}` : null,
        }))}
      />
    </div>
  );
}
