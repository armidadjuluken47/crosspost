import { listRecentRunJobs, listRunsEnriched, listBatches } from "@crosspost/pipeline";
import { BatchOpsPanel } from "@/components/batch-ops-panel";
import { JobsStrip } from "@/components/jobs-strip";
import { QueueRunsPanel } from "@/components/queue-runs-panel";
import { PageHeader } from "@/components/page-header";
import { getDb } from "@/lib/db";
import { serializeRunListItem } from "@/lib/run-serializer";

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run } = await searchParams;
  const db = getDb();
  const [jobs, runs, batches] = await Promise.all([
    listRecentRunJobs(db, 15),
    listRunsEnriched(db, 50),
    listBatches(db, 10),
  ]);

  const serializedRuns = runs.map(serializeRunListItem);
  const requestedRunId = run ? Number(run) : NaN;
  const initialSelectedRunId =
    Number.isFinite(requestedRunId) && serializedRuns.some((row) => row.id === requestedRunId)
      ? requestedRunId
      : (serializedRuns[0]?.id ?? null);

  return (
    <div>
      <PageHeader
        title="Queue & Runs"
        subtitle="Durable job queue and pipeline execution ledger"
      />
      <div className="mb-6">
        <BatchOpsPanel initialBatches={batches} />
      </div>
      <JobsStrip jobs={jobs} />
      <QueueRunsPanel initialRuns={serializedRuns} initialSelectedRunId={initialSelectedRunId} />
    </div>
  );
}
