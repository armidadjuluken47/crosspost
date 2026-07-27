"use client";

import Link from "next/link";
import { FileText, History, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RunDetailPanel } from "@/components/run-detail-panel";
import { StatusBadge } from "@/components/status-badge";
import type { SerializedRunDetail, SerializedRunListItem } from "@/lib/run-serializer";

type RunFilter = "all" | "active" | "delivered" | "failed";

const TERMINAL_RUN_STATUSES = new Set(["delivered", "exception", "cancelled"]);
const ACTIVE_POLL_MS = 3_000;
const IDLE_POLL_MS = 12_000;

function isActiveRunStatus(status: string): boolean {
  return !TERMINAL_RUN_STATUSES.has(status);
}

function matchesFilter(status: string, filter: RunFilter): boolean {
  if (filter === "all") return true;
  if (filter === "delivered") return status === "delivered";
  if (filter === "failed") return status === "exception" || status === "cancelled";
  return isActiveRunStatus(status);
}

export function QueueRunsPanel({
  initialRuns,
  initialSelectedRunId,
}: {
  initialRuns: SerializedRunListItem[];
  initialSelectedRunId: number | null;
}) {
  const router = useRouter();
  const [runs, setRuns] = useState(initialRuns);
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedRunId);
  const [detail, setDetail] = useState<SerializedRunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter] = useState<RunFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [live, setLive] = useState(true);
  const selectedIdRef = useRef(selectedId);
  const hasLoadedDetailRef = useRef(false);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    setRuns(initialRuns);
  }, [initialRuns]);

  const hasActiveRuns = useMemo(() => runs.some((run) => isActiveRunStatus(run.status)), [runs]);

  const loadDetail = useCallback(async (runId: number, opts?: { silent?: boolean }) => {
    if (!opts?.silent || !hasLoadedDetailRef.current) {
      setDetailLoading(true);
    }
    try {
      const response = await fetch(`/api/runs/${runId}`);
      const data = (await response.json()) as SerializedRunDetail & { error?: string };
      if (selectedIdRef.current !== runId) return;
      if (!response.ok || data.error) {
        setDetail(null);
        return;
      }
      setDetail(data);
      hasLoadedDetailRef.current = true;
    } catch {
      if (selectedIdRef.current === runId) setDetail(null);
    } finally {
      if (selectedIdRef.current === runId) setDetailLoading(false);
    }
  }, []);

  const refreshRuns = useCallback(async () => {
    if (document.visibilityState === "hidden") {
      setLive(false);
      return;
    }
    setLive(true);
    try {
      const response = await fetch("/api/runs?limit=50");
      const data = (await response.json()) as { runs?: SerializedRunListItem[] };
      if (data.runs) {
        setRuns(data.runs);
        setLastUpdatedAt(new Date());
        const currentId = selectedIdRef.current;
        if (currentId) {
          const selected = data.runs.find((run) => run.id === currentId);
          if (selected && isActiveRunStatus(selected.status)) {
            void loadDetail(currentId, { silent: true });
          }
        }
      }
    } catch {
      // keep last known state
    }
  }, [loadDetail]);

  useEffect(() => {
    void refreshRuns();
    const intervalMs = hasActiveRuns ? ACTIVE_POLL_MS : IDLE_POLL_MS;
    const interval = window.setInterval(() => {
      void refreshRuns();
    }, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshRuns();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshRuns, hasActiveRuns]);

  useEffect(() => {
    hasLoadedDetailRef.current = false;
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (initialSelectedRunId && initialSelectedRunId !== selectedId) {
      setSelectedId(initialSelectedRunId);
    }
  }, [initialSelectedRunId, selectedId]);

  const filteredRuns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return runs.filter((run) => {
      if (!matchesFilter(run.status, filter)) return false;
      if (!query) return true;
      return (
        String(run.id).includes(query) ||
        (run.modelDisplayName?.toLowerCase().includes(query) ?? false) ||
        (run.modelSlug?.toLowerCase().includes(query) ?? false) ||
        (run.reelShortcode?.toLowerCase().includes(query) ?? false) ||
        (run.batchName?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [runs, filter, searchQuery]);

  function selectRun(runId: number) {
    setSelectedId(runId);
    router.replace(`/admin/queue?run=${runId}`, { scroll: false });
  }

  return (
    <div className="queue-master-detail flex flex-col gap-6 lg:flex-row lg:items-stretch">
      <div className="flex min-h-0 w-full flex-col lg:w-3/5">
        <div className="mb-4 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-medium uppercase tracking-wide">Jobs queue & execution ledger</h2>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wide text-[var(--text-muted)]">
              <span
                className={`inline-flex h-1.5 w-1.5 rounded-full ${live ? "bg-[var(--success-text)]" : "bg-[var(--text-muted)]"}`}
                aria-hidden
              />
              {live ? (hasActiveRuns ? "Live · 3s" : "Live · 12s") : "Paused"}
              {lastUpdatedAt ? (
                <span className="normal-case tracking-normal">
                  · {lastUpdatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              ) : null}
            </div>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Auto-refreshing status across model × reel combinations
          </p>
        </div>

        <div className="panel mb-4 shrink-0 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search by model, shortcode, or batch..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="input pl-9 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "active", "delivered", "failed"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filter === value ? "filter-chip filter-chip-active" : "filter-chip"}
                  onClick={() => setFilter(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-[320px] flex-1 space-y-3 overflow-y-auto pr-1 lg:max-h-[calc(100vh-22rem)]">
          {filteredRuns.length === 0 ? (
            <div className="empty-state">
              <History className="h-7 w-7 opacity-40" />
              <span>No runs match these filters</span>
            </div>
          ) : (
            filteredRuns.map((run) => {
              const selected = selectedId === run.id;
              return (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => selectRun(run.id)}
                  className={`run-master-row w-full text-left ${selected ? "run-master-row-selected" : ""}`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {run.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={run.thumbnailUrl}
                        alt=""
                        className="h-12 w-8 shrink-0 rounded-lg border object-cover"
                        style={{ borderColor: "var(--border)" }}
                      />
                    ) : (
                      <div
                        className="flex h-12 w-8 shrink-0 items-center justify-center rounded-lg border text-[10px] text-[var(--text-muted)]"
                        style={{ borderColor: "var(--border)", background: "var(--bg-inset)" }}
                      >
                        —
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold">{run.modelDisplayName ?? "Unknown model"}</span>
                        {run.modelSlug ? (
                          <span className="font-mono text-[10px] text-[var(--text-muted)]">@{run.modelSlug}</span>
                        ) : null}
                      </div>
                      <div className="truncate text-[11px] text-[var(--text-secondary)]">
                        Reel: <span className="font-bold text-[var(--text-primary)]">{run.reelShortcode ?? "—"}</span>
                        {run.reelCaption ? ` — ${run.reelCaption.slice(0, 48)}` : ""}
                      </div>
                      {run.batchName ? (
                        <div className="font-mono text-[10px] font-semibold text-[var(--text-muted)]">
                          Batch: {run.batchName}
                        </div>
                      ) : null}
                      {run.errorHint &&
                      (run.status === "exception" || run.status === "cancelled") ? (
                        <div
                          className="mt-1 line-clamp-2 text-[10px] leading-snug text-[var(--error-text)]"
                          title={run.errorHint}
                        >
                          {run.errorHint}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 sm:ml-4">
                    <span className="hidden font-mono text-xs font-bold sm:block">
                      ${(run.costCents / 100).toFixed(2)}
                    </span>
                    <StatusBadge
                      status={run.status}
                      kind="run"
                      pulse={isActiveRunStatus(run.status)}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div
        className="panel flex min-h-[420px] w-full flex-col p-4 lg:w-2/5 lg:max-h-[calc(100vh-14rem)]"
        style={{ borderColor: "var(--border)" }}
      >
        {detailLoading ? (
          <div className="empty-state flex-1">
            <span>Loading run trace...</span>
          </div>
        ) : detail ? (
          <RunDetailPanel detail={detail} compact />
        ) : (
          <div className="empty-state flex-1">
            <FileText className="mb-2 h-8 w-8 opacity-40" />
            <span>Select a run to audit specifications</span>
            {selectedId ? (
              <Link href={`/admin/runs/${selectedId}`} className="text-xs no-underline hover:underline">
                Open run #{selectedId} full page
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
