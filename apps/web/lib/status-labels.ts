export type StatusTone = "ok" | "warn" | "error" | "muted" | "active";

export function formatBatchStatus(status: string): string {
  const labels: Record<string, string> = {
    draft: "Draft",
    queued: "Queued",
    running: "Running",
    paused: "Paused",
    completed: "Completed",
    completed_with_exceptions: "Completed w/ exceptions",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function formatRunStatus(status: string): string {
  const labels: Record<string, string> = {
    queued: "Queued",
    started: "Started",
    image_gen: "Image gen",
    image_qc: "Image QC",
    video_gen: "Video gen",
    video_qc: "Video QC",
    delivering: "Delivering",
    delivered: "Delivered",
    exception: "Exception",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function formatJobStatus(status: string): string {
  const labels: Record<string, string> = {
    queued: "Queued",
    running: "Running",
    succeeded: "Succeeded",
    failed: "Failed",
    retry_scheduled: "Retry scheduled",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function formatStageName(stage: string): string {
  const labels: Record<string, string> = {
    image_gen: "Image generation",
    image_qc: "Image QC",
    video_gen: "Video generation",
    video_qc: "Video QC",
    delivery: "Delivery",
    pipeline: "Pipeline",
    intake: "Intake",
  };
  return labels[stage] ?? stage.replace(/_/g, " ");
}

export function toneForBatchStatus(status: string): StatusTone {
  if (status === "completed") return "ok";
  if (status === "completed_with_exceptions") return "warn";
  if (status === "paused") return "warn";
  if (status === "cancelled") return "error";
  if (status === "running" || status === "queued") return "active";
  return "muted";
}

export function toneForRunStatus(status: string): StatusTone {
  if (status === "delivered") return "ok";
  if (status === "exception" || status === "cancelled") return "error";
  if (["image_gen", "video_gen", "delivering", "started"].includes(status)) return "active";
  if (["image_qc", "video_qc", "queued"].includes(status)) return "warn";
  return "muted";
}

export function toneForJobStatus(status: string): StatusTone {
  if (status === "succeeded") return "ok";
  if (status === "failed" || status === "cancelled") return "error";
  if (status === "running") return "active";
  if (status === "retry_scheduled") return "warn";
  return "muted";
}

export function toneForExceptionStatus(status: string): StatusTone {
  if (status === "open") return "error";
  if (status === "resolved") return "ok";
  return "muted";
}
