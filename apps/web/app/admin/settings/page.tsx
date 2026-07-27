import {
  getOutputSettings,
  getProviderSelection,
  listAllProviderConfigs,
} from "@crosspost/pipeline";
import { groupProvidersByStage } from "@crosspost/shared";
import { PageHeader } from "@/components/page-header";
import { SettingsClient } from "@/components/settings-client";
import { getDb } from "@/lib/db";

export default async function SettingsPage() {
  const db = getDb();
  const [settings, providers, selection] = await Promise.all([
    getOutputSettings(db),
    listAllProviderConfigs(db),
    getProviderSelection(db),
  ]);

  return (
    <div>
      <PageHeader
        title="Engine Settings"
        subtitle="Output defaults and WaveSpeed model selection — live catalog, no deploy required"
      />
      <SettingsClient
        initialSettings={settings}
        initialProviders={groupProvidersByStage(providers)}
        initialSelection={selection}
      />
    </div>
  );
}
