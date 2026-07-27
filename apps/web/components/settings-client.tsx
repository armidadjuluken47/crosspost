"use client";

import { useMemo, useState } from "react";
import type {
  OutputSettings,
  ProviderDefinition,
  ProviderSelection,
  WaveSpeedCatalogModel,
} from "@crosspost/shared";
import {
  IMAGE_ASPECT_RATIOS,
  IMAGE_RESOLUTIONS,
  buildCustomProviderId,
  catalogModelToDisplayName,
  inferCrossPostCompatibility,
} from "@crosspost/shared";
import { ModelCatalogPicker } from "@/components/model-catalog-picker";

type ProviderGroups = {
  image: ProviderDefinition[];
  video: ProviderDefinition[];
};

function applySelectionToProviders(
  groups: ProviderGroups,
  selection: ProviderSelection,
): ProviderDefinition[] {
  const image = groups.image.map((provider) => {
    const chainIndex = selection.imageProviderIds.indexOf(provider.id);
    return {
      ...provider,
      enabled: chainIndex >= 0,
      sortOrder: chainIndex >= 0 ? chainIndex + 1 : 100 + provider.sortOrder,
    };
  });

  const video = groups.video.map((provider) => ({
    ...provider,
    enabled: provider.id === selection.videoProviderId,
    sortOrder: provider.id === selection.videoProviderId ? 1 : 10 + provider.sortOrder,
  }));

  return [...image, ...video];
}

function upsertCustomProvider(
  groups: ProviderGroups,
  model: WaveSpeedCatalogModel,
  stage: "image_gen" | "video_gen",
): { groups: ProviderGroups; providerId: string } {
  const modelId = model.model_id.trim();
  const providerId = buildCustomProviderId(modelId);
  const displayName = catalogModelToDisplayName(model);

  if (stage === "image_gen") {
    const existing = groups.image.find(
      (provider) => provider.id === providerId || provider.wavespeedModel === modelId,
    );
    if (existing) {
      return { groups, providerId: existing.id };
    }

    const nextProvider: ProviderDefinition = {
      id: providerId,
      displayName,
      stage: "image_gen",
      wavespeedModel: modelId,
      sortOrder: groups.image.length + 1,
      enabled: true,
      isCustom: true,
    };

    return {
      groups: { ...groups, image: [...groups.image, nextProvider] },
      providerId,
    };
  }

  const existing = groups.video.find(
    (provider) => provider.id === providerId || provider.wavespeedModel === modelId,
  );
  if (existing) {
    return { groups, providerId: existing.id };
  }

  const nextProvider: ProviderDefinition = {
    id: providerId,
    displayName,
    stage: "video_gen",
    wavespeedModel: modelId,
    sortOrder: 1,
    enabled: true,
    isCustom: true,
  };

  return {
    groups: { ...groups, video: [...groups.video, nextProvider] },
    providerId,
  };
}

export function SettingsClient({
  initialSettings,
  initialProviders,
  initialSelection,
}: {
  initialSettings: OutputSettings;
  initialProviders: ProviderGroups;
  initialSelection: ProviderSelection;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [selection, setSelection] = useState(initialSelection);
  const [providers, setProviders] = useState(initialProviders);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const enabledImageProviders = useMemo(
    () =>
      selection.imageProviderIds
        .map((id) => providers.image.find((provider) => provider.id === id))
        .filter((provider): provider is ProviderDefinition => Boolean(provider)),
    [providers.image, selection.imageProviderIds],
  );

  const chainProviders = useMemo(() => {
    const chainIds = new Set(selection.imageProviderIds);
    return providers.image.filter((provider) => chainIds.has(provider.id));
  }, [providers.image, selection.imageProviderIds]);

  const libraryImageProviders = useMemo(
    () => providers.image.filter((provider) => !selection.imageProviderIds.includes(provider.id)),
    [providers.image, selection.imageProviderIds],
  );

  function toggleImageProvider(id: string) {
    setSelection((current) => {
      const exists = current.imageProviderIds.includes(id);
      if (exists) {
        if (current.imageProviderIds.length <= 1) {
          return current;
        }
        return {
          ...current,
          imageProviderIds: current.imageProviderIds.filter((entry) => entry !== id),
        };
      }

      return {
        ...current,
        imageProviderIds: [...current.imageProviderIds, id],
      };
    });
  }

  function moveImageProvider(id: string, direction: -1 | 1) {
    setSelection((current) => {
      const index = current.imageProviderIds.indexOf(id);
      if (index < 0) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.imageProviderIds.length) {
        return current;
      }

      const next = [...current.imageProviderIds];
      [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
      return { ...current, imageProviderIds: next };
    });
  }

  function removeFromImageChain(id: string) {
    setSelection((current) => {
      if (!current.imageProviderIds.includes(id) || current.imageProviderIds.length <= 1) {
        return current;
      }
      return {
        ...current,
        imageProviderIds: current.imageProviderIds.filter((entry) => entry !== id),
      };
    });
  }

  function addImageModel(model: WaveSpeedCatalogModel) {
    const compatibility = inferCrossPostCompatibility(model, "image_gen");
    if (compatibility === "unsupported") {
      setMessage(
        `Cannot add "${model.model_id}" — model schema is not compatible with CrossPost's 5-input image workflow.`,
      );
      return;
    }

    const { groups, providerId } = upsertCustomProvider(providers, model, "image_gen");
    setProviders(groups);
    setSelection((current) => {
      if (current.imageProviderIds.includes(providerId)) {
        return current;
      }
      return {
        ...current,
        imageProviderIds: [...current.imageProviderIds, providerId],
      };
    });
  }

  function addVideoModel(model: WaveSpeedCatalogModel) {
    const compatibility = inferCrossPostCompatibility(model, "video_gen");
    if (compatibility === "unsupported") {
      setMessage(
        `Cannot add "${model.model_id}" — model schema is not compatible with CrossPost's reel motion workflow.`,
      );
      return;
    }

    const { groups, providerId } = upsertCustomProvider(providers, model, "video_gen");
    setProviders(groups);
    setSelection((current) => ({ ...current, videoProviderId: providerId }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const providersPayload = applySelectionToProviders(providers, selection);

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ settings, selection, providers: providersPayload }),
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Failed to save settings");
      setSaving(false);
      return;
    }

    setSettings(data.settings);
    setSelection(data.selection);
    setProviders(data.providers);
    setMessage("Saved — new runs will use these output defaults and provider models.");
    setSaving(false);
  }

  function renderProviderRow(provider: ProviderDefinition, inChain: boolean) {
    const chainIndex = selection.imageProviderIds.indexOf(provider.id);
    const enabled = inChain;

    return (
      <li
        key={provider.id}
        className="panel-inset flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
        style={{ borderColor: enabled ? "var(--accent)" : "var(--border)" }}
      >
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={() => toggleImageProvider(provider.id)}
            className="mt-1"
          />
          <span>
            <span className="block font-semibold">
              {provider.displayName}
              {provider.isCustom ? (
                <span className="ml-2 font-mono text-[10px] text-[var(--accent)]">custom</span>
              ) : null}
            </span>
            <span className="block font-mono text-[10px] text-[var(--text-muted)]">
              {provider.wavespeedModel}
            </span>
          </span>
        </label>
        {enabled ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              Step {chainIndex + 1}
            </span>
            <button
              type="button"
              className="btn-secondary px-2 py-1 text-xs"
              onClick={() => moveImageProvider(provider.id, -1)}
              disabled={chainIndex <= 0}
            >
              Up
            </button>
            <button
              type="button"
              className="btn-secondary px-2 py-1 text-xs"
              onClick={() => moveImageProvider(provider.id, 1)}
              disabled={chainIndex >= selection.imageProviderIds.length - 1}
            >
              Down
            </button>
            {provider.isCustom ? (
              <button
                type="button"
                className="btn-secondary px-2 py-1 text-xs"
                onClick={() => removeFromImageChain(provider.id)}
              >
                Remove
              </button>
            ) : null}
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      <div className="panel space-y-4 p-5">
        <h2 className="text-lg font-bold">Output defaults</h2>

        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Image aspect ratio
          </label>
          <select
            className="input w-full"
            value={settings.imageAspectRatio}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                imageAspectRatio: event.target.value as OutputSettings["imageAspectRatio"],
              }))
            }
          >
            {IMAGE_ASPECT_RATIOS.map((ratio) => (
              <option key={ratio} value={ratio}>
                {ratio}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Nano Banana 2 resolution
          </label>
          <select
            className="input w-full"
            value={settings.imageResolution}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                imageResolution: event.target.value as OutputSettings["imageResolution"],
              }))
            }
          >
            {IMAGE_RESOLUTIONS.map((resolution) => (
              <option key={resolution} value={resolution}>
                {resolution.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div
          className="rounded-xl border p-3 text-[11px] text-[var(--text-secondary)]"
          style={{ borderColor: "var(--border)" }}
        >
          Normalize target:{" "}
          {settings.imageAspectRatio === "9:16" ? "1080 × 1920 (9:16)" : "1080 × 1620 (2:3)"} after
          QC
        </div>
      </div>

      <div className="panel space-y-4 p-5">
        <div>
          <h2 className="text-lg font-bold">Image model chain</h2>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            Order is top-to-bottom. CrossPost tries each enabled model until one succeeds. Add any
            WaveSpeed edit model from the catalog or paste a model ID.
          </p>
        </div>

        <ul className="space-y-2">
          {chainProviders.map((provider) => renderProviderRow(provider, true))}
        </ul>

        {libraryImageProviders.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Available models (not in chain)
            </p>
            <ul className="space-y-2">
              {libraryImageProviders.map((provider) => renderProviderRow(provider, false))}
            </ul>
          </div>
        ) : null}

        <ModelCatalogPicker stage="image_gen" actionLabel="Add to chain" onAdd={addImageModel} />

        {enabledImageProviders.length > 0 ? (
          <p className="text-[11px] text-[var(--text-muted)]">
            Active chain: {enabledImageProviders.map((provider) => provider.displayName).join(" → ")}
          </p>
        ) : null}
      </div>

      <div className="panel space-y-4 p-5">
        <div>
          <h2 className="text-lg font-bold">Video model</h2>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            Motion video step. Pick a built-in Kling model or add any WaveSpeed video model from the
            catalog.
          </p>
        </div>

        <select
          className="input w-full"
          value={selection.videoProviderId}
          onChange={(event) =>
            setSelection((current) => ({ ...current, videoProviderId: event.target.value }))
          }
        >
          {providers.video.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.displayName}
              {provider.isCustom ? " (custom)" : ""}
              {provider.isPremiumSlot ? " (premium)" : ""}
            </option>
          ))}
        </select>
        <p className="font-mono text-[10px] text-[var(--text-muted)]">
          {
            providers.video.find((provider) => provider.id === selection.videoProviderId)
              ?.wavespeedModel
          }
        </p>

        <ModelCatalogPicker
          stage="video_gen"
          actionLabel="Use as video model"
          onAdd={addVideoModel}
        />
      </div>

      {message ? <p className="text-sm text-[var(--text-secondary)]">{message}</p> : null}

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
