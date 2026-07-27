import {
  buildHealthReport,
  countOpenExceptions,
  getActionableQueueCount,
} from "@crosspost/pipeline";
import { AppShell } from "@/components/app-shell";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

async function getShellStats() {
  const env = getServerEnv();
  const health = await buildHealthReport(env);
  const db = getDb();

  const [openExceptions, activeQueueCount] = await Promise.all([
    countOpenExceptions(db),
    getActionableQueueCount(db),
  ]);

  return {
    openExceptionsCount: openExceptions,
    activeQueueCount,
    systemStatus: health.status,
  };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const stats = await getShellStats();

  return (
    <AppShell
      openExceptionsCount={stats.openExceptionsCount}
      activeQueueCount={stats.activeQueueCount}
      systemStatus={stats.systemStatus}
    >
      <div className="p-5 md:p-8">{children}</div>
    </AppShell>
  );
}
