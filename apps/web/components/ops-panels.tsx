"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";

type RunJobRef = { id: number; runId: number | null };
type ExceptionRow = {
  id: number;
  runId: number | null;
  batchId: number | null;
  stage: string;
  reason: string;
  status: string;
  createdAt: string | Date;
};
type AuditRow = {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  actorUserId: string | null;
  createdAt: string | Date;
};

export function ExceptionPanel({ exceptions: initialExceptions }: { exceptions: ExceptionRow[] }) {
  const router = useRouter();
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | "dismissed" | "all">("open");
  const [stageFilter, setStageFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (stageFilter.trim()) params.set("stage", stageFilter.trim());
    if (batchFilter.trim()) params.set("batchId", batchFilter.trim());
    const query = params.toString() ? `?${params.toString()}` : "";
    fetch(`/api/exceptions${query}`)
      .then((response) => response.json())
      .then((data: { exceptions?: ExceptionRow[] }) => {
        if (data.exceptions) setExceptions(data.exceptions);
      })
      .catch(() => undefined);
  }, [statusFilter, stageFilter, batchFilter]);

  async function updateException(id: number, status: "resolved" | "dismissed") {
    const response = await fetch("/api/exceptions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id,
        status,
        resolvedByUserId: "dashboard",
        resolutionAction: `${status} from Exception Center`,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Update failed");
      return;
    }
    setMessage(`Exception #${id} ${status}`);
    router.refresh();
  }

  async function retryRun(runId: number) {
    const jobsResponse = await fetch("/api/run-jobs");
    const jobsData = await jobsResponse.json();
    const job = (jobsData.jobs as RunJobRef[] | undefined)?.find((row) => row.runId === runId);
    if (!job) {
      setMessage(`No job found for run #${runId}`);
      return;
    }
    const response = await fetch("/api/run-jobs/retry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: job.id, requestedBy: "dashboard" }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Retry failed");
      return;
    }
    setMessage(`Run #${runId} requeued`);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["open", "resolved", "dismissed", "all"] as const).map((status) => (
          <button
            key={status}
            type="button"
            className={statusFilter === status ? "filter-chip filter-chip-active" : "filter-chip"}
            onClick={() => setStatusFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="input w-40"
          placeholder="Stage filter"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        />
        <input
          className="input w-32"
          placeholder="Batch ID"
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
        />
      </div>
      {exceptions.length === 0 ? (
        <div className="empty-state">
          <span>No exceptions match these filters</span>
        </div>
      ) : (
        <ul className="space-y-3">
          {exceptions.map((exc) => (
            <li key={exc.id} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold">#{exc.id}</span>
                    <StatusBadge status={exc.stage} kind="stage" />
                    <StatusBadge status={exc.status} kind="exception" />
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">{exc.reason}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {exc.runId ? (
                      <Link href={`/admin/queue?run=${exc.runId}`} className="no-underline hover:underline">
                        Run #{exc.runId}
                      </Link>
                    ) : null}
                    {exc.batchId ? (
                      <span className="text-[var(--text-muted)]">Batch #{exc.batchId}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {exc.runId ? (
                    <button type="button" className="btn-secondary" onClick={() => retryRun(exc.runId!)}>
                      Retry run
                    </button>
                  ) : null}
                  {exc.status === "open" ? (
                    <>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => updateException(exc.id, "resolved")}
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => updateException(exc.id, "dismissed")}
                      >
                        Dismiss
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {message ? <p className="mt-3 text-xs text-[var(--text-muted)]">{message}</p> : null}
    </div>
  );
}

export function AuditPanel({ events }: { events: AuditRow[] }) {
  if (events.length === 0) {
    return (
      <div className="empty-state panel">
        <History className="h-8 w-8 opacity-40" />
        <span>No audit events yet</span>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div
        className="hidden grid-cols-12 gap-2 border-b px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] md:grid"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="col-span-3">Timestamp</div>
        <div className="col-span-3">Action</div>
        <div className="col-span-4">Entity</div>
        <div className="col-span-2 text-right">Actor</div>
      </div>
      <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
        {events.map((event) => (
          <li
            key={event.id}
            className="grid grid-cols-1 gap-1 px-4 py-3 text-xs transition-colors hover:bg-[var(--bg-hover)] md:grid-cols-12 md:gap-2"
          >
            <div className="md:col-span-3 font-mono text-[var(--text-muted)]">
              {new Date(event.createdAt).toLocaleString()}
            </div>
            <div className="md:col-span-3 font-semibold">{event.action}</div>
            <div className="md:col-span-4">
              {event.entityType}
              {event.entityId ? ` #${event.entityId}` : ""}
            </div>
            <div className="md:col-span-2 md:text-right">{event.actorUserId ?? "system"}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
