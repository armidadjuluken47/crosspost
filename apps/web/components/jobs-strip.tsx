"use client";

import Link from "next/link";
import { Inbox } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";

type RunJob = {
  id: number;
  status: string;
  source: string;
  runId: number | null;
  error: string | null;
  lockedUntil: string | Date | null;
};

const ACTIVE_JOB_STATUSES = new Set(["queued", "running", "retry_scheduled"]);

function serializeJobs(jobs: RunJob[]): RunJob[] {
  return jobs.map((job) => ({
    ...job,
    lockedUntil: job.lockedUntil ? new Date(job.lockedUntil).toISOString() : null,
  }));
}

export function JobsStrip({ jobs: initialJobs }: { jobs: RunJob[] }) {
  const [jobs, setJobs] = useState(() => serializeJobs(initialJobs));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setJobs(serializeJobs(initialJobs));
  }, [initialJobs]);

  const hasActiveJobs = useMemo(
    () => jobs.some((job) => ACTIVE_JOB_STATUSES.has(job.status)),
    [jobs],
  );

  const refreshJobs = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    try {
      const response = await fetch("/api/run-jobs");
      const data = (await response.json()) as { jobs?: RunJob[] };
      if (data.jobs) setJobs(serializeJobs(data.jobs));
    } catch {
      // keep last known state
    }
  }, []);

  useEffect(() => {
    void refreshJobs();
    const interval = window.setInterval(
      () => {
        void refreshJobs();
      },
      hasActiveJobs ? 3_000 : 12_000,
    );
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshJobs();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshJobs, hasActiveJobs]);

  async function retryJob(jobId: number) {
    setLoading(true);
    const response = await fetch("/api/run-jobs/retry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: jobId, requestedBy: "dashboard" }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? "Retry failed");
      return;
    }
    setMessage(`Job #${jobId} requeued`);
    void refreshJobs();
  }

  async function processNext() {
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/run-jobs/process-next", { method: "POST" });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? "Failed");
      return;
    }
    setMessage(data.processed ? `Processed job #${data.job.id}` : "No queued jobs");
    void refreshJobs();
  }

  return (
    <div className="panel mb-6 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase">Postgres run jobs</h3>
        <button type="button" className="btn-primary" disabled={loading} onClick={processNext}>
          {loading ? "Processing..." : "Process next queued job"}
        </button>
      </div>
      {message ? <p className="mb-3 text-xs text-[var(--text-muted)]">{message}</p> : null}
      {jobs.length === 0 ? (
        <div className="empty-state">
          <Inbox className="h-8 w-8 opacity-40" />
          <span>No jobs in queue</span>
        </div>
      ) : (
        <ul className="space-y-2 text-sm">
          {jobs.map((job) => (
            <li key={job.id} className="queue-row flex-col items-stretch sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="font-bold">#{job.id}</span>
                <StatusBadge status={job.status} kind="job" pulse={job.status === "running"} />
                <span className="text-[var(--text-muted)]">{job.source}</span>
                {job.runId ? (
                  <Link href={`/admin/queue?run=${job.runId}`} className="no-underline hover:underline">
                    run #{job.runId}
                  </Link>
                ) : null}
              </div>
              {job.error ? (
                <div className="mt-1 w-full text-xs text-[var(--error-text)]">{job.error}</div>
              ) : null}
              {job.status === "failed" ||
              (job.status === "running" &&
                job.lockedUntil &&
                new Date(job.lockedUntil).getTime() < Date.now()) ? (
                <button
                  type="button"
                  className="btn-secondary mt-2 sm:mt-0"
                  disabled={loading}
                  onClick={() => retryJob(job.id)}
                >
                  Retry job
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
