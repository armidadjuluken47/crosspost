"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  HelpCircle,
  Lightbulb,
  Link as LinkIcon,
  Loader2,
  ScanFace,
  Sparkles,
  Upload,
  User,
  Video,
  X,
  Zap,
} from "lucide-react";

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.16 15.3a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.2 8.2 0 0 0 4.8 1.54V6.84a4.85 4.85 0 0 1-1.05-.15z" />
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
import { GenerateAvatarModal } from "./generate-avatar-modal";
import { PricingModal } from "./pricing-modal";
import { useCreatorToast } from "./creator/creator-toast";
import { useCreatorAuth } from "./creator/creator-auth-provider";
import { creatorFetch } from "@/lib/creator-api";
import {
  SUBTITLE_STYLE_LABELS,
  SUBTITLE_STYLES,
  SWAP_TIER_LABELS,
  type SubtitleStyle,
  type SwapTier,
} from "@crosspost/shared";

type RecentProject = {
  publicId: string;
  title: string;
  status: string;
};

/** Convert absolute asset URLs (e.g. http://127.0.0.1:3000/api/assets/…) to a same-origin path. */
function toSameOriginAssetPath(videoUrl: string): string {
  if (videoUrl.startsWith("/")) return videoUrl;
  try {
    const parsed = new URL(videoUrl);
    if (parsed.pathname.startsWith("/api/assets/")) return `${parsed.pathname}${parsed.search}`;
  } catch {
    // fall through
  }
  return videoUrl;
}

export function CreateProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useCreatorToast();
  const { billing, refreshSession } = useCreatorAuth();

  const [facePhoto, setFacePhoto] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [generateCaptions, setGenerateCaptions] = useState(false);
  const [generateHashtags, setGenerateHashtags] = useState(false);
  const [generateSubtitles, setGenerateSubtitles] = useState(false);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>("minimal");
  const [swapTier, setSwapTier] = useState<SwapTier>("quality");
  const [expressAvailable, setExpressAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [avatarResultUrl, setAvatarResultUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [batchUrls, setBatchUrls] = useState("");

  const faceInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    creatorFetch("/api/creator/options")
      .then((response) => response.json())
      .then((data) => {
        const tiers = (data.swapTiers ?? []) as Array<{ id: SwapTier; available: boolean }>;
        setExpressAvailable(tiers.some((tier) => tier.id === "express" && tier.available));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    creatorFetch("/api/creator/projects")
      .then((response) => response.json())
      .then((data) => setRecentProjects((data.projects ?? []).slice(0, 6)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const reelUrl = searchParams.get("reelUrl")?.trim();
    if (!reelUrl || videoPreview || isDownloading) return;

    setVideoUrlInput(reelUrl);
    setMode("single");

    void (async () => {
      setIsDownloading(true);
      setError(null);
      try {
        const response = await creatorFetch("/api/creator/import-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: reelUrl }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "URL import failed");
        }

        const imported = data.imported as {
          title: string;
          filename: string;
          videoUrl: string;
          videoKey?: string;
        };

        const mediaPath = imported.videoKey
          ? `/api/assets/${imported.videoKey}`
          : toSameOriginAssetPath(imported.videoUrl);

        const mediaResponse = await fetch(mediaPath);
        if (!mediaResponse.ok) {
          throw new Error("Downloaded video could not be loaded from storage");
        }

        const blob = await mediaResponse.blob();
        const file = new File([blob], imported.filename || "imported.mp4", {
          type: blob.type || "video/mp4",
        });

        setVideo(file);
        setVideoTitle(imported.title || file.name.replace(/\.[^/.]+$/, ""));
        setVideoPreview(URL.createObjectURL(file));
        showToast("Reel loaded from Discover — add your face to generate.", "success");
      } catch (importError) {
        const message =
          importError instanceof Error ? importError.message : "URL import failed";
        setError(message);
      } finally {
        setIsDownloading(false);
      }
    })();
  }, [searchParams, videoPreview, isDownloading, showToast]);

  useEffect(() => {
    if (avatarResultUrl) {
      setFacePreview(avatarResultUrl);
    }
  }, [avatarResultUrl]);

  const hasFaceFile = Boolean(facePhoto);

  function handleFaceSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFacePhoto(file);
    setFacePreview(URL.createObjectURL(file));
    setAvatarResultUrl(null);
  }

  function clearFace() {
    setFacePhoto(null);
    setFacePreview(null);
    setAvatarResultUrl(null);
    if (faceInputRef.current) faceInputRef.current.value = "";
  }

  function handleVideoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setVideo(file);
    setVideoTitle(file.name.replace(/\.[^/.]+$/, ""));
    setVideoPreview(URL.createObjectURL(file));
  }

  function clearVideo() {
    setVideo(null);
    setVideoPreview(null);
    setVideoTitle("");
    setVideoUrlInput("");
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  async function handlePasteUrl(event: React.FormEvent) {
    event.preventDefault();
    if (!videoUrlInput.trim() || isDownloading) return;

    setIsDownloading(true);
    setError(null);

    try {
      const response = await creatorFetch("/api/creator/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrlInput.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "URL import failed");
      }

      const imported = data.imported as {
        title: string;
        filename: string;
        videoUrl: string;
        videoKey?: string;
      };

      // Always load via same-origin path (avoids localhost vs 127.0.0.1 "Failed to fetch").
      const mediaPath = imported.videoKey
        ? `/api/assets/${imported.videoKey}`
        : toSameOriginAssetPath(imported.videoUrl);

      const mediaResponse = await fetch(mediaPath);
      if (!mediaResponse.ok) {
        throw new Error("Downloaded video could not be loaded from storage");
      }

      const blob = await mediaResponse.blob();
      const file = new File([blob], imported.filename || "imported.mp4", {
        type: blob.type || "video/mp4",
      });

      setVideo(file);
      setVideoTitle(imported.title || file.name.replace(/\.[^/.]+$/, ""));
      setVideoPreview(URL.createObjectURL(file));
      showToast("Reel imported — ready to generate.", "success");
    } catch (importError) {
      const raw =
        importError instanceof Error ? importError.message : "URL import failed";
      const message =
        raw === "Failed to fetch" || raw === "NetworkError when attempting to fetch resource."
          ? "Could not load the imported video in the browser. Retry, or upload an MP4."
          : raw;
      setError(message);
      showToast(message, "error");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleGenerate() {
    if (mode === "batch") {
      await handleGenerateBatch();
      return;
    }

    if (!facePhoto || !video || loading) return;

    if (
      billing &&
      !billing.unlimited &&
      typeof billing.videosRemaining === "number" &&
      billing.videosRemaining <= 0
    ) {
      setPricingOpen(true);
      setError("Free video quota used up. Upgrade to continue.");
      showToast("Free video quota used up. Upgrade to continue.", "error");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("facePhoto", facePhoto);
      form.append("video", video);
      form.append("rightsAttested", "true");
      form.append("title", videoTitle.trim() || "My remix");
      form.append("generateCaptions", String(generateCaptions));
      form.append("generateHashtags", String(generateHashtags));
      form.append("generateSubtitles", String(generateSubtitles));
      if (generateSubtitles) {
        form.append("subtitleStyle", subtitleStyle);
      }
      form.append("swapTier", swapTier);

      const response = await creatorFetch("/api/creator/projects", {
        method: "POST",
        body: form,
      });

      const data = await response.json();
      if (response.status === 402) {
        setPricingOpen(true);
        throw new Error(data.message ?? data.error ?? "Free video quota used up. Upgrade to continue.");
      }
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create project");
      }

      await refreshSession();
      showToast("Remix started — opening your project.", "success");
      router.push(`/projects/${data.project.publicId}`);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Something went wrong";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateBatch() {
    const urls = batchUrls
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!facePhoto || urls.length === 0 || loading) return;

    if (
      billing &&
      !billing.unlimited &&
      typeof billing.videosRemaining === "number" &&
      billing.videosRemaining < urls.length
    ) {
      setPricingOpen(true);
      setError(`Need ${urls.length} videos remaining for this batch.`);
      showToast(`Need ${urls.length} videos remaining for this batch.`, "error");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("facePhoto", facePhoto);
      form.append("urls", JSON.stringify(urls));
      form.append("rightsAttested", "true");
      form.append("generateCaptions", String(generateCaptions));
      form.append("generateHashtags", String(generateHashtags));
      form.append("generateSubtitles", String(generateSubtitles));
      if (generateSubtitles) {
        form.append("subtitleStyle", subtitleStyle);
      }
      form.append("swapTier", swapTier);

      const response = await creatorFetch("/api/creator/batches", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (response.status === 402) {
        setPricingOpen(true);
        throw new Error(data.message ?? data.error ?? "Free video quota used up. Upgrade to continue.");
      }
      if (!response.ok) {
        throw new Error(data.error ?? "Batch create failed");
      }

      await refreshSession();
      showToast(
        `Batch started — ${data.projects?.length ?? 0} project(s) queued.`,
        "success",
      );
      router.push(`/batches/${data.batch.publicId}`);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Something went wrong";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  const batchUrlCount = batchUrls
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;

  const disabledReason =
    mode === "batch"
      ? !hasFaceFile
        ? "photo"
        : batchUrlCount === 0
          ? "urls"
          : null
      : !hasFaceFile
        ? "photo"
        : !video
          ? "video"
          : null;

  return (
    <>
      <div className="pb-6">
        <header className="animate-stagger">
          <p className="cp-label">Studio</p>
          <div className="mt-1 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-600/25">
              <Sparkles className="h-4 w-4" />
            </span>
            <h1 className="cp-display text-2xl sm:text-3xl">New remix</h1>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-cp-muted">
            {mode === "batch"
              ? "One face photo, multiple Reel URLs — each becomes its own remix in one batch."
              : "Upload a face photo and a short video. We swap identity and draft captions."}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`cp-chip ${mode === "single" ? "cp-chip-active" : ""}`}
            >
              <User className="h-3.5 w-3.5" />
              Single
            </button>
            <button
              type="button"
              onClick={() => setMode("batch")}
              className={`cp-chip ${mode === "batch" ? "cp-chip-active" : ""}`}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Batch URLs
            </button>
          </div>
        </header>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {/* 1. Face photo */}
          <section
            className={`animate-stagger animate-stagger-delay-1 cp-well cp-well-static p-4 ${
              facePreview ? "border-emerald-300 dark:border-emerald-500/40" : "border-cp-line"
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <ScanFace className="h-4 w-4 text-cp-accent" />
                <p className="cp-section-label">
                  1. Face photo
                </p>
              </div>
              {facePreview ? (
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  <Lightbulb className="h-3 w-3" />
                  Best lighting works best
                </span>
              )}
            </div>

            {facePreview ? (
              <div className="flex items-center gap-4 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={facePreview}
                    alt="Face preview"
                    className="h-24 w-20 rounded-xl object-cover shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={clearFace}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-cp-ink text-cp-bg"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Ready</p>
                  <button
                    type="button"
                    onClick={() => faceInputRef.current?.click()}
                    className="mt-1 text-xs font-semibold text-cp-accent hover:underline"
                  >
                    Replace photo
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => faceInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-cp-line bg-cp-bg/80 px-4 py-8 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-500/10"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-cp-ink shadow-sm ring-1 ring-cp-line dark:bg-[#17223a]">
                  <Upload className="h-5 w-5" />
                </span>
                <span className="mt-3 text-sm font-bold text-cp-ink">Upload face photo</span>
                <span className="mt-1 text-xs text-cp-muted">
                  Clear selfie · face fills the frame
                </span>
              </button>
            )}

            <div className="mt-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-cp-muted">
                <HelpCircle className="h-3.5 w-3.5" />
                Need help?
              </span>
              {!facePreview ? (
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cp-accent hover:underline"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI generate
                </button>
              ) : null}
            </div>
          </section>

          {/* 2. Source / Batch */}
          {mode === "batch" ? (
            <section
              className={`animate-stagger animate-stagger-delay-2 cp-well cp-well-static p-4 ${
                batchUrlCount > 0 ? "border-emerald-300 dark:border-emerald-500/40" : "border-cp-line"
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-cp-accent" />
                  <p className="cp-section-label">2. Batch URLs</p>
                </div>
                <span className="text-[11px] font-semibold text-cp-muted">
                  {batchUrlCount > 0 ? `${batchUrlCount}/10` : "Max 10 · one per line"}
                </span>
              </div>
              <textarea
                value={batchUrls}
                onChange={(event) => setBatchUrls(event.target.value)}
                placeholder={
                  "https://www.instagram.com/reel/...\nhttps://www.instagram.com/reel/..."
                }
                rows={6}
                className="w-full resize-none rounded-xl border border-cp-line bg-cp-bg/80 px-3 py-2.5 font-mono text-xs text-cp-ink outline-none placeholder:text-cp-muted focus:border-cp-accent focus:bg-white dark:focus:bg-[#0f1729]"
              />
            </section>
          ) : (
            <section
              className={`animate-stagger animate-stagger-delay-2 cp-well cp-well-static p-4 ${
                videoPreview ? "border-emerald-300 dark:border-emerald-500/40" : "border-cp-line"
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-cp-accent" />
                  <p className="cp-section-label">2. Source video</p>
                </div>
                {videoPreview ? (
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <span className="text-[11px] font-semibold text-cp-muted">Max 1 min · MP4</span>
                )}
              </div>

              {isDownloading ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 py-8 dark:border-indigo-400/30 dark:bg-indigo-500/10">
                  <Loader2 className="h-6 w-6 animate-spin text-cp-accent" />
                  <p className="mt-2 text-sm font-bold text-cp-ink">Fetching reel…</p>
                  <p className="mt-0.5 text-xs text-cp-muted">Usually 15–60 seconds</p>
                </div>
              ) : videoPreview ? (
                <div className="flex items-center gap-4 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <div className="relative aspect-[9/16] w-16 shrink-0 overflow-hidden rounded-lg bg-black shadow-sm">
                    <video
                      src={videoPreview}
                      className="h-full w-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                    <button
                      type="button"
                      onClick={clearVideo}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {videoTitle || "Ready"}
                    </p>
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="mt-1 text-xs font-semibold text-cp-accent hover:underline"
                    >
                      Replace video
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-cp-line bg-cp-bg/80 px-4 py-5 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-500/10"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-cp-ink shadow-sm ring-1 ring-cp-line dark:bg-[#17223a]">
                      <Video className="h-5 w-5" />
                    </span>
                    <span className="mt-2.5 text-sm font-bold text-cp-ink">Upload MP4</span>
                    <span className="mt-0.5 text-xs text-cp-muted">Vertical short · about 1 min</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-cp-line" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cp-muted">
                      or
                    </span>
                    <div className="h-px flex-1 bg-cp-line" />
                  </div>

                  <form onSubmit={handlePasteUrl} className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cp-muted" />
                      <input
                        type="url"
                        placeholder="Paste Instagram, TikTok, or YouTube URL"
                        value={videoUrlInput}
                        onChange={(event) => setVideoUrlInput(event.target.value)}
                        disabled={isDownloading}
                        className="w-full rounded-xl border border-cp-line bg-white py-2.5 pl-9 pr-3 text-xs text-cp-ink outline-none placeholder:text-cp-muted focus:border-cp-accent disabled:opacity-60 dark:bg-[#0f1729]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isDownloading || !videoUrlInput.trim()}
                      className="cp-btn h-[42px] w-[42px] shrink-0 p-0 disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  </form>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 text-[11px] text-cp-muted">
                <TikTokGlyph className="h-3.5 w-3.5 text-cp-ink" />
                <YouTubeGlyph className="h-3.5 w-3.5 text-red-500" />
                <span>IG · TikTok · YouTube Shorts URLs supported</span>
              </div>
            </section>
          )}
        </div>

        <input
          ref={faceInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFaceSelect}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime"
          className="hidden"
          onChange={handleVideoSelect}
        />

        {/* 3. AI Output */}
        <section className="animate-stagger animate-stagger-delay-3 cp-well cp-well-static mt-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cp-accent" />
              <p className="cp-section-label">
                3. AI output
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                {
                  checked: generateCaptions,
                  toggle: () => setGenerateCaptions(!generateCaptions),
                  title: "Captions",
                },
                {
                  checked: generateHashtags,
                  toggle: () => setGenerateHashtags(!generateHashtags),
                  title: "Hashtags",
                },
                {
                  checked: generateSubtitles,
                  toggle: () => setGenerateSubtitles(!generateSubtitles),
                  title: "Subtitles",
                },
              ].map((option) => (
                <button
                  key={option.title}
                  type="button"
                  onClick={option.toggle}
                  className={`cp-chip ${option.checked ? "cp-chip-active" : ""}`}
                >
                  {option.title}
                </button>
              ))}
              {generateSubtitles
                ? SUBTITLE_STYLES.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setSubtitleStyle(style)}
                      className={`cp-chip ${subtitleStyle === style ? "cp-chip-soft-active" : ""}`}
                    >
                      {SUBTITLE_STYLE_LABELS[style]}
                    </button>
                  ))
                : null}
              {expressAvailable
                ? (["quality", "express"] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setSwapTier(tier)}
                      className={`cp-chip ${swapTier === tier ? "cp-chip-soft-active" : ""}`}
                    >
                      {SWAP_TIER_LABELS[tier]}
                    </button>
                  ))
                : null}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={Boolean(disabledReason) || loading}
                className="cp-btn cp-btn-accent h-12 w-full text-sm disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 fill-current" />
                )}
                {loading && (mode === "batch" ? "Starting batch…" : "Uploading…")}
                {!loading && disabledReason === "photo" && "Add a face photo"}
                {!loading && disabledReason === "video" && "Add a source video"}
                {!loading && disabledReason === "urls" && "Add Reel URLs"}
                {!loading &&
                  !disabledReason &&
                  (mode === "batch" ? `Generate batch (${batchUrlCount})` : "Generate remix")}
              </button>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 p-4 dark:border-indigo-400/20 dark:bg-indigo-500/10">
              <div className="mb-2 flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                <Lightbulb className="h-4 w-4" />
                <p className="text-xs font-extrabold uppercase tracking-wider">
                  Tips for best results
                </p>
              </div>
              <ul className="space-y-1.5 text-xs leading-relaxed text-indigo-900/80 dark:text-indigo-200/80">
                <li>• Use a clear, front-facing face photo</li>
                <li>• Prefer vertical shorts under ~60 seconds</li>
                <li>• Good lighting beats heavy filters</li>
              </ul>
            </div>
          </div>
        </section>

        {recentProjects.length > 0 ? (
          <div className="mt-8 border-t border-cp-line pt-5">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-cp-muted">
                Recent
              </h2>
              <Link
                href="/projects"
                className="text-xs font-semibold text-cp-accent hover:underline"
              >
                View all
              </Link>
            </div>
            <ul className="mt-2 divide-y divide-cp-line">
              {recentProjects.map((project) => (
                <li key={project.publicId}>
                  <Link
                    href={`/projects/${project.publicId}`}
                    className="group flex items-center justify-between gap-4 py-2.5"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-cp-ink group-hover:underline">
                      {project.title}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${
                        project.status === "ready"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : project.status === "failed"
                            ? "text-rose-600"
                            : "text-cp-muted"
                      }`}
                    >
                      {project.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <GenerateAvatarModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        onSetGeneratedFace={(url) => {
          setAvatarResultUrl(url);
          showToast("Avatar loaded — upload a photo file before generating.", "success");
        }}
      />
      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />
    </>
  );
}
