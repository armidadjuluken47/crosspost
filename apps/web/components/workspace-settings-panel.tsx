"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { creatorFetch } from "@/lib/creator-api";

type WorkspaceRow = {
  publicId: string;
  name: string;
  isPersonal: boolean;
  role: string;
  memberCount: number;
};

type MemberRow = {
  userId: string;
  role: string;
  email: string | null;
};

type InviteRow = {
  id: number;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  inviteUrl?: string;
};

export function WorkspaceSettingsPanel() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [activePublicId, setActivePublicId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [newName, setNewName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const active = workspaces.find((ws) => ws.publicId === activePublicId) ?? workspaces[0];

  async function loadWorkspaces() {
    const response = await creatorFetch("/api/creator/workspaces");
    const data = await response.json();
    setWorkspaces(data.workspaces ?? []);
    setActivePublicId(data.activePublicId ?? null);
    return data.activePublicId as string | null;
  }

  async function loadMembers(workspacePublicId: string) {
    const response = await creatorFetch(`/api/creator/workspaces/${workspacePublicId}`);
    const data = await response.json();
    if (response.ok) {
      setMembers(data.members ?? []);
    }
  }

  async function loadInvites(workspacePublicId: string) {
    const response = await creatorFetch(`/api/creator/workspaces/${workspacePublicId}/invites`);
    const data = await response.json();
    if (response.ok) {
      setInvites(data.invites ?? []);
    } else {
      setInvites([]);
    }
  }

  useEffect(() => {
    void loadWorkspaces().then((id) => {
      if (id) {
        void loadMembers(id);
        void loadInvites(id);
      }
    });
  }, []);

  useEffect(() => {
    if (!activePublicId) return;
    void loadMembers(activePublicId);
    void loadInvites(activePublicId);
    setLastInviteUrl(null);
    setMessage(null);
  }, [activePublicId]);

  async function createWorkspace() {
    setError(null);
    setBusy(true);
    try {
      const response = await creatorFetch("/api/creator/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Failed to create workspace");
        return;
      }
      setNewName("");
      await loadWorkspaces();
    } finally {
      setBusy(false);
    }
  }

  async function inviteMember() {
    if (!activePublicId) return;
    setError(null);
    setMessage(null);
    setLastInviteUrl(null);
    setBusy(true);
    try {
      const response = await creatorFetch(`/api/creator/workspaces/${activePublicId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Failed to send invite");
        return;
      }
      setInviteEmail("");
      if (data.invite?.inviteUrl) {
        setLastInviteUrl(data.invite.inviteUrl as string);
        setMessage("Invite created. Email delivery is not configured — copy the link below.");
      } else if (data.emailSent) {
        setMessage(`Invite sent to ${data.invite.email}`);
      } else {
        setMessage(`Invite created for ${data.invite.email}`);
      }
      await loadInvites(activePublicId);
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite(inviteId: number) {
    if (!activePublicId) return;
    setError(null);
    const response = await creatorFetch(
      `/api/creator/workspaces/${activePublicId}/invites/${inviteId}`,
      { method: "DELETE" },
    );
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to revoke invite");
      return;
    }
    setInvites(data.invites ?? []);
  }

  async function deleteWorkspace() {
    if (!active || active.isPersonal) return;

    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const response = await creatorFetch(`/api/creator/workspaces/${active.publicId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Failed to delete agency");
        return;
      }
      setMessage(`Deleted "${active.name}". Its projects moved to your personal workspace.`);
      const nextActive = await loadWorkspaces();
      if (nextActive) {
        setActivePublicId(nextActive);
      }
      setConfirmDeleteOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const canManage =
    active &&
    !active.isPersonal &&
    (active.role === "owner" || active.role === "admin");

  const isOwner = active && !active.isPersonal && active.role === "owner";

  return (
    <div className="cp-well p-5">
      <h3 className="text-sm font-semibold text-cp-ink">Agency workspace</h3>
      <p className="mt-1 text-xs text-cp-muted">
        Team workspaces share projects and batches. Invite teammates by email. Members inherit
        the owner&apos;s Pro quota while working in a team workspace.
      </p>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {message}
        </p>
      ) : null}
      {lastInviteUrl ? (
        <p className="mt-2 break-all rounded-lg border border-cp-line bg-white dark:bg-[#0f1729] px-3 py-2 font-mono text-[11px] text-cp-ink">
          {lastInviteUrl}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {workspaces.map((workspace) => (
          <button
            key={workspace.publicId}
            type="button"
            onClick={() => setActivePublicId(workspace.publicId)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              workspace.publicId === active?.publicId
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-cp-accent dark:bg-cp-accent"
                : "border-zinc-200 bg-white text-zinc-600 dark:border-cp-line dark:bg-[#0f1729] dark:text-cp-muted"
            }`}
          >
            {workspace.name}
          </button>
        ))}
      </div>

      {active && !active.isPersonal ? (
        <div className="mt-6 border-t border-cp-line pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">Members</p>
          <ul className="mt-2 space-y-2">
            {members.map((member) => (
              <li key={member.userId} className="flex items-center justify-between text-xs">
                <span className="truncate text-cp-ink">
                  {member.email ?? <span className="font-mono">{member.userId}</span>}
                </span>
                <span className="shrink-0 text-cp-muted">{member.role}</span>
              </li>
            ))}
          </ul>

          {canManage ? (
            <>
              <div className="mt-4 flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="teammate@agency.com"
                  className="flex-1 rounded-xl border border-cp-line px-3 py-2 text-xs outline-none focus:border-cp-ink"
                />
                <button
                  type="button"
                  disabled={busy || !inviteEmail.trim()}
                  onClick={() => void inviteMember()}
                  className="cp-btn cp-btn-ghost text-xs disabled:opacity-50"
                >
                  Invite
                </button>
              </div>

              {invites.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
                    Pending invites
                  </p>
                  <ul className="mt-2 space-y-2">
                    {invites.map((invite) => (
                      <li
                        key={invite.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="truncate text-cp-ink">{invite.email}</span>
                        <button
                          type="button"
                          onClick={() => void revokeInvite(invite.id)}
                          className="shrink-0 text-cp-muted underline-offset-2 hover:underline"
                        >
                          Revoke
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}

          {isOwner ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50/60 p-3 dark:border-red-500/30 dark:bg-red-500/10">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300">Danger zone</p>
              <p className="mt-1 text-[11px] leading-relaxed text-red-700/80 dark:text-red-300/80">
                Deleting this agency moves its projects and batches to your personal workspace and
                removes all members. This can&apos;t be undone.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDeleteOpen(true)}
                className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-500/15"
              >
                Delete agency
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 border-t border-cp-line pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
          New team workspace
        </p>
        <div className="mt-2 flex gap-2">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Agency name"
            className="flex-1 rounded-xl border border-cp-line px-3 py-2 text-xs outline-none focus:border-cp-ink"
          />
          <button
            type="button"
            disabled={busy || !newName.trim()}
            onClick={() => void createWorkspace()}
            className="cp-btn cp-btn-accent text-xs disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>

      {confirmDeleteOpen && active && !active.isPersonal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!busy) setConfirmDeleteOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-cp-line bg-white dark:bg-cp-card shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-cp-ink">Delete this agency?</h3>
                  <p className="text-xs text-cp-muted">{active.name}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-cp-muted">
                Its projects and batches will move to your{" "}
                <span className="font-semibold text-cp-ink">personal workspace</span>, and all{" "}
                {active.memberCount > 1 ? (
                  <>
                    <span className="font-semibold text-cp-ink">{active.memberCount} members</span>{" "}
                    lose access
                  </>
                ) : (
                  "members lose access"
                )}
                . This can&apos;t be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-cp-line px-5 py-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDeleteOpen(false)}
                className="cp-btn cp-btn-ghost text-xs disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteWorkspace()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {busy ? "Deleting…" : "Delete agency"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
