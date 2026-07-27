"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowRight,
  AudioWaveform,
  BadgeCheck,
  Captions,
  Check,
  ChevronDown,
  Clock,
  CloudUpload,
  Download,
  Gift,
  Headphones,
  Heart,
  HelpCircle,
  ImageIcon,
  Link2,
  Loader2,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Music,
  Play,
  PlayCircle,
  Rocket,
  ScanFace,
  Send,
  ShieldCheck,
  Smartphone,
  Smile,
  Sparkles,
  Wand2,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { BeforeAfterVideoSlider } from "@/components/landing/before-after-video-slider";
import { useCreatorAuth } from "@/components/creator/creator-auth-provider";
import { useCreatorToast } from "@/components/creator/creator-toast";
import { GenerateAvatarModal } from "@/components/generate-avatar-modal";
import { PricingModal } from "@/components/pricing-modal";
import { creatorFetch } from "@/lib/creator-api";

type BrandIconProps = { className?: string };

const TIKTOK_NOTE =
  "M12.9 2h3.03c.18 1.5 1 2.79 2.2 3.57.72.47 1.57.75 2.47.79v3.06a7.3 7.3 0 0 1-4.4-1.47v6.28a5.79 5.79 0 1 1-5.79-5.79c.31 0 .62.03.92.08v3.2a2.62 2.62 0 1 0 1.84 2.5V2z";

function TikTokIcon({ className }: BrandIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={TIKTOK_NOTE} fill="#25F4EE" transform="translate(-1 0.7)" />
      <path d={TIKTOK_NOTE} fill="#FE2C55" transform="translate(1 -0.7)" />
      <path d={TIKTOK_NOTE} fill="#ffffff" />
    </svg>
  );
}

function InstagramIcon({ className }: BrandIconProps) {
  const id = useId();
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset="0.25" stopColor="#FA7E1E" />
          <stop offset="0.5" stopColor="#D62976" />
          <stop offset="0.75" stopColor="#962FBF" />
          <stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" stroke={`url(#${id})`} strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" stroke={`url(#${id})`} strokeWidth="2" />
      <circle cx="17.4" cy="6.6" r="1.15" fill={`url(#${id})`} />
    </svg>
  );
}

function YouTubeIcon({ className }: BrandIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="1.5" y="5" width="21" height="14" rx="4.2" fill="#FF0000" />
      <path d="M10 8.4 16 12l-6 3.6z" fill="#ffffff" />
    </svg>
  );
}

function LinkedInIcon({ className }: BrandIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#0A66C2" />
      <path
        fill="#ffffff"
        d="M7.2 9.5H4.85V19H7.2V9.5zM6.03 5.3a1.37 1.37 0 1 0 0 2.74 1.37 1.37 0 0 0 0-2.74zM19.2 19h-2.35v-4.64c0-1.1-.39-1.86-1.38-1.86-.75 0-1.2.5-1.4.99-.07.17-.09.42-.09.66V19h-2.35s.03-7.76 0-8.56h2.35v1.21c.31-.48.87-1.17 2.12-1.17 1.55 0 2.7 1.01 2.7 3.18V19z"
      />
    </svg>
  );
}

const HERO_DEMO = {
  beforeSrc: "/demo/millie2-source.mp4",
  afterSrc: "/demo/millie2-final.mp4",
  beforePoster: "/demo/millie2-source-poster.jpg",
  afterPoster: "/demo/millie2-final-poster.jpg",
} as const;

const HERO_FEATURES = [
  {
    icon: Smile,
    title: "AI Face Clone",
    body: "Ultra-realistic results that match you.",
  },
  {
    icon: AudioWaveform,
    title: "Keep Everything",
    body: "Motion, lighting & audio, all intact.",
  },
  {
    icon: Captions,
    title: "Auto Captions",
    body: "Accurate captions, ready to post.",
  },
  {
    icon: Rocket,
    title: "Post Everywhere",
    body: "TikTok, Reels, Shorts & more.",
  },
] as const;

const HERO_TRUST = [
  { icon: ShieldCheck, label: "No credit card" },
  { icon: Gift, label: "3 free videos" },
  { icon: Zap, label: "Ready in minutes" },
] as const;

const STEPS = [
  {
    n: "1",
    icon: CloudUpload,
    tile: "",
    title: "Drop your content",
    body: "Upload a photo or source video, or paste a link from TikTok, Instagram, or YouTube.",
    chips: [
      { icon: TikTokIcon, label: "TikTok" },
      { icon: InstagramIcon, label: "Instagram" },
      { icon: YouTubeIcon, label: "YouTube" },
    ],
  },
  {
    n: "2",
    icon: Wand2,
    tile: "lp-icon-tile-2",
    title: "AI does the magic",
    body: "Our AI clones your face, keeps the motion, lighting, and audio, and generates captions.",
    chips: [
      { icon: ScanFace, label: "Face clone" },
      { icon: Captions, label: "Captions" },
      { icon: Download, label: "HD Export" },
    ],
  },
  {
    n: "3",
    icon: Send,
    tile: "lp-icon-tile-3",
    title: "Post everywhere",
    body: "Get platform-ready shorts optimized for TikTok, Reels, YouTube Shorts, LinkedIn & more.",
    chips: [
      { icon: TikTokIcon, label: "TikTok" },
      { icon: InstagramIcon, label: "Reels" },
      { icon: YouTubeIcon, label: "YouTube" },
      { icon: LinkedInIcon, label: "LinkedIn" },
      { icon: MoreHorizontal, label: "" },
    ],
  },
] as const;

const HOW_TRUST = [
  { icon: Zap, title: "Ready in minutes", body: "From upload to export" },
  { icon: Lock, title: "Secure & private", body: "Your content stays yours" },
  { icon: BadgeCheck, title: "No watermarks", body: "Clean, professional results" },
  { icon: Heart, title: "Loved by creators", body: "10,000+ creators and growing" },
] as const;

const PRICING_TRUST = [
  { icon: Lock, label: "Secure payments" },
  { icon: XCircle, label: "Cancel anytime" },
  { icon: ShieldCheck, label: "Your content is private" },
  { icon: Headphones, label: "24/7 creator support" },
] as const;

const FAQ_ICONS = [MessageCircle, Gift, PlayCircle, Music, Clock, Smartphone] as const;

const FAQS = [
  {
    q: "What is CrossPost?",
    a: "CrossPost clones a viral short with your face and drafts captions so you can repost — movement, lighting, and audio stay intact; only the identity changes.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. You get three free videos to try the full loop. Upgrade anytime for unlimited generation.",
  },
  {
    q: "Which videos can I use?",
    a: "Paste a public TikTok, Instagram Reel, or YouTube Shorts URL — or upload your own MP4 / MOV.",
  },
  {
    q: "Does the original audio stay?",
    a: "Yes. We preserve original audio, body motion, and framing. Source on-screen captions are removed so your remix stays clean.",
  },
  {
    q: "How long does a render take?",
    a: "Most jobs finish in a few minutes depending on length and queue. You can track progress on the project page.",
  },
  {
    q: "Do I need to download an app?",
    a: "No. CrossPost runs in your browser — sign in with Google and generate.",
  },
] as const;

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

function FaqItem({
  q,
  a,
  icon: Icon,
}: {
  q: string;
  a: string;
  icon: (typeof FAQ_ICONS)[number];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lp-faq-item">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-4 text-left"
        aria-expanded={open}
      >
        <span className="lp-faq-ic">
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 text-[15px] font-semibold text-white">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--lp-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <p className="px-4 pb-4 pl-[3.75rem] text-sm leading-relaxed text-[var(--lp-muted)]">{a}</p>
      ) : null}
    </div>
  );
}

export function LandingPage() {
  const router = useRouter();
  const { showToast } = useCreatorToast();
  const {
    authenticated,
    user,
    billing,
    signInWithGoogle,
    signOut,
    refreshSession,
  } = useCreatorAuth();

  const [facePhoto, setFacePhoto] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [burnSubtitles, setBurnSubtitles] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [faceDragOver, setFaceDragOver] = useState(false);
  const [videoDragOver, setVideoDragOver] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);

  const faceInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const createRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ids = ["how", "pricing", "faq"];
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.2, 0.5, 1] },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinkClass = (id: string) =>
    `lp-nav-link relative hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:inline-flex sm:items-center ${
      activeSection === id ? "text-[var(--lp-accent)]" : "text-white/70 hover:text-white"
    }`;

  function setFaceFile(file: File) {
    setFacePhoto(file);
    setFacePreview(URL.createObjectURL(file));
  }

  function setVideoFile(file: File) {
    setVideo(file);
    setVideoTitle(file.name.replace(/\.[^/.]+$/, ""));
    setVideoPreview(URL.createObjectURL(file));
  }

  function clearFace() {
    setFacePhoto(null);
    setFacePreview(null);
    if (faceInputRef.current) faceInputRef.current.value = "";
  }

  function clearVideo() {
    setVideo(null);
    setVideoPreview(null);
    setVideoTitle("");
    setVideoUrlInput("");
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  function scrollToCreate() {
    createRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function ensureSignedIn() {
    if (authenticated) return true;
    setSigningIn(true);
    try {
      await signInWithGoogle();
      return true;
    } catch {
      showToast("Sign in to continue.", "error");
      return false;
    } finally {
      setSigningIn(false);
    }
  }

  async function handleAccountSignIn() {
    if (authenticated) {
      router.push("/account");
      return;
    }
    const ok = await ensureSignedIn();
    if (ok) router.push("/account");
  }

  async function handlePasteUrl(event: React.FormEvent) {
    event.preventDefault();
    if (!videoUrlInput.trim() || isDownloading) return;

    const ok = await ensureSignedIn();
    if (!ok) return;

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
    if (!facePhoto || !video || loading) return;

    const ok = await ensureSignedIn();
    if (!ok) return;

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
      form.append("generateCaptions", "true");
      form.append("generateHashtags", "true");
      form.append("generateSubtitles", burnSubtitles ? "true" : "false");
      if (burnSubtitles) {
        form.append("subtitleStyle", "minimal");
      }
      form.append("swapTier", "standard");

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

  const canGenerate = Boolean(facePhoto && video);
  const ctaLabel = !facePhoto && !video
    ? "Upload a photo & video"
    : !facePhoto
      ? "Upload a photo"
      : !video
        ? "Upload a video"
        : loading
          ? "Generating…"
          : "Generate remix";

  return (
    <div className="landing-crosspost relative min-h-screen">
      <div className="lp-atmosphere" aria-hidden />

      <header
        className={`lp-header-dark fixed inset-x-0 top-0 z-30 transition-colors ${
          scrolled ? "lp-header-scrolled" : ""
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark className="h-8 w-8" gradientId="landing-nav-mark" />
            <span className="cp-display text-lg font-bold tracking-tight text-white">CrossPost</span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#how" className={navLinkClass("how")}>
              How it works
              {activeSection === "how" ? <span className="lp-nav-underline" /> : null}
            </a>
            <a href="#pricing" className={navLinkClass("pricing")}>
              Pricing
              {activeSection === "pricing" ? <span className="lp-nav-underline" /> : null}
            </a>
            <Link
              href="/create"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white sm:inline-flex"
            >
              Studio
              <span className="lp-badge-new">NEW</span>
            </Link>

            {authenticated ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="lp-nav-ghost ml-1"
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                disabled={signingIn}
                onClick={() => void handleAccountSignIn()}
                className="lp-nav-ghost ml-1"
              >
                {signingIn ? "Signing in…" : "Sign in"}
              </button>
            )}
            <button type="button" onClick={scrollToCreate} className="lp-nav-cta">
              Get started
            </button>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero — brand first + real before/after demo */}
        <section className="lp-hero relative flex min-h-screen flex-col justify-center overflow-hidden">
          <div className="lp-hero-grid" aria-hidden />
          <div className="lp-hero-orb lp-hero-orb-1" aria-hidden />
          <div className="lp-hero-orb lp-hero-orb-2" aria-hidden />
          <div className="lp-hero-orb lp-hero-orb-3" aria-hidden />
          <Sparkles className="lp-hero-spark lp-hero-spark-1" aria-hidden />
          <Sparkles className="lp-hero-spark lp-hero-spark-2" aria-hidden />

          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-10 pt-24 sm:px-6 sm:pt-24">
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-14">
              {/* Left — message */}
              <div className="max-w-xl">
                <div className="lp-rise lp-badge">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI-powered video cloning
                </div>
                <h1 className="lp-rise lp-rise-delay-1 cp-display mt-6 text-5xl font-extrabold leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-[4.25rem]">
                  Clone viral shorts{" "}
                  <span className="lp-gradient-text">with your face.</span>
                </h1>
                <div className="lp-rise lp-rise-delay-2 mt-6 space-y-1 text-base leading-relaxed text-white/60 sm:text-lg">
                  <p>Keep the motion, lighting, and audio.</p>
                  <p>Swap the identity.</p>
                  <p>Walk away with captions ready to post.</p>
                </div>
                <div className="lp-rise lp-rise-delay-3 mt-8 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={scrollToCreate} className="lp-cta-primary gap-2">
                    Start free — 3 videos
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <a href="#how" className="lp-cta-ghost">
                    <span className="lp-cta-ghost-icon">
                      <Play className="h-3 w-3" fill="currentColor" />
                    </span>
                    How it works
                  </a>
                </div>
                <div className="lp-rise lp-rise-delay-3 mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-white/55">
                  {HERO_TRUST.map(({ icon: Icon, label }) => (
                    <span key={label} className="inline-flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-[var(--lp-accent)]" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right — before/after proof */}
              <div className="lp-rise lp-rise-delay-2 relative flex justify-center lg:justify-end">
                <BeforeAfterVideoSlider
                  beforeSrc={HERO_DEMO.beforeSrc}
                  afterSrc={HERO_DEMO.afterSrc}
                  beforePoster={HERO_DEMO.beforePoster}
                  afterPoster={HERO_DEMO.afterPoster}
                  beforeLabel="Viral clip"
                  afterLabel="Your remix"
                />
              </div>
            </div>

            {/* Feature bar */}
            <div className="lp-rise lp-rise-delay-3 lp-featurebar mt-8">
              {HERO_FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="lp-feature">
                  <div className="lp-feature-head">
                    <span className="lp-feature-icon">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="lp-feature-title">{title}</p>
                  </div>
                  <p className="lp-feature-body">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Create tool — interaction surface */}
        <section ref={createRef} id="create" className="lp-section scroll-mt-20">
          <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="text-center">
              <h2 className="lp-h2">
                Make <span className="lp-gradient-text">one</span> now
              </h2>
              <p className="lp-sub mx-auto max-w-md">
                Upload a photo and source video, or paste a link.
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--lp-muted)]">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#4285F4]">
                  G
                </span>
                Google sign-in when you generate.
              </p>
            </div>

            {error ? (
              <div className="mx-auto mt-6 max-w-3xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
              <div className="lp-create-card">
                <div className="mb-4 flex items-center gap-3">
                  <span className="lp-faq-ic">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-bold text-white">Your photo</p>
                    <p className="text-xs text-[var(--lp-muted)]">Drop an image or click to upload</p>
                  </div>
                </div>

                {facePreview ? (
                  <div className="relative flex min-h-[9rem] flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={facePreview}
                      alt="Your photo"
                      className="h-32 w-24 rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearFace}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                      aria-label="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                      <Check className="h-4 w-4" />
                      Photo ready
                    </p>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => faceInputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        faceInputRef.current?.click();
                      }
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setFaceDragOver(true);
                    }}
                    onDragLeave={() => setFaceDragOver(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setFaceDragOver(false);
                      const file = event.dataTransfer.files?.[0];
                      if (file?.type.startsWith("image/")) setFaceFile(file);
                    }}
                    className={`lp-dropzone ${faceDragOver ? "lp-dropzone-active" : ""}`}
                  >
                    <CloudUpload className="h-7 w-7 text-[var(--lp-accent)]" strokeWidth={1.5} />
                    <p className="mt-1 text-sm font-medium text-white">Drag & drop your photo here</p>
                    <p className="text-xs">or click to browse</p>
                  </div>
                )}

                <div className="lp-divider">Or generate</div>
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(true)}
                  className="lp-btn-grad w-full"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate AI avatar
                </button>
              </div>

              <div className="lp-create-card">
                <div className="mb-4 flex items-center gap-3">
                  <span className="lp-faq-ic">
                    <Play className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-bold text-white">Source video</p>
                    <p className="text-xs text-[var(--lp-muted)]">Drop a video or click to upload</p>
                  </div>
                </div>

                {videoPreview ? (
                  <div className="relative flex min-h-[9rem] flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-4">
                    <video
                      src={videoPreview}
                      className="h-32 w-auto max-w-full rounded-xl object-cover"
                      muted
                      playsInline
                      controls={false}
                    />
                    <button
                      type="button"
                      onClick={clearVideo}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                      aria-label="Remove video"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                      <Check className="h-4 w-4" />
                      {videoTitle.slice(0, 28)}
                      {videoTitle.length > 28 ? "…" : ""}
                    </p>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => videoInputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        videoInputRef.current?.click();
                      }
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setVideoDragOver(true);
                    }}
                    onDragLeave={() => setVideoDragOver(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setVideoDragOver(false);
                      const file = event.dataTransfer.files?.[0];
                      if (file?.type.startsWith("video/")) setVideoFile(file);
                    }}
                    className={`lp-dropzone ${videoDragOver ? "lp-dropzone-active" : ""}`}
                  >
                    <CloudUpload className="h-7 w-7 text-[var(--lp-accent)]" strokeWidth={1.5} />
                    <p className="mt-1 text-sm font-medium text-white">Drag & drop your video here</p>
                    <p className="text-xs">or click to browse</p>
                  </div>
                )}

                <div className="lp-divider">Or paste link</div>
                <form onSubmit={handlePasteUrl} className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lp-muted)]" />
                    <input
                      type="url"
                      value={videoUrlInput}
                      onChange={(event) => setVideoUrlInput(event.target.value)}
                      placeholder="TikTok, IG, or YouTube URL"
                      className="lp-input-dark !pl-10"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!videoUrlInput.trim() || isDownloading}
                    className="lp-btn-grad shrink-0 disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
                  </button>
                </form>
              </div>
            </div>

            <input
              ref={faceInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setFaceFile(file);
              }}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setVideoFile(file);
              }}
            />

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setBurnSubtitles((v) => !v)}
                className="lp-toggle-row w-full text-left"
                aria-pressed={burnSubtitles}
              >
                <span className="flex items-center gap-3">
                  <span className="lp-faq-ic">
                    <Captions className="h-4 w-4" />
                  </span>
                  <span className="text-sm text-white/85">
                    Burn minimal subtitles into the video (also exports .srt).
                  </span>
                </span>
                <span className={`lp-switch ${burnSubtitles ? "lp-switch-on" : ""}`} aria-hidden />
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate || loading || signingIn}
              className="lp-cta-big mt-6"
            >
              {loading || signingIn ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CloudUpload className="h-5 w-5" />
              )}
              {signingIn ? "Signing in…" : ctaLabel}
            </button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-[var(--lp-muted)]">
              <Lock className="h-3.5 w-3.5" />
              {authenticated && user
                ? `Signed in as ${user.email ?? user.name}${
                    billing && !billing.unlimited && typeof billing.videosRemaining === "number"
                      ? ` · ${billing.videosRemaining} free left`
                      : ""
                  }`
                : "Your files are secure and encrypted. We'll never share your content."}
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="lp-section scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="text-center">
              <span className="lp-eyebrow">
                <Zap className="h-3.5 w-3.5" />
                Simple, fast, powerful
              </span>
              <h2 className="lp-h2">
                How it <span className="lp-gradient-text">works</span>
              </h2>
              <p className="lp-sub mx-auto max-w-xl">
                Turn one video into platform-perfect shorts in 3 easy steps.
              </p>
            </div>

            <div className="lp-steps relative mt-16 grid gap-6 md:grid-cols-3">
              <div className="lp-steps-line" aria-hidden />
              {STEPS.map((step) => (
                <div key={step.n} className="lp-card px-6 pb-7 pt-10 text-center">
                  <span className="lp-step-num">{step.n}</span>
                  <span className={`lp-icon-tile ${step.tile}`}>
                    <step.icon className="h-7 w-7" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-5 text-lg font-bold tracking-tight text-white">{step.title}</h3>
                  <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-[var(--lp-muted)]">
                    {step.body}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {step.chips.map((chip, i) => (
                      <span key={chip.label || i} className="lp-chip">
                        <chip.icon className="h-3.5 w-3.5" />
                        {chip.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="lp-truststrip mt-8">
              {HOW_TRUST.map(({ icon: Icon, title, body }) => (
                <div key={title} className="lp-trust-item">
                  <span className="lp-trust-ic">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="lp-trust-title">{title}</p>
                    <p className="lp-trust-body">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="lp-section scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="text-center">
              <span className="lp-eyebrow">
                <Sparkles className="h-3.5 w-3.5" />
                Start free. Upgrade when you&apos;re ready.
              </span>
              <h2 className="lp-h2">
                Simple pricing for <span className="lp-gradient-text">every creator</span>
              </h2>
              <p className="lp-sub mx-auto max-w-lg">Choose the plan that fits your content goals.</p>
            </div>

            <div className="mt-14 grid items-start gap-5 lg:grid-cols-3">
              <div className="lp-price-card">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--lp-accent)]">Free</p>
                <p className="mt-4">
                  <span className="lp-price-amount">$0</span>
                </p>
                <p className="mt-3 text-sm text-[var(--lp-muted)]">
                  Try CrossPost and explore the basics.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-white/85">
                  {["3 free videos to clone", "Captions & hashtags", "HD download"].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <span className="lp-price-check">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={scrollToCreate} className="lp-btn-ghost-dark mt-8 w-full">
                  Try free
                </button>
              </div>

              <div className="lp-price-card lp-price-card-featured relative">
                <span className="lp-badge-pop">
                  <Sparkles className="h-3 w-3" />
                  Popular
                </span>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--lp-accent)]">
                  Monthly
                </p>
                <p className="mt-4">
                  <span className="lp-price-amount">$99.99</span>
                  <span className="text-sm text-[var(--lp-muted)]"> /mo</span>
                </p>
                <p className="mt-3 text-sm text-[var(--lp-muted)]">Unlimited creativity. Cancel anytime.</p>
                <ul className="mt-6 space-y-3 text-sm text-white/85">
                  {["Unlimited videos", "Priority generation", "Full caption suite"].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <span className="lp-price-check">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setPricingOpen(true)}
                  className="lp-cta-big mt-8 !h-11"
                >
                  Get monthly
                </button>
              </div>

              <div className="lp-price-card">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--lp-accent)]">
                    Yearly
                  </p>
                  <span className="lp-badge-save">Save 17%</span>
                </div>
                <p className="mt-4">
                  <span className="lp-price-amount">$299</span>
                  <span className="text-sm text-[var(--lp-muted)]"> /yr</span>
                </p>
                <p className="mt-3 text-sm text-[var(--lp-muted)]">Best value for passionate creators.</p>
                <ul className="mt-6 space-y-3 text-sm text-white/85">
                  {["Unlimited videos", "Everything in Monthly", "Lower cost per month"].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <span className="lp-price-check">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setPricingOpen(true)}
                  className="lp-btn-ghost-dark mt-8 w-full"
                >
                  Go yearly
                </button>
              </div>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[var(--lp-muted)]">
              {PRICING_TRUST.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[var(--lp-accent)]" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="lp-section scroll-mt-20">
          <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="relative">
              <span className="lp-eyebrow">
                <MessageCircle className="h-3.5 w-3.5" />
                Got questions? We&apos;ve got answers.
              </span>
              <h2 className="lp-h2">
                <span className="lp-gradient-text">FAQ</span>
              </h2>
              <p className="lp-sub">Everything you need to know about CrossPost.</p>
              <HelpCircle
                className="pointer-events-none absolute -top-4 right-0 hidden h-24 w-24 text-[var(--lp-accent)] opacity-25 sm:block"
                strokeWidth={1}
                aria-hidden
              />
            </div>

            <div className="mt-10">
              {FAQS.map((item, i) => (
                <FaqItem
                  key={item.q}
                  q={item.q}
                  a={item.a}
                  icon={FAQ_ICONS[i % FAQ_ICONS.length]}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex flex-col items-center sm:items-start">
            <span className="flex items-center gap-2">
              <BrandMark className="h-7 w-7" gradientId="landing-footer-mark" />
              <span className="cp-display text-base font-bold tracking-tight text-white">CrossPost</span>
            </span>
            <p className="mt-2 text-xs text-[var(--lp-muted)]">
              © {new Date().getFullYear()} CrossPost. All rights reserved.
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <div className="flex items-center gap-5 text-sm text-[var(--lp-muted)]">
              <a href="#pricing" className="transition-colors hover:text-white">
                Pricing
              </a>
              <a href="#faq" className="transition-colors hover:text-white">
                FAQ
              </a>
              <Link href="/create" className="transition-colors hover:text-white">
                Studio
              </Link>
            </div>
            <div className="flex items-center gap-2.5">
              <a href="#" className="lp-social-ic" aria-label="TikTok">
                <TikTokIcon className="h-4 w-4" />
              </a>
              <a href="#" className="lp-social-ic" aria-label="Instagram">
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a href="#" className="lp-social-ic" aria-label="YouTube">
                <YouTubeIcon className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      <GenerateAvatarModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        onSetGeneratedFace={(imageUrl) => {
          setFacePreview(imageUrl);
          showToast("Preview only — upload a real photo file to generate.", "success");
        }}
      />
      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}
