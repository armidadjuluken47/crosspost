import { listSourceAccountsWithCounts, listSourceReels } from "@crosspost/pipeline";
import { PageHeader } from "@/components/page-header";
import { SourcesClient } from "@/components/sources-client";
import { getDb } from "@/lib/db";

export default async function SourcesPage() {
  const db = getDb();
  const [accounts, reels] = await Promise.all([
    listSourceAccountsWithCounts(db),
    listSourceReels(db),
  ]);

  return (
    <div>
      <PageHeader
        title="Source Ingestion"
        subtitle="Instagram, TikTok & YouTube intake — ffmpeg previews and reel selection queue"
      />
      <SourcesClient initialAccounts={accounts} initialReels={reels} />
    </div>
  );
}
