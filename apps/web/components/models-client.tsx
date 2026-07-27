"use client";

import { CloudUpload, Lock, Plus, Trash2, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { assetUrl } from "@/lib/assets";

type FaceRef = {
  id: number;
  r2Key: string;
  publicUrl: string | null;
  ordinal: number;
  active: boolean;
};

type ModelRow = {
  id: number;
  slug: string;
  displayName: string;
  status: string;
  notes: string | null;
  faceReferences: FaceRef[];
  activeReferenceCount: number;
  generationReady: boolean;
};

export function ModelsClient({ initialModels }: { initialModels: ModelRow[] }) {
  const router = useRouter();
  const [models, setModels] = useState(initialModels);
  const [selectedId, setSelectedId] = useState<number | null>(initialModels[0]?.id ?? null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDeleteModel, setPendingDeleteModel] = useState<ModelRow | null>(null);
  const [deletingModelId, setDeletingModelId] = useState<number | null>(null);

  const selected = useMemo(
    () => models.find((m) => m.id === selectedId) ?? null,
    [models, selectedId],
  );

  const activeReferences = useMemo(
    () => selected?.faceReferences.filter((ref) => ref.active) ?? [],
    [selected],
  );

  useEffect(() => {
    fetch("/api/models")
      .then((response) => response.json())
      .then((data: { models?: ModelRow[] }) => {
        if (!data.models?.length) return;
        setModels(data.models);
        setSelectedId((current) =>
          current != null && data.models!.some((model) => model.id === current)
            ? current
            : (data.models![0]?.id ?? null),
        );
      })
      .catch(() => {
        // Keep SSR payload if the client refresh fails.
      });
  }, []);

  function autoSlug(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  async function createModel(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const response = await fetch("/api/models", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: slug || autoSlug(name), displayName: name, notes }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Failed to create model");
      return;
    }

    const next = {
      ...data.model,
      faceReferences: [],
      activeReferenceCount: 0,
      generationReady: false,
    };
    setModels([next, ...models]);
    setSelectedId(next.id);
    setAdding(false);
    setName("");
    setSlug("");
    setNotes("");
    router.refresh();
  }

  async function uploadReference(file: File) {
    if (!selected) return;
    setUploading(true);
    setMessage(null);

    const form = new FormData();
    form.append("file", file);

    const response = await fetch(`/api/models/${selected.id}/references`, {
      method: "POST",
      body: form,
    });
    const data = await response.json();
    setUploading(false);

    if (!response.ok) {
      setMessage(data.error ?? "Upload failed");
      return;
    }

    const updated = models.map((m) => {
      if (m.id !== selected.id) return m;
      const refs = [...m.faceReferences, data.reference];
      const activeReferenceCount = refs.filter((r) => r.active).length;
      return {
        ...m,
        faceReferences: refs,
        activeReferenceCount,
        generationReady: activeReferenceCount >= 3,
      };
    });
    setModels(updated);
    router.refresh();
  }

  async function deleteModel(model: ModelRow) {
    setMessage(null);
    setDeletingModelId(model.id);
    try {
      const response = await fetch(`/api/models/${model.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Failed to delete model");
        return;
      }

      const next = models.filter((row) => row.id !== model.id);
      setModels(next);
      setSelectedId((current) =>
        current === model.id ? (next[0]?.id ?? null) : current,
      );
      setMessage(
        `Deleted ${model.displayName} — ${data.deletedReferenceCount ?? 0} refs removed`,
      );
      router.refresh();
    } finally {
      setDeletingModelId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="panel p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide">Registered Models</h2>
          <button type="button" className="btn-secondary" onClick={() => setAdding((v) => !v)}>
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        {adding ? (
          <form onSubmit={createModel} className="mb-4 space-y-2">
            <input className="input" placeholder="Display name" value={name} onChange={(e) => { setName(e.target.value); setSlug(autoSlug(e.target.value)); }} required />
            <input className="input" placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
            <input className="input" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button type="submit" className="btn-primary w-full justify-center">Save model</button>
          </form>
        ) : null}

        <ul className="space-y-2">
          {models.map((model) => (
            <li key={model.id}>
              <button
                type="button"
                onClick={() => setSelectedId(model.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  selectedId === model.id ? "border-[#f487b7] bg-[#f487b7]/10" : "border-transparent hover:bg-[var(--bg-hover)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{model.displayName}</span>
                  {model.generationReady ? (
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Lock className="h-4 w-4 text-[var(--text-muted)]" />
                  )}
                </div>
                <div className="font-mono text-[10px] text-[var(--text-muted)]">@{model.slug} · {model.activeReferenceCount} refs</div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel p-5">
        {!selected ? (
          <p className="text-sm text-[var(--text-muted)]">Select a model to manage face references.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{selected.displayName}</h2>
                <p className="font-mono text-xs text-[var(--text-muted)]">@{selected.slug}</p>
                {selected.notes ? <p className="mt-2 text-sm text-[var(--text-secondary)]">{selected.notes}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${selected.generationReady ? "badge-ok" : "badge-warn"}`}>
                  {selected.generationReady ? "Generation ready" : "Needs 3+ refs"}
                </span>
                <button
                  type="button"
                  disabled={deletingModelId !== null || uploading}
                  onClick={() => setPendingDeleteModel(selected)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2
                    className={`h-3.5 w-3.5 ${deletingModelId === selected.id ? "animate-pulse" : ""}`}
                  />
                  Delete model
                </button>
              </div>
            </div>

            <label className="btn-secondary cursor-pointer">
              <CloudUpload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload reference photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadReference(file);
                  e.target.value = "";
                }}
              />
            </label>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeReferences.map((ref) => (
                <div key={ref.id} className="panel-inset overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={assetUrl(ref.r2Key, ref.publicUrl) ?? ""}
                    alt={`Reference ${ref.ordinal}`}
                    className="aspect-[3/4] w-full object-cover"
                  />
                  <div className="flex items-center justify-between px-2 py-2 text-[10px] font-mono">
                    <span>#{ref.ordinal}</span>
                    <span className={ref.active ? "badge badge-ok" : "badge badge-muted"}>
                      {ref.active ? "active" : "inactive"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {message ? <p className="mt-4 text-sm text-[var(--accent)]">{message}</p> : null}
      </div>

      {pendingDeleteModel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="panel w-full max-w-md rounded-2xl border border-[var(--border)]">
            <div className="border-b border-[var(--border)] p-5">
              <h3 className="text-lg font-bold text-red-600">Delete model?</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                This will delete <strong>{pendingDeleteModel.displayName}</strong> (@
                {pendingDeleteModel.slug}) and{" "}
                <strong>{pendingDeleteModel.activeReferenceCount}</strong> active reference(s).
              </p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Historical runs and creator projects are kept, but their model links are cleared.
                Related batch items are removed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-4">
              <button
                type="button"
                className="btn-secondary"
                disabled={deletingModelId !== null}
                onClick={() => setPendingDeleteModel(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg border border-red-400 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:opacity-90 disabled:opacity-60"
                disabled={deletingModelId !== null}
                onClick={async () => {
                  const model = pendingDeleteModel;
                  setPendingDeleteModel(null);
                  if (model) {
                    await deleteModel(model);
                  }
                }}
              >
                {deletingModelId === pendingDeleteModel.id ? "Deleting..." : "Delete model"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
