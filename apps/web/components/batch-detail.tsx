"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { creatorFetch } from "@/lib/creator-api";

type BatchProject = {
  publicId: string;
  title: string;
  status: string;
  errorMessage: string | null;
  thumbnailUrl: string | null;
};

type BatchDetail = {
  publicId: string;
  title: string;
  status: string;
  itemCount: number;
  errors: Array<{ url: string; error: string }>;
};

export function BatchDetailView({ publicId }: { publicId: string }) {
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [projects, setProjects] = useState<BatchProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function poll() {
      const response = await creatorFetch(`/api/creator/batches/${publicId}`);
      const data = await response.json();
      if (!active) return;
      setBatch(data.batch ?? null);
      setProjects(data.projects ?? []);
      setLoading(false);
    }

    void poll();
    const interval = window.setInterval(() => void poll(), 4000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [publicId]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-cp-muted" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-cp-muted">Batch not found.</p>
        <Link href="/create" className="mt-4 inline-block text-sm font-semibold text-cp-ink">
          Back to create
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/create"
        className="inline-flex items-center gap-2 text-sm font-medium text-cp-muted hover:text-cp-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        New remix
      </Link>

      <header className="mt-8">
        <p className="cp-label">Batch · {batch.status}</p>
        <h1 className="cp-display mt-2 text-3xl tracking-tight text-cp-ink">
          {batch.title}
        </h1>
        <p className="mt-2 text-sm text-cp-muted">
          {projects.length} project{projects.length === 1 ? "" : "s"} created
          {batch.errors?.length ? ` · ${batch.errors.length} URL(s) failed` : ""}
        </p>
      </header>

      {batch.errors?.length ? (
        <div className="mt-6 space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {batch.errors.map((item) => (
            <p key={item.url} className="break-all">
              <span className="font-semibold">{item.url}</span> — {item.error}
            </p>
          ))}
        </div>
      ) : null}

      <ul className="mt-8 space-y-3">
        {projects.map((project) => (
          <li key={project.publicId}>
            <Link
              href={`/projects/${project.publicId}`}
              className="cp-well flex items-center gap-4 p-4 transition-colors hover:border-indigo-200 dark:hover:border-indigo-400/30"
            >
              <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-cp-bg">
                {project.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-cp-ink">{project.title}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-cp-muted">
                  {project.publicId}
                </p>
                {project.errorMessage ? (
                  <p className="mt-1 truncate text-xs text-red-600 dark:text-red-400">{project.errorMessage}</p>
                ) : null}
              </div>
              <StatusPill status={project.status} />
              <ArrowRight className="h-4 w-4 text-cp-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" /> Ready
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700 dark:bg-red-500/15 dark:text-red-300">
        <AlertCircle className="h-3 w-3" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cp-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cp-muted">
      <Clock className="h-3 w-3 animate-spin" /> Processing
    </span>
  );
}
