"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProviderStage, WaveSpeedCatalogModel } from "@crosspost/shared";
import { inferCrossPostCompatibility } from "@crosspost/shared";

type CatalogStage = Extract<ProviderStage, "image_gen" | "video_gen">;

const COMPATIBILITY_LABELS = {
  supported: "CrossPost workflow",
  experimental: "Experimental",
  unsupported: "May not work",
} as const;

const COMPATIBILITY_STYLES = {
  supported: "text-emerald-600",
  experimental: "text-amber-600",
  unsupported: "text-rose-600",
} as const;

export function ModelCatalogPicker({
  stage,
  actionLabel,
  onAdd,
}: {
  stage: CatalogStage;
  actionLabel: string;
  onAdd: (model: WaveSpeedCatalogModel) => void;
}) {
  const [query, setQuery] = useState("");
  const [manualId, setManualId] = useState("");
  const [models, setModels] = useState<WaveSpeedCatalogModel[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ stage });
      if (query.trim()) params.set("q", query.trim());

      try {
        const response = await fetch(`/api/wavespeed/catalog?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Failed to load catalog");
          setModels([]);
          return;
        }

        setModels(data.models ?? []);
        setTotal(data.total ?? 0);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load catalog");
        setModels([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query, stage]);

  const manualModel = useMemo((): WaveSpeedCatalogModel | null => {
    const modelId = manualId.trim();
    if (!modelId) return null;
    return {
      model_id: modelId,
      name: modelId,
    };
  }, [manualId]);

  function addManualModel() {
    if (!manualModel) return;
    onAdd(manualModel);
    setManualId("");
  }

  return (
    <div
      className="space-y-3 rounded-xl border p-3"
      style={{ borderColor: "var(--border)" }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Add from WaveSpeed catalog
        </p>
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
          Live list from WaveSpeed ({total} {stage === "image_gen" ? "image" : "video"} models).
          New models appear here automatically.
        </p>
      </div>

      <input
        className="input w-full"
        placeholder="Search by name or model ID..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        <input
          className="input min-w-[16rem] flex-1"
          placeholder="Or paste model ID (e.g. google/nano-banana-2/edit)"
          value={manualId}
          onChange={(event) => setManualId(event.target.value)}
        />
        <button
          type="button"
          className="btn-secondary px-3 py-2 text-xs"
          disabled={!manualModel}
          onClick={addManualModel}
        >
          Add by ID
        </button>
      </div>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {loading ? <p className="text-xs text-[var(--text-muted)]">Loading catalog…</p> : null}

      {!loading && models.length > 0 ? (
        <ul className="max-h-56 space-y-2 overflow-y-auto">
          {models.map((model) => {
            const compatibility = inferCrossPostCompatibility(model, stage);
            return (
              <li
                key={model.model_id}
                className="panel-inset flex flex-wrap items-start justify-between gap-2 rounded-lg border p-2"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{model.name || model.model_id}</p>
                  <p className="truncate font-mono text-[10px] text-[var(--text-muted)]">
                    {model.model_id}
                  </p>
                  <p className={`text-[10px] ${COMPATIBILITY_STYLES[compatibility]}`}>
                    {COMPATIBILITY_LABELS[compatibility]}
                    {model.base_price != null ? ` · $${model.base_price}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary shrink-0 px-2 py-1 text-xs"
                  disabled={compatibility === "unsupported"}
                  onClick={() => onAdd(model)}
                >
                  {actionLabel}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!loading && !error && models.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">No models match your search.</p>
      ) : null}
    </div>
  );
}
