import Link from "next/link";
import { getRunDetail } from "@crosspost/pipeline";
import { RunDetailPanel } from "@/components/run-detail-panel";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getDb } from "@/lib/db";
import { serializeRunDetail } from "@/lib/run-serializer";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const runId = Number(id);
  const db = getDb();
  const detail = await getRunDetail(db, runId);

  if (!detail) {
    return (
      <div>
        <p>Run not found.</p>
        <Link href="/admin/queue">Back to queue</Link>
      </div>
    );
  }

  const serialized = serializeRunDetail(detail);

  return (
    <div>
      <PageHeader
        title={`Run #${detail.run.id}`}
        subtitle={`${detail.model?.displayName ?? "Unknown"} × ${detail.sourceReel?.shortcode ?? "—"}`}
        actions={<StatusBadge status={detail.run.status} kind="run" />}
      />
      <div className="panel p-4">
        <RunDetailPanel detail={serialized} extended showQueueLink={false} />
      </div>
    </div>
  );
}
