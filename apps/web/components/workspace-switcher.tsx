"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import { creatorFetch } from "@/lib/creator-api";

type WorkspaceRow = {
  publicId: string;
  name: string;
  isPersonal: boolean;
  role: string;
  memberCount: number;
};

export function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [activePublicId, setActivePublicId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    creatorFetch("/api/creator/workspaces")
      .then((response) => response.json())
      .then((data) => {
        setWorkspaces(data.workspaces ?? []);
        setActivePublicId(data.activePublicId ?? null);
      })
      .catch(() => undefined);
  }, []);

  const active = workspaces.find((ws) => ws.publicId === activePublicId) ?? workspaces[0];

  async function switchWorkspace(publicId: string) {
    await creatorFetch(`/api/creator/workspaces/${publicId}`, { method: "POST" });
    setActivePublicId(publicId);
    setOpen(false);
    window.location.reload();
  }

  if (!active) return null;

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex w-full items-center gap-2 rounded-xl border border-[#253352] bg-[#131d35] px-3 py-2 text-xs font-semibold text-sky-300 transition-colors hover:border-blue-500/40 hover:text-white"
      >
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{active.name}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-50 mt-2 rounded-xl border border-[#1e293b] bg-[#0f172a] py-1 shadow-xl">
          {workspaces.map((workspace) => (
            <button
              key={workspace.publicId}
              type="button"
              onClick={() => void switchWorkspace(workspace.publicId)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-white/5 ${
                workspace.publicId === active.publicId
                  ? "font-semibold text-white"
                  : "text-slate-300"
              }`}
            >
              <span>{workspace.name}</span>
              <span className="text-[10px] text-slate-500">{workspace.memberCount}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
