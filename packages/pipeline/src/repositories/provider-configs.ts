import { asc, inArray } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { providerConfigs } from "@crosspost/db";
import {
  ALL_PROVIDERS,
  getDefaultProviderSelection,
  isCustomProviderId,
  isRegistryProviderId,
  validateProviderSelection,
  type ProviderDefinition,
  type ProviderSelection,
} from "@crosspost/shared";

function rowToDefinition(
  registry: ProviderDefinition | null,
  row?: typeof providerConfigs.$inferSelect,
): ProviderDefinition {
  if (!row) {
    if (!registry) {
      throw new Error("Provider row missing registry fallback");
    }
    return { ...registry, isCustom: false };
  }

  if (!registry) {
    return {
      id: row.providerId,
      displayName: row.displayName,
      stage: row.stage as ProviderDefinition["stage"],
      wavespeedModel: row.wavespeedModel,
      sortOrder: row.sortOrder,
      enabled: row.enabled,
      isPremiumSlot: row.isPremiumSlot,
      isCustom: true,
    };
  }

  return {
    id: registry.id,
    displayName: row.displayName || registry.displayName,
    stage: registry.stage,
    wavespeedModel: row.wavespeedModel ?? registry.wavespeedModel,
    sortOrder: row.sortOrder,
    enabled: row.enabled,
    isPremiumSlot: row.isPremiumSlot ?? registry.isPremiumSlot,
    isCustom: false,
  };
}

function registryById(id: string): ProviderDefinition | null {
  return ALL_PROVIDERS.find((provider) => provider.id === id) ?? null;
}

export async function listAllProviderConfigs(db: DbClient): Promise<ProviderDefinition[]> {
  const rows = await db.select().from(providerConfigs).orderBy(asc(providerConfigs.sortOrder));
  const byId = new Map(rows.map((row) => [row.providerId, row]));

  const registryProviders = ALL_PROVIDERS.map((registry) =>
    rowToDefinition(registry, byId.get(registry.id)),
  );

  const customProviders = rows
    .filter((row) => !registryById(row.providerId))
    .map((row) => rowToDefinition(null, row));

  return [...registryProviders, ...customProviders].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getEnabledProviderChain(
  db: DbClient,
  stage: ProviderDefinition["stage"],
): Promise<ProviderDefinition[]> {
  const providers = await listAllProviderConfigs(db);
  return providers
    .filter((provider) => provider.stage === stage && provider.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getProviderSelection(db: DbClient): Promise<ProviderSelection> {
  const providers = await listAllProviderConfigs(db);
  return getDefaultProviderSelection(providers);
}

async function upsertProviderRow(db: DbClient, provider: ProviderDefinition) {
  await db
    .insert(providerConfigs)
    .values({
      providerId: provider.id,
      displayName: provider.displayName,
      stage: provider.stage,
      wavespeedModel: provider.wavespeedModel,
      sortOrder: provider.sortOrder,
      enabled: provider.enabled,
      isPremiumSlot: provider.isPremiumSlot ?? false,
    })
    .onConflictDoUpdate({
      target: providerConfigs.providerId,
      set: {
        displayName: provider.displayName,
        stage: provider.stage,
        wavespeedModel: provider.wavespeedModel,
        sortOrder: provider.sortOrder,
        enabled: provider.enabled,
        isPremiumSlot: provider.isPremiumSlot ?? false,
      },
    });
}

export async function saveProviderSelection(
  db: DbClient,
  selection: ProviderSelection,
  providers?: ProviderDefinition[],
): Promise<ProviderSelection> {
  if (providers) {
    const parsed = validateProviderSelection(selection, providers);

    for (const provider of providers) {
      await upsertProviderRow(db, provider);
    }

    const keptIds = new Set(providers.map((provider) => provider.id));
    const allRows = await db.select({ providerId: providerConfigs.providerId }).from(providerConfigs);
    const orphanCustomIds = allRows
      .map((row) => row.providerId)
      .filter((id) => isCustomProviderId(id) && !isRegistryProviderId(id) && !keptIds.has(id));

    if (orphanCustomIds.length > 0) {
      await db.delete(providerConfigs).where(inArray(providerConfigs.providerId, orphanCustomIds));
    }

    return parsed;
  }

  const parsed = validateProviderSelection(selection);

  for (const registry of ALL_PROVIDERS) {
    let enabled = false;
    let sortOrder = 100;

    if (registry.stage === "image_gen") {
      const index = parsed.imageProviderIds.indexOf(registry.id);
      enabled = index >= 0;
      sortOrder = index >= 0 ? index + 1 : 100;
    } else if (registry.stage === "video_gen") {
      enabled = registry.id === parsed.videoProviderId;
      sortOrder = enabled ? 1 : 2;
    }

    await upsertProviderRow(db, {
      ...registry,
      sortOrder,
      enabled,
    });
  }

  return parsed;
}

export async function syncProviderConfigsFromRegistry(db: DbClient) {
  for (const provider of ALL_PROVIDERS) {
    await upsertProviderRow(db, provider);
  }
}
