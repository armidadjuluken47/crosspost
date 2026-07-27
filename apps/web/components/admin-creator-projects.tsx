"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, RotateCcw } from "lucide-react";

export type AdminProjectRow = {
  publicId: string;
  title: string;
  status: string;
  externalUserId: string;
  runId: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string | null;
};

export function AdminCreatorProjectsPanel({
  initialProjects,
}: {
  initialProjects: AdminProjectRow[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [statusFilter, setStatusFilter] = useState<"all" | "processing" | "ready" | "failed">(
    "all",
  );
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? projects
        : projects.filter((project) => project.status === statusFilter),
    [projects, statusFilter],
  );

  async function handleRetry(publicId: string) {
    setRetryingId(publicId);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/creator-projects/${publicId}/retry`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Retry failed");
      }
      setProjects((prev) =>
        prev.map((project) =>
          project.publicId === publicId
            ? {
                ...project,
                status: data.project?.status ?? "processing",
                errorMessage: data.project?.errorMessage ?? null,
                runId: data.project?.runId ?? project.runId,
                updatedAt: new Date().toISOString(),
              }
            : project,
        ),
      );
      setMessage(`Retry queued for ${publicId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Retry failed");
    } finally {
      setRetryingId(null);
    }
  }

  async function handleDelete(publicId: string) {
    if (!window.confirm(`Delete project ${publicId}? This also removes its linked run data.`)) return;
    setDeletingId(publicId);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/creator-projects/${publicId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Delete failed");
      }
      setProjects((prev) => prev.filter((project) => project.publicId !== publicId));
      setMessage(`Deleted ${publicId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "processing", "ready", "failed"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
              statusFilter === status
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-secondary)]"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {message ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--bg-inset)] font-mono text-[10px] uppercase tracking-widest text-[var(--text-faint)]">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Run</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((project) => (
              <tr key={project.publicId} className="border-b border-[var(--border)]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-9 overflow-hidden rounded-md bg-[var(--bg-inset)]">
                      {project.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={project.thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div>
                      <Link
                        href={`/admin/projects/${project.publicId}`}
                        className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)]"
                      >
                        {project.title}
                      </Link>
                      <p className="font-mono text-[10px] text-[var(--text-faint)]">
                        {project.publicId}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users?uid=${encodeURIComponent(project.externalUserId)}`}
                    className="font-mono text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]"
                  >
                    {project.externalUserId.slice(0, 16)}
                    {project.externalUserId.length > 16 ? "…" : ""}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    {project.status}
                  </span>
                  {project.errorMessage ? (
                    <p className="mt-1 max-w-[220px] truncate text-[11px] text-red-500">
                      {project.errorMessage}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {project.runId ? (
                    <Link
                      href={`/admin/runs/${project.runId}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]"
                    >
                      #{project.runId}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="text-xs text-[var(--text-faint)]">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                  {new Date(project.updatedAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {project.status === "failed" ? (
                      <button
                        type="button"
                        disabled={retryingId === project.publicId}
                        onClick={() => void handleRetry(project.publicId)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--bg-hover)] disabled:opacity-50"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry
                      </button>
                    ) : (
                      <Link
                        href={`/admin/projects/${project.publicId}`}
                        className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)]"
                      >
                        Detail
                      </Link>
                    )}
                    <button
                      type="button"
                      disabled={deletingId === project.publicId}
                      onClick={() => void handleDelete(project.publicId)}
                      className="rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === project.publicId ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                  No creator projects match this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
