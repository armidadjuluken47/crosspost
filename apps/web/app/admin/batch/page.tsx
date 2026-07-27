import { listModelsWithReferences, listSourceReels } from "@crosspost/pipeline";

export const dynamic = "force-dynamic";
import { BatchClient } from "@/components/batch-client";
import { PageHeader } from "@/components/page-header";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

export default async function BatchPage() {
  const env = getServerEnv();
  const db = getDb();
  const [models, reels] = await Promise.all([
    listModelsWithReferences(db),
    listSourceReels(db, { status: "selected" }, 200),
  ]);

  const costMode =
    env.IMAGE_PROVIDER_MODE === "api" || env.VIDEO_PROVIDER_MODE === "api" ? "live" : "fixture";

  return (
    <div>
      <PageHeader
        title="Batch Builder"
        subtitle="Model × reel matrix dispatch into the worker queue"
      />
      <BatchClient
        initialModels={models.map((model) => ({
          id: model.id,
          slug: model.slug,
          displayName: model.displayName,
          activeReferenceCount: model.activeReferenceCount,
          generationReady: model.generationReady,
        }))}
        initialReels={reels}
        costMode={costMode}
      />
    </div>
  );
}
