"use client";

import {
  ArrowRight,
  Clapperboard,
  Loader2,
  Sparkles,
  Subtitles,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    icon: Clapperboard,
    title: "Face-swap remix",
    desc: "Clone viral shorts with your identity in minutes.",
  },
  {
    icon: Subtitles,
    title: "Captions & packs",
    desc: "Whisper transcripts plus platform-ready caption packs.",
  },
  {
    icon: Zap,
    title: "Batch & ship",
    desc: "Remix up to 10 reels at once and download a full ZIP.",
  },
] as const;

export function LoginGate({ onSignIn, loading }: { onSignIn: () => void; loading?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex min-h-[100svh]">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#070c1a] p-12 text-white lg:flex lg:w-[52%] xl:p-16">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(37, 99, 235, 0.45) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(14, 165, 233, 0.25) 0%, transparent 50%), linear-gradient(160deg, #070c1a 0%, #0f172a 45%, #1e3a5f 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-600/30">
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <p className="cp-display text-lg leading-none text-white">CrossPost</p>
              <p className="cp-label mt-1 text-[10px] tracking-[0.2em] !text-indigo-300">
                Creator studio
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-10">
          <div>
            <h2 className="cp-display text-3xl leading-[1.15] text-white xl:text-4xl">
              Clone viral shorts. Swap the face. Ship captions.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Secure access to remix projects, discovery, batch jobs, and agency workspaces.
            </p>
          </div>

          <ul className="space-y-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                  <Icon size={18} className="text-sky-300" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-[11px] text-slate-500">
          © {new Date().getFullYear()} CrossPost · All rights reserved.
        </p>
      </aside>

      {/* Sign-in panel */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-cp-bg p-6 sm:p-10">
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10 w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-md">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="cp-display text-base">CrossPost</p>
              <p className="cp-label text-[10px] text-cp-accent">Creator studio</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="cp-display text-2xl sm:text-3xl">Welcome back</h1>
            <p className="mt-2 text-sm leading-relaxed text-cp-muted">
              Sign in with Google to open your creator dashboard.
            </p>
          </div>

          <div className="cp-well space-y-5 p-8">
            <button
              type="button"
              onClick={onSignIn}
              disabled={loading}
              className="cp-btn cp-btn-accent flex w-full py-3.5 text-sm disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden>
                    <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.71 0 3.28.61 4.5 1.643l2.357-2.357C17.657 1.83 15.114 1 12.24 1c-5.523 0-10 4.477-10 10s4.477 10 10 10c5.753 0 9.56-4.04 9.56-9.714 0-.643-.07-1.272-.2-1.857H12.24z" />
                  </svg>
                  Continue with Google
                  <ArrowRight size={18} className="opacity-90" />
                </>
              )}
            </button>

            <p className="text-center text-[11px] leading-relaxed text-cp-muted">
              By continuing you agree to use CrossPost for content you have rights to remix.
            </p>
          </div>

          <p className="mt-8 text-center text-[11px] text-cp-muted">
            Authorized creators only. Project activity may be logged for support.
          </p>
        </div>
      </main>
    </div>
  );
}
