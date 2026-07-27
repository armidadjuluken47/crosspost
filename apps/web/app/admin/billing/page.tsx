import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getAdminDb, isFirebaseReady } from "@/lib/firebase-admin";

export default async function AdminBillingPage() {
  const users: Array<{
    uid: string;
    email: string | null;
    plan: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    videosRemaining: number | null;
    unlimited: boolean;
  }> = [];

  if (isFirebaseReady()) {
    try {
      const snap = await getAdminDb().collection("users").limit(300).get();
      for (const doc of snap.docs) {
        const data = doc.data();
        const unlimited = Boolean(data.unlimited) || data.videosRemaining === -1;
        users.push({
          uid: doc.id,
          email: typeof data.email === "string" ? data.email : null,
          plan: typeof data.plan === "string" ? data.plan : "free",
          stripeCustomerId:
            typeof data.stripeCustomerId === "string" ? data.stripeCustomerId : null,
          stripeSubscriptionId:
            typeof data.stripeSubscriptionId === "string" ? data.stripeSubscriptionId : null,
          videosRemaining: unlimited
            ? null
            : typeof data.videosRemaining === "number"
              ? data.videosRemaining
              : 3,
          unlimited,
        });
      }
    } catch (error) {
      console.warn("[admin/billing] Firestore list failed:", error);
    }
  }

  users.sort((a, b) => {
    if (a.plan === b.plan) return (a.email ?? "").localeCompare(b.email ?? "");
    if (a.plan === "free") return 1;
    if (b.plan === "free") return -1;
    return a.plan.localeCompare(b.plan);
  });

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Stripe-linked creator plans from Firestore user profiles"
      />

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--border)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Quota</th>
              <th className="px-4 py-3">Stripe customer</th>
              <th className="px-4 py-3">Subscription</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                  No Firestore billing profiles found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.uid} className="border-b border-[var(--border)]/60">
                  <td className="px-4 py-3">
                    <div className="font-medium">{user.email ?? "—"}</div>
                    <Link
                      href={`/admin/users?uid=${encodeURIComponent(user.uid)}`}
                      className="font-mono text-[10px] text-[var(--text-muted)] hover:underline"
                    >
                      {user.uid.slice(0, 20)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{user.plan}</td>
                  <td className="px-4 py-3">
                    {user.unlimited ? "Unlimited" : `${user.videosRemaining ?? 0} left`}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {user.stripeCustomerId ? (
                      <a
                        href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {user.stripeCustomerId.slice(0, 14)}…
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {user.stripeSubscriptionId ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
