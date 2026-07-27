import { listModelsWithReferences } from "@crosspost/pipeline";
import { ModelsClient } from "@/components/models-client";
import { PageHeader } from "@/components/page-header";
import { getDb } from "@/lib/db";

export default async function ModelsPage() {
  const db = getDb();
  const models = await listModelsWithReferences(db);

  return (
    <div>
      <PageHeader
        title="Model Registry"
        subtitle="Register identities and manage face reference photos (3+ required for generation)"
      />
      <ModelsClient initialModels={models} />
    </div>
  );
}
