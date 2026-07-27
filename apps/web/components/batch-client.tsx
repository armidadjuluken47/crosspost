"use client";

import { AlertTriangle, Check, DollarSign, Layers, Play, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { estimateBatchCostCents } from "@crosspost/shared";

type Model = {
  id: number;
  slug: string;
  displayName: string;
  activeReferenceCount: number;
  generationReady: boolean;
};

type Reel = {
  id: number;
  shortcode: string;
  accountHandle: string;
  caption: string | null;
  status: string;
  usedAt?: string | Date | null;
};

export function BatchClient({
  initialModels,
  initialReels,
  costMode,
}: {
  initialModels: Model[];
  initialReels: Reel[];
  costMode: "fixture" | "live";
}) {
  const router = useRouter();
  const [models] = useState(initialModels);
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([]);
  const [instruction, setInstruction] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedReels = useMemo(
    () => initialReels.filter((reel) => reel.status === "selected"),
    [initialReels],
  );

  const runCount = selectedModelIds.length * selectedReels.length;
  const estimatedCost = estimateBatchCostCents(runCount, costMode);

  function toggleModel(model: Model) {
    if (!model.generationReady) return;
    setSelectedModelIds((current) =>
      current.includes(model.id)
        ? current.filter((id) => id !== model.id)
        : [...current, model.id],
    );
  }

  function selectAllReadyModels() {
    const readyIds = models.filter((model) => model.generationReady).map((model) => model.id);
    setSelectedModelIds((current) => (current.length === readyIds.length ? [] : readyIds));
  }

  async function dispatchBatch() {
    if (runCount === 0) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          modelIds: selectedModelIds,
          sourceReelIds: selectedReels.map((reel) => reel.id),
          operatorInstruction: instruction || undefined,
          requestedBy: "dashboard",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Batch dispatch failed");
      }

      setMessage(
        `Queued batch ${data.batch.name}: ${data.runCount} runs (~$${(data.estimatedCostCents / 100).toFixed(2)} ${costMode})`,
      );
      setSelectedModelIds([]);
      router.push("/admin/queue");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Batch dispatch failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="text-lg font-bold">Step 1 · Models</h2>
            </div>
            <button type="button" className="btn-secondary text-xs" onClick={selectAllReadyModels}>
              Toggle generation-ready
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {models.map((model) => {
              const selected = selectedModelIds.includes(model.id);
              return (
                <button
                  key={model.id}
                  type="button"
                  disabled={!model.generationReady}
                  onClick={() => toggleModel(model)}
                  className={`panel-inset rounded-xl border p-4 text-left transition-colors ${
                    selected ? "border-[#f487b7]" : "border-[var(--border)]"
                  } ${!model.generationReady ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{model.displayName}</div>
                      <div className="font-mono text-xs text-[var(--text-muted)]">@{model.slug}</div>
                    </div>
                    {selected ? <Check className="h-4 w-4 text-[var(--accent)]" /> : null}
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-muted)]">
                    {model.activeReferenceCount} active refs
                    {!model.generationReady ? " · needs 3+" : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <div className="mb-3 flex items-center gap-2">
              <Layers className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="text-lg font-bold">Step 2 · Selected reels</h2>
            </div>
            {selectedReels.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No selected reels yet. Mark reels as selected in{" "}
                <Link href="/admin/sources" className="text-[var(--accent)] underline">
                  Sources
                </Link>
                .
              </p>
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                {selectedReels.map((reel) => (
                  <li key={reel.id} className="panel-inset rounded-lg p-3">
                    <div className="font-mono text-xs font-bold">
                      @{reel.accountHandle} / {reel.shortcode}
                    </div>
                    <div className="line-clamp-2 text-xs text-[var(--text-muted)]">
                      {reel.caption ?? "No caption"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel p-5">
            <label className="mb-2 block text-sm font-bold">Operator instruction (optional)</label>
            <textarea
              className="input min-h-24 w-full"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Extra guidance merged into prompt rendering..."
            />
          </div>
        </div>
      </div>

      <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Matrix size</div>
            <div className="text-2xl font-bold">{runCount}</div>
            <div className="text-xs text-[var(--text-muted)]">
              {selectedModelIds.length} models × {selectedReels.length} reels
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Estimated cost</div>
            <div className="flex items-center gap-2 text-2xl font-bold">
              <DollarSign className="h-5 w-5 text-[var(--accent)]" />
              {(estimatedCost / 100).toFixed(2)}
            </div>
            <div className="text-xs text-[var(--text-muted)]">{costMode} mode estimate</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Dispatch mode</div>
            <div className="text-sm font-semibold">Queued worker runs</div>
            <div className="text-xs text-[var(--text-muted)]">Visible in Queue after dispatch</div>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={runCount === 0 || submitting}
          onClick={dispatchBatch}
        >
          <Play className="h-4 w-4" />
          {submitting ? "Queueing..." : `Queue ${runCount || 0} runs`}
        </button>
      </div>

      {runCount > 0 && costMode === "live" ? (
        <div className="panel-inset flex items-start gap-2 rounded-xl p-4 text-sm text-amber-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Live provider mode will charge WaveSpeed for each queued run.
        </div>
      ) : null}

      {message ? <p className="text-sm text-[var(--accent)]">{message}</p> : null}
    </div>
  );
}
