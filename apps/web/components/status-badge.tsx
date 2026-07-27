import {
  formatBatchStatus,
  formatJobStatus,
  formatRunStatus,
  formatStageName,
  toneForBatchStatus,
  toneForExceptionStatus,
  toneForJobStatus,
  toneForRunStatus,
  type StatusTone,
} from "@/lib/status-labels";

type StatusKind = "batch" | "run" | "job" | "stage" | "exception" | "raw";

function badgeClass(tone: StatusTone, pulse = false): string {
  const base = "badge";
  const toneClass =
    tone === "ok"
      ? "badge-ok"
      : tone === "warn"
        ? "badge-warn"
        : tone === "error"
          ? "badge-error"
          : tone === "active"
            ? "badge-active"
            : "badge-muted";
  return pulse ? `${base} ${toneClass} badge-pulse` : `${base} ${toneClass}`;
}

function labelFor(kind: StatusKind, status: string): string {
  switch (kind) {
    case "batch":
      return formatBatchStatus(status);
    case "run":
      return formatRunStatus(status);
    case "job":
      return formatJobStatus(status);
    case "stage":
      return formatStageName(status);
    case "exception":
      return status.charAt(0).toUpperCase() + status.slice(1);
    default:
      return status.replace(/_/g, " ");
  }
}

function toneFor(kind: StatusKind, status: string): StatusTone {
  switch (kind) {
    case "batch":
      return toneForBatchStatus(status);
    case "run":
      return toneForRunStatus(status);
    case "job":
      return toneForJobStatus(status);
    case "exception":
      return toneForExceptionStatus(status);
    default:
      if (status === "success") return "ok";
      if (status === "failed") return "error";
      return "muted";
  }
}

export function StatusBadge({
  status,
  kind = "raw",
  pulse = false,
}: {
  status: string;
  kind?: StatusKind;
  pulse?: boolean;
}) {
  const tone = toneFor(kind, status);
  return <span className={badgeClass(tone, pulse)}>{labelFor(kind, status)}</span>;
}
