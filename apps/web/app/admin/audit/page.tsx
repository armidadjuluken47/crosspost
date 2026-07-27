import { listRecentAuditEvents } from "@crosspost/pipeline";
import { PageHeader } from "@/components/page-header";
import { AuditPanel } from "@/components/ops-panels";
import { getDb } from "@/lib/db";

export default async function AuditPage() {
  const db = getDb();
  const events = await listRecentAuditEvents(db, 50);

  return (
    <div>
      <PageHeader title="System Audit Logs" subtitle="Immutable operator and system action trail" />
      <AuditPanel events={events} />
    </div>
  );
}
