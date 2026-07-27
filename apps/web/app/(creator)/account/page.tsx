import { Suspense } from "react";
import { AccountView } from "@/components/account-view";

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-400">Loading account…</div>}>
      <AccountView />
    </Suspense>
  );
}
