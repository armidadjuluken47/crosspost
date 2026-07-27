"use client";

import { useState } from "react";
import { Loader2, Mail, ShieldCheck, Sparkles, X } from "lucide-react";
import { useCreatorAuth } from "./creator/creator-auth-provider";

export function AuthModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { signInWithGoogle, authError, firebaseRequired } = useCreatorAuth();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleGoogleSignIn() {
    setLoading(true);
    setLocalError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  const errorMessage = localError ?? authError;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-cp-ink/50 p-4 backdrop-blur-sm">
      <div className="animate-scale-up relative w-full max-w-[400px] rounded-2xl border border-cp-line bg-cp-card p-8 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-2xl border border-cp-line bg-cp-bg text-cp-muted transition-colors hover:bg-black/5 hover:text-cp-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mt-2 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-cp-ink">
            <div className="h-4 w-4 rotate-45 border-2 border-white bg-cp-ink" />
          </div>
          <span className="inline-flex items-center gap-1 rounded-2xl bg-cp-accent/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-cp-accent">
            <Sparkles className="h-2 w-2" /> Start Cloning Now
          </span>
          <h3 className="cp-display mt-3 text-xl font-semibold tracking-tight text-cp-ink">
            Sign in to CrossPost AI
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-cp-muted">
            Use Google to save projects, sync your identity, and manage billing across devices.
          </p>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-cp-accent/20 bg-cp-accent/10 px-4 py-3 text-left text-xs text-cp-accent">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="cp-btn cp-btn-accent w-full py-3.5"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4 fill-current text-white" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.71 0 3.28.61 4.5 1.643l2.357-2.357C17.657 1.83 15.114 1 12.24 1c-5.523 0-10 4.477-10 10s4.477 10 10 10c5.753 0 9.56-4.04 9.56-9.714 0-.643-.07-1.272-.2-1.857H12.24z" />
              </svg>
            )}
            Continue with Google
          </button>

          {!firebaseRequired ? (
            <button type="button" onClick={onClose} className="cp-btn cp-btn-ghost w-full">
              <Mail className="h-3.5 w-3.5" /> Continue in dev mode
            </button>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-cp-line pt-5 text-[10px] leading-none text-cp-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-cp-success" /> Secure Google authentication
        </div>
      </div>
    </div>
  );
}
