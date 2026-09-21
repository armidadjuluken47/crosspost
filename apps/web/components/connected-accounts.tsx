"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, Unlink } from "lucide-react";
import { SOCIAL_ICONS, SOCIAL_LABELS } from "./social-icons";
import { useCreatorToast } from "./creator/creator-toast";
import { creatorFetch } from "@/lib/creator-api";

type Platform = "youtube" | "tiktok" | "instagram";

type Connection = {
  publicId: string;
  platform: Platform;
  accountLabel: string;
  accountRef: string;
  status: string;
  createdAt: string;
};

const PLATFORMS: Platform[] = ["youtube", "tiktok", "instagram"];

function isPlatform(value: string): value is Platform {
  return value === "youtube" || value === "tiktok" || value === "instagram";
}

export function ConnectedAccounts() {
  const { showToast } = useCreatorToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [available, setAvailable] = useState<Record<Platform, boolean>>({
    youtube: false,
    tiktok: false,
    instagram: false,
  });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await creatorFetch("/api/creator/social/connections");
      const data = await response.json();
      setConnections(data.connections ?? []);
      setAvailable(data.available ?? { youtube: false, tiktok: false, instagram: false });
    } catch {
      // Non-fatal — leave defaults.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Toast the result of an OAuth callback redirect, then clean the URL.
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("social_error");
    if (connected && isPlatform(connected)) {
      showToast(`${SOCIAL_LABELS[connected]} connected.`, "success");
      router.replace("/account");
      void load();
    } else if (error) {
      showToast(`Couldn't connect account (${error}).`, "error");
      router.replace("/account");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("connected"), searchParams.get("social_error")]);

  async function connect(platform: Platform) {
    setConnecting(platform);
    try {
      const response = await creatorFetch(`/api/creator/social/${platform}/connect`);
      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not start connection");
      }
      window.location.href = data.url;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not connect", "error");
      setConnecting(null);
    }
  }

  async function disconnect(publicId: string) {
    setDisconnecting(publicId);
    try {
      const response = await creatorFetch(`/api/creator/social/connections/${publicId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not disconnect");
      }
      showToast("Account disconnected.", "success");
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not disconnect", "error");
    } finally {
      setDisconnecting(null);
    }
  }

  const visiblePlatforms = PLATFORMS.filter(
    (platform) =>
      platform === "instagram" ||
      available[platform] ||
      connections.some((c) => c.platform === platform),
  );

  // Hide the whole card when nothing is configured and nothing connected.
  if (!loading && visiblePlatforms.length === 0) {
    return null;
  }

  return (
    <div className="cp-well space-y-4 p-6">
      <div className="space-y-1">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-cp-muted">
          Connected accounts
        </span>
        <h3 className="cp-display text-lg font-semibold text-cp-ink">Auto-post destinations</h3>
        <p className="text-xs leading-relaxed text-cp-muted">
          Connect the accounts you want to publish finished videos to. YouTube defaults to private;
          TikTok sends an inbox draft. Instagram Reels posting is coming soon.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-cp-line bg-cp-bg p-4 text-xs text-cp-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading connections…
        </div>
      ) : (
        <div className="space-y-3">
          {visiblePlatforms.map((platform) => {
            const Icon = SOCIAL_ICONS[platform];
            const connection = connections.find((c) => c.platform === platform);
            return (
              <div
                key={platform}
                className="flex items-center justify-between gap-3 rounded-2xl border border-cp-line bg-cp-bg p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cp-line bg-cp-card">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="block text-sm font-semibold text-cp-ink">
                      {SOCIAL_LABELS[platform]}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-cp-muted">
                      {platform === "instagram" && !available.instagram
                        ? "Reels auto-post — coming soon"
                        : connection
                          ? `Connected as ${connection.accountLabel || connection.accountRef}`
                          : "Not connected"}
                    </span>
                  </div>
                </div>

                {platform === "instagram" && !available.instagram ? (
                  <span className="rounded-xl border border-cp-line bg-cp-card px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-cp-muted">
                    Coming soon
                  </span>
                ) : connection ? (
                  <button
                    type="button"
                    onClick={() => disconnect(connection.publicId)}
                    disabled={disconnecting === connection.publicId}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cp-line bg-cp-card px-3 py-1.5 text-xs font-semibold text-cp-muted transition-colors hover:text-cp-ink disabled:opacity-60"
                  >
                    {disconnecting === connection.publicId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Unlink className="h-3.5 w-3.5" />
                    )}
                    Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => connect(platform)}
                    disabled={connecting === platform}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cp-ink bg-cp-ink px-3 py-1.5 text-xs font-semibold text-cp-bg transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {connecting === platform ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
