"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type AdminUserRow = {
  uid: string;
  email: string | null;
  name: string | null;
  plan: string;
  videosRemaining: number | null;
  unlimited: boolean;
  projectCount: number;
  createdAt: string | null;
};

export function AdminCreatorUsersPanel({
  initialUsers,
  highlightUid,
}: {
  initialUsers: AdminUserRow[];
  highlightUid?: string | null;
}) {
  const [query, setQuery] = useState(highlightUid ?? "");
  const [users, setUsers] = useState(initialUsers);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.uid.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        user.name?.toLowerCase().includes(q) ||
        user.plan.toLowerCase().includes(q),
    );
  }, [users, query]);

  async function handleDelete(uid: string) {
    if (!window.confirm(`Delete user ${uid} and all related creator projects?`)) return;
    setDeletingUid(uid);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(uid)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Delete failed");
      }
      setUsers((prev) => prev.filter((user) => user.uid !== uid));
      setMessage(
        `Deleted ${uid} (${data.deletedProjectCount ?? 0} projects, ${data.deletedWorkspaceCount ?? 0} workspaces)`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeletingUid(null);
    }
  }

  return (
    <div className="space-y-4">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search email, uid, name, plan…"
        className="h-10 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
      />
      {message ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--bg-inset)] font-mono text-[10px] uppercase tracking-widest text-[var(--text-faint)]">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Quota</th>
              <th className="px-4 py-3">Projects</th>
              <th className="px-4 py-3">Signed up</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr
                key={user.uid}
                className={`border-b border-[var(--border)] ${
                  highlightUid === user.uid ? "bg-[var(--accent)]/5" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {user.name || user.email || "Creator"}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">{user.email ?? "—"}</p>
                  <p className="font-mono text-[10px] text-[var(--text-faint)]">{user.uid}</p>
                </td>
                <td className="px-4 py-3 text-xs font-bold uppercase tracking-wider">{user.plan}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                  {user.unlimited ? "Unlimited" : `${user.videosRemaining ?? 0} left`}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/projects?user=${encodeURIComponent(user.uid)}`}
                    className="text-xs font-semibold text-[var(--accent)]"
                  >
                    {user.projectCount} projects
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={deletingUid === user.uid}
                    onClick={() => void handleDelete(user.uid)}
                    className="rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingUid === user.uid ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
