"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw } from "lucide-react";

export function AdminProjectRetryButton({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/creator-projects/${publicId}/retry`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Retry failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleRetry()}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2 text-xs font-semibold hover:bg-[var(--bg-hover)] disabled:opacity-50"
      >
        <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        Retry project
      </button>
      {error ? <p className="text-[11px] text-red-500">{error}</p> : null}
    </div>
  );
}
