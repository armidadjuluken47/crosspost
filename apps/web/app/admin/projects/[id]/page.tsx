import Link from "next/link";
import { notFound } from "next/navigation";
import { getCreatorProjectByPublicId } from "@crosspost/pipeline";
import { PageHeader } from "@/components/page-header";
import { AdminProjectRetryButton } from "@/components/admin-project-retry-button";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();
  const env = getServerEnv();
  const project = await getCreatorProjectByPublicId(db, id);
  if (!project) notFound();

  const assetBase = env.LOCAL_ASSET_PUBLIC_BASE_URL ?? "/api/assets";

  return (
    <div>
      <PageHeader
        title={project.title}
        subtitle={`Creator project · ${project.publicId}`}
        actions={
          project.status === "failed" ? (
            <AdminProjectRetryButton publicId={project.publicId} />
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-panel)]">
          {project.thumbnailKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${assetBase}/${project.thumbnailKey}`}
              alt=""
              className="aspect-[9/16] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[9/16] items-center justify-center text-xs text-[var(--text-faint)]">
              No thumbnail
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-5 text-sm">
          <Row label="Status" value={project.status} />
          <Row
            label="User"
            value={
              <Link
                href={`/admin/users?uid=${encodeURIComponent(project.externalUserId)}`}
                className="font-mono text-[var(--accent)]"
              >
                {project.externalUserId}
              </Link>
            }
          />
          <Row
            label="AMVE run"
            value={
              project.runId ? (
                <Link href={`/admin/runs/${project.runId}`} className="text-[var(--accent)]">
                  /admin/runs/{project.runId}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <Row label="Notify email" value={project.notifyEmail ?? "—"} />
          <Row label="Error" value={project.errorMessage ?? "—"} />
          <Row label="Caption" value={project.caption ?? "—"} />
          <Row label="Hashtags" value={project.hashtags ?? "—"} />
          <Row
            label="Assets"
            value={
              <span className="font-mono text-xs">
                video={project.outputVideoKey ? "yes" : "no"} · srt=
                {project.srtKey ? "yes" : "no"} · thumb={project.thumbnailKey ? "yes" : "no"} ·
                burned={project.burnedVideoKey ? "yes" : "no"}
              </span>
            }
          />
          <Row label="Created" value={project.createdAt.toLocaleString()} />
          <Row label="Updated" value={project.updatedAt.toLocaleString()} />

          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/admin/projects" className="text-xs font-semibold text-[var(--text-secondary)]">
              ← All projects
            </Link>
            {project.outputVideoKey ? (
              <a
                href={`${assetBase}/${project.outputVideoKey}`}
                className="text-xs font-semibold text-[var(--accent)]"
                target="_blank"
                rel="noreferrer"
              >
                Open output video
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-[var(--border)] pb-3 sm:grid-cols-[140px_1fr]">
      <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-faint)]">
        {label}
      </dt>
      <dd className="text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}
