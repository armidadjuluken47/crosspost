"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { creatorFetch } from "@/lib/creator-api";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  PlusCircle,
  Search,
  VideoOff,
} from "lucide-react";

type ProjectRow = {
  publicId: string;
  title: string;
  status: string;
  createdAt: string;
  thumbnailUrl?: string | null;
};

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function ProjectsList() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "processing" | "ready" | "failed">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "title">("newest");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await creatorFetch("/api/creator/projects");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load projects");
        }
        if (active) setProjects(data.projects ?? []);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load projects");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 4000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = projects.filter((project) =>
      activeTab === "all" ? true : project.status === activeTab,
    );

    if (q) {
      rows = rows.filter(
        (project) =>
          project.title.toLowerCase().includes(q) ||
          project.publicId.toLowerCase().includes(q),
      );
    }

    rows = [...rows].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });

    return rows;
  }, [projects, activeTab, query, sort]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="animate-stagger flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cp-muted">Library</p>
          <h1 className="cp-display mt-2 text-3xl font-semibold tracking-tight text-cp-ink sm:text-4xl">
            My Projects
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-cp-muted">
            Search, filter, and reopen any remix or batch item.
          </p>
        </div>

        <Link href="/create" className="cp-btn cp-btn-accent w-fit shrink-0">
          <PlusCircle className="h-4 w-4" /> Create new video clone
        </Link>
      </div>

      <div className="animate-stagger animate-stagger-delay-1 mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 border-b border-cp-line pb-3 sm:border-0 sm:pb-0">
          {(["all", "processing", "ready", "failed"] as const).map((tab) => {
            const count =
              tab === "all" ? projects.length : projects.filter((p) => p.status === tab).length;
            const isActive = activeTab === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative rounded-2xl px-4 py-2 text-xs font-bold capitalize transition-all ${
                  isActive
                    ? "bg-cp-ink text-cp-bg"
                    : "text-cp-muted hover:bg-black/5 hover:text-cp-ink dark:hover:bg-white/5"
                }`}
              >
                {tab}
                <span
                  className={`ml-1.5 rounded-2xl px-1.5 py-0.5 text-[9px] font-extrabold ${
                    isActive ? "bg-cp-bg/25 text-cp-bg" : "bg-cp-line/60 text-cp-muted"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cp-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title or ID"
              className="w-full rounded-xl border border-cp-line bg-white dark:bg-[#0f1729] py-2 pl-9 pr-3 text-xs outline-none focus:border-cp-ink"
            />
          </label>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="rounded-xl border border-cp-line bg-white dark:bg-[#0f1729] px-3 py-2 text-xs outline-none focus:border-cp-ink"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-16 text-center text-sm text-cp-muted">Loading projects…</p>
      ) : filteredProjects.length === 0 ? (
        <div className="animate-stagger animate-stagger-delay-2 mt-12 border border-dashed border-cp-line bg-cp-card/50 py-14 text-center rounded-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cp-ink/5 text-cp-muted">
            <VideoOff className="h-6 w-6" />
          </div>
          <h3 className="cp-display mt-4 text-lg font-semibold text-cp-ink">
            No projects found here
          </h3>
          <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-cp-muted">
            {activeTab === "all" && !query
              ? "You haven't generated any clips yet. Upload an identity to start."
              : `No projects match your filters.`}
          </p>
          <Link href="/create" className="cp-btn cp-btn-ghost mt-6 inline-flex">
            Create first project <PlusCircle className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="animate-stagger animate-stagger-delay-2 mt-8 space-y-3">
          {filteredProjects.map((project) => (
            <Link
              key={project.publicId}
              href={`/projects/${project.publicId}`}
              className="cp-well group flex cursor-pointer flex-col items-start justify-between gap-5 p-5 sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="relative h-20 w-[60px] shrink-0 overflow-hidden rounded-2xl border border-cp-line bg-gradient-to-br from-cp-ink via-cp-ink/80 to-cp-accent/40">
                  {project.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-cp-ink group-hover:underline">
                    {project.title}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-cp-muted">
                    {project.publicId}
                  </p>
                  <p className="mt-1 text-xs text-cp-muted">
                    {formatRelativeDate(project.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                <StatusPill status={project.status} />
                <ArrowRight className="h-4 w-4 text-cp-muted transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
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
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
      <Clock className="h-3 w-3" /> Processing
    </span>
  );
}
