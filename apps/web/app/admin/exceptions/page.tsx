import { listExceptions } from "@crosspost/pipeline";
import { PageHeader } from "@/components/page-header";
import { ExceptionPanel } from "@/components/ops-panels";
import { getDb } from "@/lib/db";

export default async function ExceptionsPage() {
  const db = getDb();
  const exceptions = await listExceptions(db, { status: "open" }, 50);

  return (
    <div>
      <PageHeader title="Exception Center" subtitle="Open pipeline exceptions requiring operator action" />
      <ExceptionPanel exceptions={exceptions} />
    </div>
  );
}
