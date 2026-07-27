import Link from "next/link";
import { buildCreatorProductMetrics, listCreatorUsageByUser } from "@crosspost/pipeline";
import { PageHeader } from "@/components/page-header";
import { getDb } from "@/lib/db";

export default async function AdminUsagePage() {
  const db = getDb();
  const [metrics, usage] = await Promise.all([
    buildCreatorProductMetrics(db),
    listCreatorUsageByUser(db, 50),
  ]);

  const avgCostPerReady =
    metrics.readyProjects > 0
      ? metrics.recordedCostCents / metrics.readyProjects
      : 0;

  return (
    <div>
      <PageHeader
        title="Creator usage"
        subtitle="CrossPost product metrics — projects per user and recorded pipeline cost"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Total projects
          </div>
          <div className="mt-2 text-2xl font-bold">{metrics.totalProjects}</div>
        </div>
        <div className="panel p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Ready / failed
          </div>
          <div className="mt-2 text-2xl font-bold">
            {metrics.readyProjects} / {metrics.failedProjects}
          </div>
        </div>
        <div className="panel p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Recorded cost
          </div>
          <div className="mt-2 text-2xl font-bold">
            ${(metrics.recordedCostCents / 100).toFixed(2)}
          </div>
        </div>
        <div className="panel p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Avg cost / ready
          </div>
          <div className="mt-2 text-2xl font-bold">${(avgCostPerReady / 100).toFixed(2)}</div>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--border)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Projects</th>
              <th className="px-4 py-3">Ready</th>
              <th className="px-4 py-3">Failed</th>
              <th className="px-4 py-3">Last project</th>
            </tr>
          </thead>
          <tbody>
            {usage.map((row) => (
              <tr key={row.externalUserId} className="border-b border-[var(--border)]/60">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users?uid=${encodeURIComponent(row.externalUserId)}`}
                    className="font-mono text-xs hover:underline"
                  >
                    {row.externalUserId.slice(0, 18)}
                    {row.externalUserId.length > 18 ? "…" : ""}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.projectCount}</td>
                <td className="px-4 py-3">{row.readyCount}</td>
                <td className="px-4 py-3">{row.failedCount}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                  {row.lastProjectAt ? new Date(row.lastProjectAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
