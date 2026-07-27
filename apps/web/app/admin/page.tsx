import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Clock,
  DollarSign,
  FolderKanban,
  Layers,
  Percent,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  buildCreatorProductMetrics,
  buildDashboardSummary,
  buildHealthReport,
  listRecentAuditEvents,
  listRecentRuns,
} from "@crosspost/pipeline";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

export default async function OverviewPage() {
  const env = getServerEnv();
  const db = getDb();
  const [health, summary, creatorMetrics, runs, auditEvents] = await Promise.all([
    buildHealthReport(env),
    buildDashboardSummary(db),
    buildCreatorProductMetrics(db),
    listRecentRuns(db, 8),
    listRecentAuditEvents(db, 5),
  ]);

  return (
    <div>
      <PageHeader
        title="System Controls & Analytics"
        subtitle="Real-time telemetry & supervisor dispatchers for CrossPost motion nodes"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Delivered runs"
          value={`${summary.deliveredRuns}/${summary.totalRuns}`}
          hint={`${summary.successRate}% success rate`}
          icon={Activity}
          variant="success"
        />
        <KpiCard
          label="Open exceptions"
          value={String(summary.openExceptions)}
          hint={summary.openExceptions > 0 ? "Needs attention" : "All clear"}
          icon={AlertTriangle}
          variant={summary.openExceptions > 0 ? "alert" : "default"}
        />
        <KpiCard
          label="Queued jobs"
          value={String(summary.queueCounts.queued)}
          hint={`${summary.queueCounts.running} running now`}
          icon={Layers}
        />
        <KpiCard
          label="Recorded cost"
          value={`$${(summary.totalCostCents / 100).toFixed(2)}`}
          hint="From completed stages"
          icon={Wallet}
        />
      </div>

      <h2 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        CrossPost product
      </h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Creator projects"
          value={String(creatorMetrics.totalProjects)}
          hint={`${creatorMetrics.readyProjects} ready · ${creatorMetrics.processingProjects} processing`}
          icon={FolderKanban}
        />
        <KpiCard
          label="Projects today"
          value={String(creatorMetrics.projectsToday)}
          hint={`${creatorMetrics.failedProjects} failed total`}
          icon={Activity}
          variant={creatorMetrics.failedProjects > 0 ? "alert" : "default"}
        />
        <KpiCard
          label="Active creators (7d)"
          value={String(creatorMetrics.activeUsers7d)}
          hint={`${creatorMetrics.totalBatches} batches`}
          icon={Users}
        />
        <KpiCard
          label="Creator pipeline cost"
          value={`$${(creatorMetrics.recordedCostCents / 100).toFixed(2)}`}
          hint="Joined from linked runs"
          icon={Wallet}
        />
      </div>

      <h2 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Pipeline metrics
      </h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Avg stage latency"
          value={`${summary.kpis.avgProviderLatencyMs}ms`}
          icon={Clock}
        />
        <KpiCard
          label="Cost / delivered"
          value={`$${(summary.kpis.costPerDeliveredVideoCents / 100).toFixed(2)}`}
          icon={DollarSign}
        />
        <KpiCard
          label="Image fallback rate"
          value={`${summary.kpis.imageProviderFallbackRate}%`}
          icon={TrendingUp}
        />
        <KpiCard
          label="QC pass rate"
          value={`${summary.kpis.qcPassRate}%`}
          icon={Percent}
        />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="panel p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Batch estimated cost
          </div>
          <div className="mt-2 text-xl font-bold">${(summary.kpis.batchEstimatedCostCents / 100).toFixed(2)}</div>
        </div>
        <div className="panel p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Batch actual cost
          </div>
          <div className="mt-2 text-xl font-bold">${(summary.kpis.batchActualCostCents / 100).toFixed(2)}</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            {summary.batchStats.activeBatches} active · {summary.batchStats.completedBatches} completed
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="mb-3 text-sm font-bold uppercase">Provider readiness</h2>
          <ul className="space-y-2 text-sm">
            {health.providers.map((provider) => (
              <li key={provider.id} className="flex items-center justify-between gap-2">
                <code className="text-xs">{provider.id}</code>
                <span
                  className={`badge ${provider.status === "disabled" ? "badge-muted" : provider.status === "ok" || provider.status === "fixture" ? "badge-ok" : "badge-warn"}`}
                >
                  {provider.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-4">
          <h2 className="mb-3 text-sm font-bold uppercase">Delivery & alerts</h2>
          <ul className="space-y-2 text-sm">
            {health.components.delivery ? (
              <li className="flex items-center justify-between gap-2">
                <span>Google Drive</span>
                <span
                  className={`badge ${health.components.delivery.status === "ok" ? "badge-ok" : "badge-warn"}`}
                >
                  {health.components.delivery.status}
                </span>
              </li>
            ) : null}
            {health.components.telegram ? (
              <li className="flex items-center justify-between gap-2">
                <span>Telegram</span>
                <span
                  className={`badge ${health.components.telegram.status === "ok" ? "badge-ok" : "badge-warn"}`}
                >
                  {health.components.telegram.status}
                </span>
              </li>
            ) : null}
          </ul>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            {health.components.delivery?.message ?? "Delivery health unavailable"}
            {health.components.telegram ? ` · ${health.components.telegram.message}` : ""}
          </p>
          {summary.lastSuccessfulDelivery?.drivePath ? (
            <p
              className="mt-3 rounded-lg border p-2.5 font-mono text-[10px] leading-relaxed text-[var(--text-secondary)]"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="block font-sans text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Last successful delivery
              </span>
              {summary.lastSuccessfulDelivery.drivePath}
            </p>
          ) : (
            <p className="mt-3 text-xs text-[var(--text-muted)]">No Drive deliveries recorded yet</p>
          )}
        </div>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="mb-3 text-sm font-bold uppercase">Recent runs</h2>
          <ul className="space-y-2 text-sm">
            {runs.map((run) => (
              <li key={run.id} className="queue-row">
                <Link href={`/admin/queue?run=${run.id}`} className="font-semibold no-underline hover:underline">
                  Run #{run.id}
                </Link>
                <StatusBadge status={run.status} kind="run" />
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-4">
          <h2 className="mb-3 text-sm font-bold uppercase">Latest audit</h2>
          <ul className="space-y-2 text-xs font-mono text-[var(--text-secondary)]">
            {auditEvents.map((event) => (
              <li key={event.id}>
                {event.action} · {event.entityType}
                {event.entityId ? ` #${event.entityId}` : ""}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
