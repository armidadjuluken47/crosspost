import { listPromptVersions } from "@crosspost/pipeline";
import { PageHeader } from "@/components/page-header";
import { PromptsClient } from "@/components/prompts-client";
import { getDb } from "@/lib/db";

export default async function PromptsPage() {
  const db = getDb();
  const allPrompts = await listPromptVersions(db);
  const prompts = allPrompts.filter((prompt) => prompt.active);

  return (
    <div>
      <PageHeader
        title="Prompt Operations"
        subtitle="Active image and video prompts used for every new run"
      />
      <PromptsClient initialPrompts={prompts} />
    </div>
  );
}
