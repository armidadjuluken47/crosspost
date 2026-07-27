"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { creatorFetch } from "@/lib/creator-api";
import { useCreatorAuth } from "@/components/creator/creator-auth-provider";

type InvitePreview = {
  email: string;
  role: string;
  status: string;
  workspace: { publicId: string; name: string };
};

export function InviteAcceptView({ token }: { token: string }) {
  const router = useRouter();
  const { loading: authLoading, authenticated, firebaseRequired, user, signInWithGoogle } =
    useCreatorAuth();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoadingInvite(true);
      try {
        const response = await fetch(`/api/creator/invites/${encodeURIComponent(token)}`);
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Invite not found");
          setInvite(null);
          return;
        }
        setInvite(data);
        setError(null);
      } catch {
        setError("Failed to load invite");
      } finally {
        setLoadingInvite(false);
      }
    })();
  }, [token]);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const response = await creatorFetch(
        `/api/creator/invites/${encodeURIComponent(token)}/accept`,
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Failed to accept invite");
        return;
      }
      router.push("/projects");
      router.refresh();
    } catch {
      setError("Failed to accept invite");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || loadingInvite) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center text-sm text-cp-muted">
        Loading invite…
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <div className="cp-well p-8 text-center">
          <h1 className="text-xl font-semibold text-cp-ink">Invite unavailable</h1>
          <p className="mt-2 text-sm text-cp-muted">{error ?? "This invite link is invalid."}</p>
        </div>
      </div>
    );
  }

  const canAccept = invite.status === "pending";
  const emailMismatch =
    Boolean(user?.email) &&
    user!.email!.toLowerCase() !== invite.email.toLowerCase();

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="cp-well p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">Workspace invite</p>
        <h1 className="mt-2 text-2xl font-semibold text-cp-ink">{invite.workspace.name}</h1>
        <p className="mt-2 text-sm text-cp-muted">
          You&apos;ve been invited as <span className="font-medium text-cp-ink">{invite.role}</span>{" "}
          ({invite.email}).
        </p>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        {!canAccept ? (
          <p className="mt-6 text-sm text-cp-muted">
            This invite is <span className="font-medium">{invite.status}</span> and can no longer be
            accepted.
          </p>
        ) : firebaseRequired && !authenticated ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-cp-muted">Sign in with Google to join this workspace.</p>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="cp-btn cp-btn-accent w-full"
            >
              Sign in with Google
            </button>
          </div>
        ) : emailMismatch ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-amber-800">
              You&apos;re signed in as <span className="font-medium">{user?.email}</span>, but this
              invite was sent to <span className="font-medium">{invite.email}</span>. Switch accounts
              to accept.
            </p>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="cp-btn cp-btn-ghost w-full"
            >
              Switch Google account
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void accept()}
            className="cp-btn cp-btn-accent mt-6 w-full disabled:opacity-60"
          >
            {busy ? "Joining…" : "Accept invite"}
          </button>
        )}
      </div>
    </div>
  );
}
