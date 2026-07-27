"use client";

import { Pause, Play, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { formatBatchStatus } from "@/lib/status-labels";

type BatchRow = {
  id: number;
  name: string;
  status: string;
};

type BatchDetail = {
  batch: BatchRow;
  statusCounts: {
    queued: number;
    running: number;
    delivered: number;
    failed: number;
  };
  runCount: number;
};

const ACTIVE_BATCH_STATUSES = new Set(["queued", "running"]);

export function BatchOpsPanel({ initialBatches }: { initialBatches: BatchRow[] }) {
  const [batches, setBatches] = useState(initialBatches);
  const [selectedId, setSelectedId] = useState<number | null>(initialBatches[0]?.id ?? null);
  const [detail, setDetail] = useState<BatchDetail | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBatches(initialBatches);
    if (!selectedId && initialBatches[0]?.id) {
      setSelectedId(initialBatches[0].id);
    }
  }, [initialBatches, selectedId]);

  const selectedBatch = batches.find((batch) => batch.id === selectedId);
  const isActiveBatch = useMemo(() => {
    if (!selectedBatch) return false;
    if (ACTIVE_BATCH_STATUSES.has(selectedBatch.status)) return true;
    const counts = detail?.statusCounts;
    return Boolean(counts && (counts.queued > 0 || counts.running > 0));
  }, [selectedBatch, detail]);

  const refreshDetail = useCallback(async (batchId: number) => {
    try {
      const response = await fetch(`/api/batches/${batchId}`);
      const data = (await response.json()) as BatchDetail;
      setDetail(data);
      if (data.batch) {
        setBatches((prev) =>
          prev.map((row) => (row.id === data.batch.id ? { ...row, status: data.batch.status } : row)),
        );
      }
    } catch {
      setDetail(null);
    }
  }, []);

  const refreshBatches = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    try {
      const response = await fetch("/api/batches");
      const data = (await response.json()) as { batches?: BatchRow[] };
      if (data.batches?.length) setBatches(data.batches);
      if (selectedId) await refreshDetail(selectedId);
    } catch {
      // keep last known state
    }
  }, [selectedId, refreshDetail]);

  useEffect(() => {
    void refreshBatches();
  }, [refreshBatches]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void refreshDetail(selectedId);
  }, [selectedId, refreshDetail]);

  useEffect(() => {
    const interval = window.setInterval(
      () => {
        void refreshBatches();
      },
      isActiveBatch ? 3_000 : 12_000,
    );
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshBatches();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshBatches, isActiveBatch]);

  async function batchAction(action: "pause" | "resume" | "retry-failed") {
    if (!selectedId) return;
    setLoading(true);
    setMessage(null);
    const response = await fetch(`/api/batches/${selectedId}/${action}`, { method: "POST" });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? "Action failed");
      return;
    }
    setMessage(`Batch #${selectedId}: ${action} OK`);
    await refreshBatches();
  }

  return (
    <div className="panel p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase">Batch operations</h3>
        {selectedBatch ? <StatusBadge status={selectedBatch.status} kind="batch" /> : null}
      </div>
      {batches.length === 0 ? (
        <div className="empty-state">No batches yet. Create one in Batch Builder.</div>
      ) : (
        <>
          <select
            className="input select-styled mb-3 w-full"
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
          >
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                #{batch.id} · {batch.name} · {formatBatchStatus(batch.status)}
              </option>
            ))}
          </select>

          {detail ? (
            <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div className="panel-inset flex flex-col gap-1 p-2">
                <span className="text-[var(--text-muted)]">Queued</span>
                <span className="font-mono text-base font-bold">{detail.statusCounts.queued}</span>
              </div>
              <div className="panel-inset flex flex-col gap-1 p-2">
                <span className="text-[var(--text-muted)]">Running</span>
                <span className="font-mono text-base font-bold text-[var(--accent)]">
                  {detail.statusCounts.running}
                </span>
              </div>
              <div className="panel-inset flex flex-col gap-1 p-2">
                <span className="text-[var(--text-muted)]">Delivered</span>
                <span className="font-mono text-base font-bold text-[var(--success-text)]">
                  {detail.statusCounts.delivered}
                </span>
              </div>
              <div className="panel-inset flex flex-col gap-1 p-2">
                <span className="text-[var(--text-muted)]">Failed</span>
                <span className="font-mono text-base font-bold text-[var(--error-text)]">
                  {detail.statusCounts.failed}
                </span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={loading || detail?.batch.status === "paused"}
              onClick={() => batchAction("pause")}
            >
              <Pause className="h-4 w-4" /> Pause
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={loading || detail?.batch.status !== "paused"}
              onClick={() => batchAction("resume")}
            >
              <Play className="h-4 w-4" /> Resume
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={loading || (detail?.statusCounts.failed ?? 0) === 0}
              onClick={() => batchAction("retry-failed")}
            >
              <RefreshCw className="h-4 w-4" /> Retry failed
            </button>
          </div>
        </>
      )}
      {message ? <p className="mt-3 text-xs text-[var(--text-muted)]">{message}</p> : null}
    </div>
  );
}
