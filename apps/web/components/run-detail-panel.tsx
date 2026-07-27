"use client";

import Link from "next/link";
import { Check, CloudUpload, RotateCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { formatStageName } from "@/lib/status-labels";
import type { SerializedRunDetail } from "@/lib/run-serializer";

function stageNodeState(
  stageName: string,
  stageStatus: string,
  runStatus: string,
): "completed" | "running" | "failed" | "pending" {
  if (stageStatus === "success") return "completed";
  if (stageStatus === "failed") return "failed";
  if (stageStatus === "running") return "running";
  const activeStage =
    runStatus === "delivering" ? "delivery" : runStatus === "started" ? "image_gen" : runStatus;
  if (activeStage === stageName && !["delivered", "exception", "cancelled"].includes(runStatus)) {
    return "running";
  }
  return "pending";
}

export function RunDetailPanel({
  detail,
  extended = false,
  compact = false,
  showQueueLink = true,
}: {
  detail: SerializedRunDetail;
  extended?: boolean;
  compact?: boolean;
  showQueueLink?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canRetry = detail.run.status === "exception" || detail.run.status === "cancelled";
  const canRegenerate =
    detail.run.status === "delivered" ||
    detail.run.status === "exception" ||
    detail.run.status === "cancelled";
  const canDelete = detail.run.status === "exception" || detail.run.status === "cancelled";
  const needsRedeliver =
    detail.run.status === "delivered" &&
    detail.delivery != null &&
    (detail.delivery.destination === "local" ||
      (detail.delivery.drivePath?.startsWith("fixture-drive/") ?? false));

  async function retryRun() {
    setLoading(true);
    setMessage(null);
    const jobsResponse = await fetch("/api/run-jobs");
    const jobsData = await jobsResponse.json();
    const job = (jobsData.jobs as { id: number; runId: number | null }[] | undefined)?.find(
      (row) => row.runId === detail.run.id,
    );
    if (!job) {
      setLoading(false);
      setMessage("No queue job found for this run");
      return;
    }
    const response = await fetch("/api/run-jobs/retry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: job.id, requestedBy: "dashboard" }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? "Retry failed");
      return;
    }
    setMessage("Run requeued");
    router.refresh();
  }

  async function regenerateRun() {
    setLoading(true);
    setMessage(null);
    const response = await fetch(`/api/runs/${detail.run.id}/regenerate`, { method: "POST" });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? "Regenerate failed");
      return;
    }
    setMessage(`New run #${data.run.id} queued`);
    router.refresh();
  }

  async function redeliverRun() {
    setLoading(true);
    setMessage(null);
    const response = await fetch(`/api/runs/${detail.run.id}/redeliver`, { method: "POST" });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? "Re-delivery failed");
      return;
    }
    setMessage(`Re-delivered to ${data.delivery?.drivePath ?? "Drive"}`);
    router.refresh();
  }

  async function deleteRun() {
    if (!window.confirm(`Delete run #${detail.run.id}? This cannot be undone.`)) return;
    setLoading(true);
    setMessage(null);
    const response = await fetch(`/api/runs/${detail.run.id}`, { method: "DELETE" });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      if (response.status === 403) {
        setMessage("Admin role required to delete runs. Ask an admin or sign in as admin.");
        return;
      }
      setMessage(data.error ?? "Delete failed");
      return;
    }
    setMessage("Run deleted");
    router.refresh();
  }

  return (
    <div className={`flex flex-col ${compact ? "h-full min-h-0" : ""}`}>
      <div className="shrink-0 space-y-2.5 border-b pb-4" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold uppercase text-[var(--text-muted)]">
            Execution trace · Run #{detail.run.id}
          </span>
          <span className="font-mono text-[10px] font-bold text-[var(--text-muted)]">
            {new Date(detail.run.createdAt).toLocaleString()}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide">
            {detail.model?.displayName ?? "Unknown model"} × {detail.sourceReel?.shortcode ?? "—"}
          </h3>
          <StatusBadge
            status={detail.run.status}
            kind="run"
            pulse={detail.run.status === "video_gen" || detail.run.status === "image_gen"}
          />
        </div>
        {detail.errorMessage ? (
          <div
            className="rounded-xl border p-3 text-[11px]"
            style={{
              borderColor: "color-mix(in srgb, var(--error-text) 25%, transparent)",
              background: "var(--error-bg)",
              color: "var(--error-text)",
            }}
          >
            <b>Fatal error:</b> {detail.errorMessage}
          </div>
        ) : null}
      </div>

      <div className={`flex-1 space-y-5 overflow-y-auto py-4 ${compact ? "min-h-0 pr-1" : ""}`}>
        <div className="space-y-3">
          <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Workflow state monitor
          </span>
          <div className="space-y-4 pt-1">
            {detail.stages.map((stage, index) => {
              const nodeState = stageNodeState(stage.stage, stage.status, detail.run.status);
              return (
                <div key={stage.id} className="relative flex items-start gap-3.5">
                  {index < detail.stages.length - 1 ? (
                    <div
                      className={`absolute left-[7px] top-4 h-10 w-px ${
                        nodeState === "completed"
                          ? "bg-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
                          : "bg-[var(--border)]"
                      }`}
                    />
                  ) : null}
                  <div
                    className={`mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                      nodeState === "completed"
                        ? "border-[var(--accent)] bg-[var(--accent)] shadow-[0_0_8px_color-mix(in_srgb,var(--accent)_40%,transparent)]"
                        : nodeState === "failed"
                          ? "animate-pulse border-[var(--error-text)] bg-[var(--error-text)]"
                          : nodeState === "running"
                            ? "animate-pulse border-[var(--accent)] bg-transparent"
                            : "border-[var(--border)] bg-transparent"
                    }`}
                  >
                    {nodeState === "completed" ? (
                      <Check className="h-2.5 w-2.5 stroke-[3.5] text-[var(--bg-base)]" />
                    ) : null}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-mono text-[11px] font-bold uppercase ${
                          nodeState === "running"
                            ? "text-[var(--accent)]"
                            : nodeState === "failed"
                              ? "text-[var(--error-text)]"
                              : nodeState === "completed"
                                ? "text-[var(--text-secondary)]"
                                : "text-[var(--text-muted)]"
                        }`}
                      >
                        {formatStageName(stage.stage)}
                      </span>
                      <StatusBadge status={stage.status} kind="raw" />
                    </div>
                    {stage.error ? (
                      <p className="text-[10px] leading-relaxed text-[var(--error-text)]">{stage.error}</p>
                    ) : stage.provider ? (
                      <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
                        Provider: <code>{stage.provider}</code>
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {detail.imageInputs.length > 0 ? (
          <div className="space-y-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Image input roles
            </span>
            <ul className="space-y-1.5 rounded-xl border p-3 text-[11px]" style={{ borderColor: "var(--border)" }}>
              {detail.imageInputs.map((input) => (
                <li key={input.slot} className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[var(--text-muted)]">#{input.slot}</span>
                  <span className="font-semibold">{input.label}</span>
                  <span className="font-mono text-[10px] uppercase text-[var(--text-secondary)]">{input.role}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {detail.imageCandidates.length > 0 ? (
          <div className="space-y-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Image candidates (QA in Drive — winner used for video)
            </span>
            {detail.imageCandidates.length === 1 ? (
              <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
                Fallback image provider returned a single output (Nano Banana provides up to 4).
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {detail.imageCandidates.map((candidate) => (
                <div key={candidate.id} className="space-y-1">
                  <span className="block font-mono text-[9px] font-bold uppercase text-[var(--text-muted)]">
                    #{candidate.ordinal}
                    {candidate.isWinner ? " · used" : ""}
                  </span>
                  {candidate.previewUrl ? (
                    <div
                      className="aspect-[3/4] overflow-hidden rounded-lg border bg-black"
                      style={{ borderColor: candidate.isWinner ? "var(--accent)" : "var(--border)" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={candidate.previewUrl}
                        alt={`Candidate ${candidate.ordinal}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {detail.imageUrl || detail.videoUrl ? (
          <div className="space-y-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Generated artifact assets
            </span>
            <div className="grid grid-cols-2 gap-4">
              {detail.imageUrl ? (
                <div className="space-y-1">
                  <span className="block font-mono text-[9px] font-bold uppercase leading-none text-[var(--text-muted)]">
                    1st frame identity swap
                  </span>
                  <div
                    className="relative aspect-[3/4] overflow-hidden rounded-xl border bg-black p-1"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={detail.imageUrl}
                      alt="Generated portrait"
                      className="h-full w-full rounded-lg object-cover"
                    />
                  </div>
                </div>
              ) : null}
              {detail.videoUrl ? (
                <div className="space-y-1">
                  <span className="block font-mono text-[9px] font-bold uppercase leading-none text-[var(--text-muted)]">
                    Final motion video
                  </span>
                  <div
                    className="relative aspect-[3/4] overflow-hidden rounded-xl border bg-black p-1"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <video
                      src={detail.videoUrl}
                      autoPlay
                      loop
                      muted
                      controls
                      playsInline
                      className="h-full w-full rounded-lg object-cover"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {detail.prompts.image || detail.prompts.video ? (
          <div className="space-y-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Active prompt payload trace
            </span>
            <div
              className="space-y-2.5 rounded-xl border p-4 font-mono text-[9px] leading-relaxed text-[var(--text-secondary)]"
              style={{ borderColor: "var(--border)", background: "var(--bg-inset)" }}
            >
              {detail.prompts.image ? (
                <div>
                  <span className="block font-bold text-[var(--text-muted)]">
                    IMAGE_GEN_PROMPT
                    {detail.prompts.image.version != null ? ` v${detail.prompts.image.version}` : ""}
                    {detail.prompts.image.scope ? ` · ${detail.prompts.image.scope}` : ""}
                  </span>
                  <span className="mt-1 block whitespace-pre-wrap">{detail.prompts.image.body ?? "—"}</span>
                </div>
              ) : null}
              {detail.prompts.video ? (
                <div
                  className={detail.prompts.image ? "border-t pt-2.5" : ""}
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="block font-bold text-[var(--text-muted)]">
                    VIDEO_GEN_PROMPT
                    {detail.prompts.video.version != null ? ` v${detail.prompts.video.version}` : ""}
                    {detail.prompts.video.scope ? ` · ${detail.prompts.video.scope}` : ""}
                  </span>
                  <span className="mt-1 block whitespace-pre-wrap">{detail.prompts.video.body ?? "—"}</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {extended ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="panel p-4">
                <h2 className="mb-3 text-sm font-bold uppercase">Summary</h2>
                <ul className="space-y-2 text-sm">
                  <li>Model: {detail.model?.displayName ?? "—"}</li>
                  <li>Source reel: {detail.sourceReel?.shortcode ?? "—"}</li>
                  <li>
                    Image provider: <code>{detail.providerId ?? "—"}</code>
                  </li>
                  <li>
                    Video provider: <code>{detail.videoProviderId ?? "—"}</code>
                  </li>
                  <li>Cost: ${(detail.run.costCents / 100).toFixed(2)}</li>
                </ul>
              </div>
              <div className="panel p-4">
                <h2 className="mb-3 text-sm font-bold uppercase">Delivery</h2>
                <p className="text-sm">
                  <code>{detail.delivery?.drivePath ?? "—"}</code>
                </p>
              </div>
            </div>
            <div className="panel p-4">
              <h2 className="mb-3 text-sm font-bold uppercase">Exceptions & audit</h2>
              <ul className="mb-4 space-y-2 text-sm">
                {detail.exceptions.map((exc) => (
                  <li key={exc.id}>
                    #{exc.id} — {exc.stage} — {exc.reason}
                  </li>
                ))}
                {detail.exceptions.length === 0 ? (
                  <li className="text-[var(--text-muted)]">None</li>
                ) : null}
              </ul>
              <ul className="space-y-1 font-mono text-xs text-[var(--text-muted)]">
                {detail.auditEvents.map((event) => (
                  <li key={event.id}>{event.action}</li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </div>

      <div className="shrink-0 space-y-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
        {canRegenerate ? (
          <button
            type="button"
            className="btn-primary flex w-full items-center justify-center gap-2"
            disabled={loading}
            onClick={regenerateRun}
          >
            <RotateCw className="h-3.5 w-3.5" />
            {loading ? "Queueing..." : "Regenerate reel"}
          </button>
        ) : null}
        {canRetry ? (
          <button
            type="button"
            className="btn-secondary flex w-full items-center justify-center gap-2"
            disabled={loading}
            onClick={retryRun}
          >
            <RotateCw className="h-3.5 w-3.5" />
            {loading ? "Requeuing..." : "Re-trigger failed job"}
          </button>
        ) : null}
        {needsRedeliver ? (
          <button
            type="button"
            className="btn-secondary flex w-full items-center justify-center gap-2"
            disabled={loading}
            onClick={redeliverRun}
          >
            <CloudUpload className="h-3.5 w-3.5" />
            {loading ? "Uploading..." : "Re-deliver to Drive"}
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            className="btn-secondary flex w-full items-center justify-center gap-2 text-[var(--error-text)]"
            disabled={loading}
            onClick={deleteRun}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {loading ? "Deleting..." : "Delete failed run"}
          </button>
        ) : null}
        {!compact && showQueueLink ? (
          <Link
            href={`/admin/queue?run=${detail.run.id}`}
            className="btn-secondary inline-flex w-full justify-center no-underline"
          >
            Open in queue
          </Link>
        ) : null}
        {message ? <p className="text-xs text-[var(--text-muted)]">{message}</p> : null}
      </div>
    </div>
  );
}
