"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { ThemeSelector } from "@/components/theme-selector";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password, next: nextPath }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Sign in failed");
        return;
      }

      router.push(data.redirect ?? "/admin");
      router.refresh();
    } catch {
      setError("Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
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

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
            <Building2 size={22} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-extrabold leading-none tracking-tight">CrossPost</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400">
              Ops dashboard
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <h2 className="text-3xl font-extrabold leading-[1.15] tracking-tight xl:text-4xl">
            Operator access to the remix engine.
          </h2>
          <p className="text-sm leading-relaxed text-slate-400">
            Manage runs, queue, models, sources, and creator product ops from one console.
          </p>
          <div className="flex gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10">
              <ShieldCheck size={18} className="text-sky-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Role-gated controls</p>
              <p className="mt-0.5 text-xs text-slate-400">Admin and operator sessions with audit trail.</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-slate-500">
          © {new Date().getFullYear()} CrossPost · Internal use only
        </p>
      </aside>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#f8fafc] p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="relative z-10 w-full max-w-[420px]">
          <div className="mb-8 lg:hidden">
            <p className="text-base font-extrabold text-slate-900">CrossPost Ops</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Operator sign in
            </p>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Sign in with your operator credentials to open the dashboard.
            </p>
          </div>

          <div className="mb-4">
            <ThemeSelector />
          </div>

          <form
            onSubmit={onSubmit}
            className="space-y-5 rounded-3xl border border-slate-200/80 bg-white p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)]"
          >
            {error ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
              >
                {error}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label htmlFor="ops-username" className="text-xs font-semibold text-slate-700">
                Username
              </label>
              <div className="relative group">
                <UserRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600" />
                <input
                  id="ops-username"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ops-password" className="text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600" />
                <input
                  id="ops-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pl-10 pr-12 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Admin: <code className="font-mono">admin</code> · Operator:{" "}
              <code className="font-mono">operator</code>
            </p>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:from-blue-700 hover:to-blue-800 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Sign in to dashboard
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
