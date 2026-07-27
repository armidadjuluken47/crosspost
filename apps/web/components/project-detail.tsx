"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileArchive,
  FileText,
  ImageIcon,
  Loader2,
  RotateCcw,
  Captions,
  Film,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCreatorToast } from "./creator/creator-toast";
import { PostToSocial } from "./post-to-social";
import { creatorFetch } from "@/lib/creator-api";

type ProgressStep = {
  id: string;
  label: string;
  status: "pending" | "active" | "complete" | "failed";
};

type PlatformKey = "tiktok" | "instagram" | "youtube" | "linkedin";

type PlatformPack = {
  caption: string;
  hashtags: string;
  hookVariants: string[];
};

type PlatformVariants = Record<PlatformKey, PlatformPack>;

const PLATFORM_TABS: Array<{ id: PlatformKey; label: string }> = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "linkedin", label: "LinkedIn" },
];

type ProjectDetail = {
  publicId: string;
  title: string;
  status: string;
  caption: string | null;
  hashtags: string | null;
  hookVariants: string[] | null;
  platformVariants: PlatformVariants | null;
  progress: ProgressStep[];
  outputVideoUrl: string | null;
  sourceVideoUrl: string | null;
  thumbnailUrl: string | null;
  burnedVideoUrl: string | null;
  hasSrt: boolean;
  burnSubtitles: boolean;
  errorMessage: string | null;
};

function maybeNotifyBrowser(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  // Only surface an OS notification when the tab is backgrounded — the in-app
  // toast already covers the foreground case.
  if (document.visibilityState === "visible") return;

  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body });
    } catch {
      // Ignore — some browsers throw on constructor without a service worker.
    }
  } else if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

function resolveActivePlatformPack(project: ProjectDetail, platform: PlatformKey): PlatformPack {
  const variant = project.platformVariants?.[platform];
  if (variant) return variant;

  return {
    caption: project.caption ?? "",
    hashtags: project.hashtags ?? "",
    hookVariants: project.hookVariants ?? [],
  };
}

function computeProgress(steps: ProgressStep[]) {
  if (!steps.length) return 0;
  const score = steps.reduce(
    (total, step) =>
      total +
      (step.status === "complete" ? 1 : step.status === "active" ? 0.5 : step.status === "failed" ? 0 : 0),
    0,
  );
  return Math.round((score / steps.length) * 100);
}

function ProcessingPanel({ project }: { project: ProjectDetail }) {
  const progress = computeProgress(project.progress);
  const isFailed = project.status === "failed";

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="animate-stagger flex items-center justify-between">
        <Link
          href="/projects"
          className="group flex items-center gap-2 text-sm font-semibold text-cp-muted transition-colors hover:text-cp-ink"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          All projects
        </Link>
        <span className="rounded-2xl border border-cp-line bg-cp-card px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-cp-muted">
          Ref #{project.publicId.slice(0, 8)}
        </span>
      </div>

      <div className="cp-well animate-stagger animate-stagger-delay-1 mt-8 p-6 sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cp-muted">
          {isFailed ? "Pipeline" : "In progress"}
        </p>
        <h2 className="cp-display mt-2 text-2xl font-semibold tracking-tight text-cp-ink sm:text-3xl">
          {isFailed ? "Generation failed" : "Creating your content…"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-cp-muted">
          {isFailed
            ? "You can retry with the same face and source video, or start a new upload."
            : "This usually takes a few minutes depending on queue load."}
        </p>

        <div className="my-8 flex items-center justify-center gap-4 rounded-2xl border border-cp-line bg-cp-bg p-4">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-cp-line bg-cp-card">
            <Film className="h-6 w-6 text-cp-muted" />
            <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1 py-0.5 text-[8px] font-bold uppercase text-white">
              FACE
            </span>
          </div>
          <div className="flex h-5 w-10 items-center justify-center">
            <div className="h-0.5 w-full animate-pulse bg-gradient-to-r from-cp-ink/20 via-cp-accent/50 to-cp-success/60" />
          </div>
          <div className="relative flex h-16 w-12 items-center justify-center overflow-hidden rounded-2xl border border-cp-line bg-cp-ink">
            {project.sourceVideoUrl ? (
              <video
                src={project.sourceVideoUrl}
                className="h-full w-full object-cover opacity-60"
                muted
                autoPlay
                loop
                playsInline
              />
            ) : (
              <Film className="h-6 w-6 text-white" />
            )}
            <span className="absolute bottom-1 right-1 rounded-md bg-cp-accent px-1 py-0.5 text-[8px] font-bold uppercase text-white">
              VIDEO
            </span>
          </div>
        </div>

        {/* Vertical timeline */}
        <div className="relative border-t border-cp-line pt-8 text-left">
          <div className="absolute bottom-0 left-[9px] top-8 w-px bg-cp-line" aria-hidden />
          <ol className="relative space-y-0">
            {project.progress.map((step, index) => {
              const isLast = index === project.progress.length - 1;
              return (
                <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {!isLast ? (
                    <span
                      className={`absolute left-[9px] top-5 h-[calc(100%-8px)] w-px ${
                        step.status === "complete"
                          ? "bg-cp-success/50"
                          : step.status === "failed"
                            ? "bg-cp-accent/40"
                            : "bg-cp-line"
                      }`}
                      aria-hidden
                    />
                  ) : null}
                  <div className="relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                    {step.status === "complete" && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cp-success text-white">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    {step.status === "active" && (
                      <div className="relative flex h-5 w-5 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cp-accent/40" />
                        <div className="relative flex h-[18px] w-[18px] items-center justify-center rounded-full bg-cp-ink">
                          <Loader2 className="h-2.5 w-2.5 animate-spin text-cp-bg" />
                        </div>
                      </div>
                    )}
                    {step.status === "pending" && (
                      <div className="h-[18px] w-[18px] rounded-full border border-cp-line bg-cp-card" />
                    )}
                    {step.status === "failed" && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cp-accent text-white">
                        <X className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p
                      className={`text-sm transition-colors duration-200 ${
                        step.status === "active"
                          ? "font-semibold text-cp-ink"
                          : step.status === "complete"
                            ? "font-normal text-cp-muted"
                            : step.status === "failed"
                              ? "font-bold text-cp-accent"
                              : "font-medium text-cp-muted/50"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-2 border-t border-cp-line pt-6">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-cp-muted">
            <span>Pipeline</span>
            <span className="text-cp-ink">{progress}% completed</span>
          </div>
          <div className="relative mt-3 h-2 w-full overflow-hidden rounded-2xl bg-cp-bg">
            <div
              style={{ width: `${progress}%` }}
              className={`h-full rounded-2xl transition-all duration-300 ease-out ${
                isFailed ? "bg-cp-accent" : "bg-cp-ink"
              }`}
            />
          </div>
        </div>

        {project.errorMessage ? (
          <p className="mt-6 rounded-2xl border border-cp-accent/30 bg-cp-accent/10 px-4 py-3 text-sm text-cp-accent">
            {project.errorMessage}
          </p>
        ) : (
          <div className="mt-6 rounded-2xl border border-cp-line bg-cp-bg p-4 text-xs leading-relaxed text-cp-muted">
            You can safely leave this page. Processing continues server-side and updates here
            automatically.
          </div>
        )}
      </div>
    </div>
  );
}

function ResultsPanel({ project, publicId }: { project: ProjectDetail; publicId: string }) {
  const { showToast } = useCreatorToast();
  const [activePlatform, setActivePlatform] = useState<PlatformKey>("tiktok");
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [copiedHookIdx, setCopiedHookIdx] = useState<number | null>(null);

  const videoUrl = project.outputVideoUrl ?? project.sourceVideoUrl;
  const activePack = resolveActivePlatformPack(project, activePlatform);
  const hasPlatformVariants = Boolean(project.platformVariants);
  const hasCaption = Boolean(activePack.caption?.trim() || project.caption?.trim());
  const hasHashtags = Boolean(activePack.hashtags?.trim() || project.hashtags?.trim());
  const hasHooks = activePack.hookVariants.length > 0;
  const hasCopyPack = hasCaption || hasHashtags || hasHooks;

  function handleCopy(text: string, trigger: "caption" | "hashtags" | number) {
    void navigator.clipboard.writeText(text);
    showToast("Copied", "success");

    if (trigger === "caption") {
      setCopiedCaption(true);
      window.setTimeout(() => setCopiedCaption(false), 1600);
    } else if (trigger === "hashtags") {
      setCopiedHashtags(true);
      window.setTimeout(() => setCopiedHashtags(false), 1600);
    } else {
      setCopiedHookIdx(trigger);
      window.setTimeout(() => setCopiedHookIdx(null), 1600);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <div className="animate-stagger mb-10 flex items-center justify-between">
        <Link
          href="/create"
          className="group inline-flex items-center gap-2 text-sm font-medium text-cp-muted transition-colors hover:text-cp-ink"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          New project
        </Link>
        <p className="font-mono text-[11px] text-cp-muted">{project.publicId.slice(0, 8)}</p>
      </div>

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-14">
        {/* Video column */}
        <div className="animate-stagger animate-stagger-delay-1 mx-auto w-full max-w-[320px] lg:mx-0">
          <div className="overflow-hidden rounded-xl border border-cp-line bg-black">
            <div className="relative aspect-[9/16] w-full">
              {videoUrl ? (
                <video
                  src={videoUrl}
                  className="h-full w-full object-cover"
                  controls
                  playsInline
                />
              ) : null}
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {project.outputVideoUrl ? (
              <a
                href={`/api/creator/projects/${publicId}/download?type=zip`}
                className="cp-btn cp-btn-accent h-12 w-full"
              >
                <FileArchive className="h-4 w-4" />
                Download ZIP
              </a>
            ) : null}
            {project.outputVideoUrl ? (
              <a
                href={`/api/creator/projects/${publicId}/download?type=video`}
                className="cp-btn cp-btn-ghost h-11 w-full"
              >
                <Download className="h-4 w-4" />
                Download MP4
              </a>
            ) : null}
            {project.burnedVideoUrl ? (
              <a
                href={`/api/creator/projects/${publicId}/download?type=burned`}
                className="cp-btn cp-btn-ghost h-11 w-full"
              >
                <Captions className="h-4 w-4" />
                Burned subtitles MP4
              </a>
            ) : null}
            {project.hasSrt ? (
              <a
                href={`/api/creator/projects/${publicId}/download?type=srt`}
                className="cp-btn cp-btn-ghost h-11 w-full"
              >
                <FileText className="h-4 w-4" />
                Captions.srt
              </a>
            ) : null}
            {project.thumbnailUrl ? (
              <a
                href={`/api/creator/projects/${publicId}/download?type=thumbnail`}
                className="cp-btn cp-btn-ghost h-11 w-full"
              >
                <ImageIcon className="h-4 w-4" />
                Cover thumbnail
              </a>
            ) : null}
            {hasCopyPack ? (
              <a
                href={`/api/creator/projects/${publicId}/download?type=captions`}
                className="cp-btn cp-btn-ghost h-11 w-full"
              >
                <FileText className="h-4 w-4" />
                Captions.txt
              </a>
            ) : null}
          </div>

          {project.thumbnailUrl ? (
            <div className="mt-5 overflow-hidden rounded-xl border border-cp-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.thumbnailUrl}
                alt="Cover thumbnail"
                className="aspect-[9/16] w-full object-cover"
              />
            </div>
          ) : null}
        </div>

        {/* Copy column — flat, no nested cards */}
        <div className="animate-stagger animate-stagger-delay-2 min-w-0">
          <h1 className="cp-display text-3xl tracking-tight text-cp-ink sm:text-4xl">Ready</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-cp-muted">
            {hasCopyPack
              ? `Download the ZIP package (video${project.hasSrt ? ", SRT" : ""}, captions${project.thumbnailUrl ? ", thumbnail" : ""}${project.burnedVideoUrl ? ", burned subtitles" : ""}${hasPlatformVariants ? ", per-platform packs" : ""}), then copy text for posting.`
              : `Download your remixed video${project.thumbnailUrl ? " and thumbnail" : ""}${project.burnedVideoUrl ? " (plus burned subtitles)" : ""}. Enable Captions / Hashtags on Create to generate copy packs.`}
          </p>

          {hasPlatformVariants && hasCopyPack ? (
            <div className="mt-8 flex flex-wrap gap-2">
              {PLATFORM_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActivePlatform(tab.id);
                    setCopiedCaption(false);
                    setCopiedHashtags(false);
                    setCopiedHookIdx(null);
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activePlatform === tab.id
                      ? "border-cp-ink bg-cp-ink text-cp-bg"
                      : "border-cp-line bg-white text-cp-muted hover:border-cp-line hover:text-cp-ink dark:bg-[#0f1729]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}

          {hasCaption ? (
            <section className="mt-10 border-t border-cp-line pt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-cp-ink">
                  Caption{hasPlatformVariants ? ` · ${PLATFORM_TABS.find((t) => t.id === activePlatform)?.label}` : ""}
                </h2>
                <button
                  type="button"
                  onClick={() => handleCopy(activePack.caption, "caption")}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-cp-muted hover:text-cp-ink"
                >
                  {copiedCaption ? <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedCaption ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-[15px] leading-relaxed text-cp-ink">{activePack.caption}</p>
            </section>
          ) : null}

          {hasHashtags ? (
            <section className="mt-8 border-t border-cp-line pt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-cp-ink">Hashtags</h2>
                <button
                  type="button"
                  onClick={() => handleCopy(activePack.hashtags, "hashtags")}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-cp-muted hover:text-cp-ink"
                >
                  {copiedHashtags ? <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedHashtags ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-sm leading-relaxed text-cp-muted">{activePack.hashtags}</p>
            </section>
          ) : null}

          {hasHooks ? (
            <section className="mt-8 border-t border-cp-line pt-6">
              <h2 className="mb-4 text-sm font-semibold text-cp-ink">Hooks</h2>
              <ul className="space-y-0 divide-y divide-cp-line">
                {activePack.hookVariants.map((hook, index) => (
                  <li key={`${activePlatform}-${hook}`}>
                    <button
                      type="button"
                      onClick={() => handleCopy(hook, index)}
                      className="flex w-full items-start justify-between gap-4 py-3.5 text-left transition-colors hover:bg-cp-bg/80"
                    >
                      <span className="text-sm leading-relaxed text-cp-ink">{hook}</span>
                      {copiedHookIdx === index ? (
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                      ) : (
                        <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cp-muted" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {project.outputVideoUrl ? <PostToSocial publicId={publicId} /> : null}

          <div className="mt-10">
            <Link href="/create" className="text-sm font-medium text-cp-muted underline-offset-4 hover:text-cp-ink hover:underline">
              Create another →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectDetailView({ publicId }: { publicId: string }) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const { showToast } = useCreatorToast();
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    function announceStatus(status: string, title: string) {
      const prev = prevStatusRef.current;
      prevStatusRef.current = status;
      // Only fire on a real transition into a terminal state (skip first load).
      if (!prev || prev === status) return;

      if (status === "ready") {
        showToast("Your remix is ready to download.", "success");
        maybeNotifyBrowser("Your remix is ready", `“${title}” is done — open it to download.`);
      } else if (status === "failed") {
        showToast("Generation failed — you can retry it.", "error");
        maybeNotifyBrowser("Generation failed", `“${title}” didn't finish. Open it to retry.`);
      }
    }

    async function poll() {
      const response = await creatorFetch(`/api/creator/projects/${publicId}`);
      const data = await response.json();
      if (active) {
        const next = data.project ?? null;
        setProject(next);
        setLoading(false);
        if (next?.status) announceStatus(next.status, next.title ?? "Your remix");
      }
    }

    poll();
    const interval = window.setInterval(poll, 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [publicId, showToast]);

  async function handleRetry() {
    if (retrying) return;
    setRetrying(true);
    try {
      const response = await creatorFetch(`/api/creator/projects/${publicId}/retry`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Retry failed");
      }
      setProject(data.project ?? null);
      showToast("Retry queued — regenerating your video.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Retry failed";
      showToast(message, "error");
    } finally {
      setRetrying(false);
    }
  }

  const view = useMemo(() => {
    if (!project) return null;
    if (project.status === "ready") return "results";
    if (project.status === "failed") return "failed";
    return "processing";
  }, [project]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cp-muted" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center animate-stagger">
        <p className="cp-display text-xl font-semibold text-cp-ink">Project not found.</p>
        <Link href="/projects" className="cp-btn-ghost mt-6 inline-flex rounded-2xl px-4 py-2 text-sm">
          Back to projects
        </Link>
      </div>
    );
  }

  if (view === "results") {
    return <ResultsPanel project={project} publicId={publicId} />;
  }

  if (view === "failed") {
    return (
      <div className="mx-auto max-w-xl px-4 pb-10 sm:px-6">
        <ProcessingPanel project={project} />
        <div className="animate-slide-up -mt-4 flex flex-col items-center gap-3 px-2">
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="cp-btn cp-btn-accent w-full max-w-sm"
          >
            {retrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            {retrying ? "Retrying…" : "Retry video generation"}
          </button>
          <Link
            href="/create"
            className="text-sm font-semibold text-cp-muted underline decoration-cp-line underline-offset-4 transition-colors hover:text-cp-ink"
          >
            Or start a new upload
          </Link>
        </div>
      </div>
    );
  }

  return <ProcessingPanel project={project} />;
}
