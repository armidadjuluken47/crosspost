"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flame,
  Heart,
  Loader2,
  MessageCircle,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { creatorFetch } from "@/lib/creator-api";

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm11 1.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
    </svg>
  );
}

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3 6.34 6.34 0 0 0 9.5 21.64a6.34 6.34 0 0 0 6.34-6.34V8.9a8.2 8.2 0 0 0 4.76 1.52V6.98a4.84 4.84 0 0 1-1.01-.29z" />
    </svg>
  );
}

function YouTubeGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
    </svg>
  );
}

function PlatformGlyph({
  platform,
  className,
}: {
  platform?: string | null;
  className?: string;
}) {
  if (platform === "tiktok") return <TikTokGlyph className={className} />;
  if (platform === "youtube") return <YouTubeGlyph className={`${className} text-red-400`} />;
  return <InstagramGlyph className={`${className} text-pink-400`} />;
}

function platformLabel(platform?: string | null) {
  if (platform === "tiktok") return "TikTok";
  if (platform === "youtube") return "YouTube";
  return "Instagram";
}

type DiscoverReel = {
  shortcode: string;
  reelUrl: string;
  caption: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  durationSeconds: number | null;
  trendingScore: number;
  handle: string;
  platform?: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  postedAt: string | null;
};

type DiscoverStats = {
  reelCount: number;
  totalViews: number;
  avgViews: number;
  topViralScore: number;
};

type CategoryId = "all" | "trending" | "latest" | "reels" | "tutorials" | "fitness" | "business" | "comedy";

const CATEGORIES: Array<{ id: CategoryId; label: string }> = [
  { id: "all", label: "All" },
  { id: "trending", label: "Trending" },
  { id: "latest", label: "Latest" },
  { id: "reels", label: "Reels" },
  { id: "tutorials", label: "Tutorials" },
  { id: "fitness", label: "Fitness" },
  { id: "business", label: "Business" },
  { id: "comedy", label: "Comedy" },
];

const PAGE_SIZE = 12;

function formatCount(value: number | null | undefined) {
  if (value == null) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatDuration(seconds: number | null) {
  if (seconds == null || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function timeAgo(iso: string | null) {
  if (!iso) return "Recently";
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function categoryKeyword(category: CategoryId) {
  switch (category) {
    case "tutorials":
      return "tutorial";
    case "fitness":
      return "fitness";
    case "business":
      return "business";
    case "comedy":
      return "funny";
    default:
      return "";
  }
}

export function DiscoverView() {
  const [reels, setReels] = useState<DiscoverReel[]>([]);
  const [handles, setHandles] = useState<string[]>([]);
  const [stats, setStats] = useState<DiscoverStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [handle, setHandle] = useState("");
  const [sort, setSort] = useState<"trending" | "views" | "likes" | "recent">("trending");
  const [platform, setPlatform] = useState<"all" | "instagram" | "tiktok" | "youtube">("all");
  const [category, setCategory] = useState<CategoryId>("all");
  const [page, setPage] = useState(1);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [playReel, setPlayReel] = useState<DiscoverReel | null>(null);

  const loadReels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const keyword = categoryKeyword(category);
      const combinedQuery = [query.trim(), keyword].filter(Boolean).join(" ");
      if (combinedQuery) params.set("q", combinedQuery);
      if (handle) params.set("handle", handle);
      if (platform !== "all") params.set("platform", platform);

      const effectiveSort =
        category === "latest" ? "recent" : category === "trending" ? "trending" : sort;
      params.set("sort", effectiveSort);

      const response = await creatorFetch(`/api/creator/discover?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load reels");
      }
      setReels(data.reels ?? []);
      setHandles(data.handles ?? []);
      setStats(data.stats ?? null);
      setPage(1);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load reels");
    } finally {
      setLoading(false);
    }
  }, [query, handle, sort, category, platform]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReels();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loadReels]);

  const pageCount = Math.max(1, Math.ceil(reels.length / PAGE_SIZE));
  const pageReels = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return reels.slice(start, start + PAGE_SIZE);
  }, [reels, page]);

  const clearFilters = () => {
    setQuery("");
    setHandle("");
    setSort("trending");
    setPlatform("all");
    setCategory("all");
  };

  const hasFilters = Boolean(
    query || handle || category !== "all" || sort !== "trending" || platform !== "all",
  );

  return (
    <div className="pb-10">
      <header className="animate-stagger">
        <p className="cp-label">Explore</p>
        <h1 className="cp-display mt-1 text-3xl font-semibold tracking-tight text-cp-ink sm:text-4xl">
          Discover
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-cp-muted">
          Browse trending shorts from Instagram, TikTok, and YouTube — preview any clip, then remix
          it with your identity.
        </p>
      </header>

      {/* Stats */}
      <div className="animate-stagger animate-stagger-delay-1 mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Trending reels",
            value: formatCount(stats?.reelCount ?? reels.length),
            hint: "Live catalog",
            icon: Sparkles,
            tone: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
          },
          {
            label: "Avg. views",
            value: formatCount(stats?.avgViews ?? 0),
            hint: "Per reel",
            icon: Eye,
            tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
          },
          {
            label: "Imported",
            value: formatCount(stats?.reelCount ?? reels.length),
            hint: "Ready to remix",
            icon: Users,
            tone: "bg-sky-50 text-sky-600",
          },
          {
            label: "Top score",
            value: String(stats?.topViralScore ?? 0),
            hint: "Viral index",
            icon: Flame,
            tone: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
          },
        ].map((stat) => (
          <div key={stat.label} className="cp-well px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="cp-label text-[10px] text-cp-muted">{stat.label}</p>
                <p className="cp-display mt-1 text-2xl font-semibold tracking-tight text-cp-ink">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[11px] text-cp-muted">{stat.hint}</p>
              </div>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.tone}`}
              >
                <stat.icon className="h-4 w-4" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="animate-stagger animate-stagger-delay-2 cp-well mt-5 p-3 sm:p-4">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cp-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search captions, handles, URLs…"
              className="w-full rounded-xl border border-cp-line bg-cp-bg py-2.5 pl-9 pr-3 text-sm text-cp-ink outline-none placeholder:text-cp-muted/70 focus:border-cp-accent focus:bg-white dark:focus:bg-[#0f1729]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value as typeof platform)}
              className="rounded-xl border border-cp-line bg-white dark:bg-[#0f1729] px-3 py-2 text-xs font-semibold text-cp-ink outline-none focus:border-cp-accent"
            >
              <option value="all">All platforms</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
            </select>

            <select
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              className="rounded-xl border border-cp-line bg-white dark:bg-[#0f1729] px-3 py-2 text-xs font-semibold text-cp-ink outline-none focus:border-cp-accent"
            >
              <option value="">All handles</option>
              {handles.map((item) => (
                <option key={item} value={item}>
                  @{item}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
              className="rounded-xl border border-cp-line bg-white dark:bg-[#0f1729] px-3 py-2 text-xs font-semibold text-cp-ink outline-none focus:border-cp-accent"
            >
              <option value="trending">Trending</option>
              <option value="views">Most views</option>
              <option value="likes">Most likes</option>
              <option value="recent">Latest</option>
            </select>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-cp-line bg-white dark:bg-[#0f1729] px-3 py-2 text-xs font-semibold text-cp-muted"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-cp-line/70 pt-3">
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                category === item.id
                  ? "bg-cp-ink text-cp-bg"
                  : "text-cp-muted hover:bg-black/[0.04] hover:text-cp-ink dark:hover:bg-white/5"
              }`}
            >
              {item.label}
            </button>
          ))}
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-[11px] font-semibold text-cp-muted hover:text-cp-ink"
            >
              Clear all
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : reels.length === 0 ? (
        <div className="cp-well mt-10 border-dashed py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cp-ink/5 text-cp-muted">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="cp-display mt-4 text-lg font-semibold text-cp-ink">No reels found</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-cp-muted">
            Nothing matches your filters yet. Try a broader search or paste a URL directly.
          </p>
          <Link href="/create" className="cp-btn cp-btn-ghost mt-6 inline-flex text-xs">
            Paste a URL instead
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-6 text-xs font-medium text-cp-muted">
            Showing{" "}
            <span className="font-semibold text-cp-ink">{pageReels.length}</span> of{" "}
            <span className="font-semibold text-cp-ink">{reels.length}</span> reels
          </p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {pageReels.map((reel, index) => {
              const absoluteIndex = (page - 1) * PAGE_SIZE + index;
              const isTrending = absoluteIndex < 3 && (sort === "trending" || category === "trending");
              const duration = formatDuration(reel.durationSeconds);
              const score = Math.min(99, Math.max(1, Math.round(reel.trendingScore)));

              return (
                <article
                  key={reel.shortcode}
                  className="cp-well group overflow-hidden p-0"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-slate-900">
                    {reel.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={reel.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
                        <Play className="h-8 w-8 text-white/50" />
                      </div>
                    )}

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

                    <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
                        <Flame className="h-3 w-3 text-orange-400" />
                        {score}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isTrending ? (
                          <span className="rounded-full bg-white/95 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-900">
                            Hot
                          </span>
                        ) : null}
                        {duration ? (
                          <span className="rounded-full bg-black/55 px-2 py-1 font-mono text-[10px] font-medium text-white backdrop-blur-md">
                            {duration}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {reel.videoUrl ? (
                      <button
                        type="button"
                        onClick={() => setPlayReel(reel)}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/15"
                        aria-label={`Play reel from @${reel.handle}`}
                      >
                        <span className="flex h-11 w-11 scale-90 items-center justify-center rounded-full bg-white/95 text-slate-900 opacity-0 shadow-lg transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                          <Play className="h-4 w-4 fill-current" />
                        </span>
                      </button>
                    ) : null}

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3.5 pb-3.5 pt-12">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                          <PlatformGlyph platform={reel.platform} className="h-3 w-3" />
                          {platformLabel(reel.platform)}
                        </span>
                        <span className="truncate text-xs font-semibold text-white">
                          @{reel.handle}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-snug text-white/95">
                        {reel.caption?.trim() || "Untitled reel"}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-white/75">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatCount(reel.viewCount)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {formatCount(reel.likeCount)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {formatCount(reel.commentCount)}
                        </span>
                        <span className="text-white/55">·</span>
                        <span>{timeAgo(reel.postedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t border-cp-line/70 p-3">
                    <Link
                      href={`/create?reelUrl=${encodeURIComponent(reel.reelUrl)}`}
                      className="cp-btn cp-btn-accent h-9 flex-1 text-xs"
                    >
                      <Zap className="h-3.5 w-3.5 fill-current" />
                      Remix
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        setSaved((prev) => ({
                          ...prev,
                          [reel.shortcode]: !prev[reel.shortcode],
                        }))
                      }
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
                        saved[reel.shortcode]
                          ? "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-400/30 dark:bg-indigo-500/15 dark:text-indigo-300"
                          : "border-cp-line bg-white dark:bg-[#0f1729] text-cp-muted hover:border-indigo-200 hover:text-cp-ink dark:hover:border-indigo-400/30"
                      }`}
                      aria-label="Save reel"
                    >
                      <Bookmark
                        className={`h-4 w-4 ${saved[reel.shortcode] ? "fill-current" : ""}`}
                      />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cp-line bg-white dark:bg-[#0f1729] text-cp-muted transition hover:text-cp-ink disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(pageCount, 5) }, (_, index) => {
                const pageNumber = index + 1;
                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-xs font-semibold transition ${
                      page === pageNumber
                        ? "bg-cp-ink text-cp-bg"
                        : "border border-cp-line bg-white dark:bg-[#0f1729] text-cp-muted hover:text-cp-ink"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              {pageCount > 5 ? (
                <span className="px-1 text-xs text-cp-muted">…{pageCount}</span>
              ) : null}
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cp-line bg-white dark:bg-[#0f1729] text-cp-muted transition hover:text-cp-ink disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[11px] font-medium text-cp-muted">
              {PAGE_SIZE} per page · page {page} of {pageCount}
            </p>
          </div>
        </>
      )}

      {playReel?.videoUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setPlayReel(null)}
        >
          <button
            type="button"
            className="absolute right-3 top-3 z-[60] inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/80 sm:right-5 sm:top-5"
            onClick={() => setPlayReel(null)}
            aria-label="Close player"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="flex w-full max-w-[min(100%,300px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
            style={{ maxHeight: "min(90dvh, 640px)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2.5">
              <PlatformGlyph platform={playReel.platform} className="h-3.5 w-3.5 shrink-0 text-white" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-white">@{playReel.handle}</div>
                <div className="truncate font-mono text-[10px] text-slate-400">{playReel.shortcode}</div>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 bg-black">
              <video
                key={playReel.shortcode}
                src={playReel.videoUrl}
                autoPlay
                controls
                loop
                playsInline
                className="h-full w-full object-contain"
              />
            </div>

            {playReel.caption?.trim() ? (
              <div className="shrink-0 border-t border-white/10 px-3 py-2.5">
                <p className="line-clamp-2 text-xs leading-relaxed text-slate-300">
                  {playReel.caption.trim()}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
