"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Send,
} from "lucide-react";
import { SOCIAL_ICONS, SOCIAL_LABELS } from "./social-icons";
import { useCreatorToast } from "./creator/creator-toast";
import { creatorFetch } from "@/lib/creator-api";

type Platform = "youtube" | "tiktok" | "instagram";

type Connection = { platform: Platform; accountLabel: string; status: string };

type PostRow = {
  publicId: string;
  platform: Platform;
  status: string;
  remotePostUrl: string | null;
  error: string | null;
};

const PLATFORMS: Platform[] = ["youtube", "tiktok", "instagram"];
const ACTIVE_STATUSES = new Set(["queued", "running"]);

function statusLabel(status: string, platform: Platform) {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Uploading…";
    case "posted":
      // TikTok lands as an inbox draft — no public URL until the creator finishes in-app.
      return platform === "tiktok" ? "Sent to inbox" : "Posted";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function statusTitle(status: string, platform: Platform, error: string | null) {
  if (error) return error;
  if (status === "posted" && platform === "tiktok") {
    return "Open the TikTok app → Inbox (or Drafts) to finish posting and set the AI-generated label.";
  }
  if (status === "posted" && platform === "instagram") {
    return "Reel published to your Instagram Professional account.";
  }
  return undefined;
}

export function PostToSocial({ publicId }: { publicId: string }) {
  const { showToast } = useCreatorToast();
  const [available, setAvailable] = useState<Record<Platform, boolean>>({
    youtube: false,
    tiktok: false,
    instagram: false,
  });
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selected, setSelected] = useState<Set<Platform>>(new Set());
  const [privacy, setPrivacy] = useState<"private" | "unlisted" | "public">("private");
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const pollRef = useRef<number | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      const response = await creatorFetch(`/api/creator/projects/${publicId}/publish`);
      const data = await response.json();
      setPosts(data.posts ?? []);
    } catch {
      // Non-fatal.
    }
  }, [publicId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [connRes] = await Promise.all([
          creatorFetch("/api/creator/social/connections"),
          loadPosts(),
        ]);
        const connData = await connRes.json();
        if (!active) return;
        const conns: Connection[] = connData.connections ?? [];
        setConnections(conns);
        setAvailable(connData.available ?? { youtube: false, tiktok: false, instagram: false });
        setSelected(
          new Set(
            conns
              .filter((c) => c.status === "active" && c.platform !== "instagram")
              .map((c) => c.platform),
          ),
        );
      } catch {
        // Non-fatal.
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadPosts]);

  // Poll while any post is in-flight.
  useEffect(() => {
    const hasActive = posts.some((post) => ACTIVE_STATUSES.has(post.status));
    if (!hasActive) {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = window.setInterval(() => void loadPosts(), 4000);
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [posts, loadPosts]);

  const connectedPlatforms = PLATFORMS.filter((platform) =>
    connections.some((c) => c.platform === platform && c.status === "active"),
  );
  const configuredPlatforms = PLATFORMS.filter(
    (platform) => platform === "instagram" || available[platform],
  );

  // Feature off entirely (still show when YT/TT configured, or Instagram teaser).
  if (!loading && configuredPlatforms.length === 0 && connectedPlatforms.length === 0) {
    return null;
  }

  function toggle(platform: Platform) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  }

  async function postNow() {
    if (posting || selected.size === 0) return;
    setPosting(true);
    try {
      const response = await creatorFetch(`/api/creator/projects/${publicId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: Array.from(selected), privacy }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not publish");
      }
      setPosts(data.posts ?? []);
      if (Array.isArray(data.missing) && data.missing.length > 0) {
        showToast(
          `Connect ${data.missing.map((p: Platform) => SOCIAL_LABELS[p]).join(", ")} in Account first.`,
          "error",
        );
      }
      if (Array.isArray(data.queued) && data.queued.length > 0) {
        const hasTikTok = (data.queued as Platform[]).includes("tiktok");
        showToast(
          hasTikTok
            ? "Uploading… TikTok will land in your app inbox — open TikTok to finish."
            : "Publishing started — track status below.",
          "success",
        );
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not publish", "error");
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="mt-8 border-t border-cp-line pt-6">
      <h2 className="mb-1 text-sm font-semibold text-cp-ink">Post to social</h2>
      <p className="mb-4 text-xs leading-relaxed text-cp-muted">
        Publish this remix to your connected accounts. YouTube uploads as{" "}
        <span className="font-medium text-cp-ink">Private</span>. TikTok sends a{" "}
        <span className="font-medium text-cp-ink">draft to your app inbox</span>. Instagram Reels
        posting is <span className="font-medium text-cp-ink">coming soon</span>.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-cp-line bg-cp-bg p-4 text-xs text-cp-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {configuredPlatforms.map((platform) => {
              const Icon = SOCIAL_ICONS[platform];
              const connection = connections.find(
                (c) => c.platform === platform && c.status === "active",
              );
              const post = posts.find((p) => p.platform === platform);
              const isConnected = Boolean(connection);
              const comingSoon = platform === "instagram" && !available.instagram;
              return (
                <div
                  key={platform}
                  className={`flex items-center justify-between gap-3 rounded-xl border border-cp-line bg-cp-bg p-3 ${
                    comingSoon ? "opacity-70" : ""
                  }`}
                >
                  <label
                    className={`flex flex-1 items-center gap-3 ${
                      comingSoon ? "cursor-default" : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!comingSoon && isConnected && selected.has(platform)}
                      onChange={() => toggle(platform)}
                      disabled={comingSoon || !isConnected}
                      className="h-4 w-4 accent-cp-ink"
                    />
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium text-cp-ink">
                      {SOCIAL_LABELS[platform]}
                    </span>
                    {comingSoon ? (
                      <span className="rounded-lg border border-cp-line bg-cp-card px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-cp-muted">
                        Coming soon
                      </span>
                    ) : connection ? (
                      <span className="truncate text-[11px] text-cp-muted">
                        {connection.accountLabel}
                      </span>
                    ) : (
                      <Link
                        href="/account"
                        className="text-[11px] font-semibold text-cp-accent hover:underline"
                      >
                        Connect in Account →
                      </Link>
                    )}
                  </label>

                  {post ? (
                    <span
                      className={`inline-flex max-w-[11rem] items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold sm:max-w-none ${
                        post.status === "posted"
                          ? "bg-cp-success/10 text-cp-success"
                          : post.status === "failed"
                            ? "bg-cp-accent/10 text-cp-accent"
                            : "bg-cp-ink/5 text-cp-muted"
                      }`}
                      title={statusTitle(post.status, platform, post.error)}
                    >
                      {post.status === "posted" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      ) : post.status === "failed" ? (
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      ) : ACTIVE_STATUSES.has(post.status) ? (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                      ) : null}
                      <span className="truncate">{statusLabel(post.status, platform)}</span>
                      {post.remotePostUrl ? (
                        <a
                          href={post.remotePostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-0.5 inline-flex shrink-0"
                          title="Open on YouTube"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-cp-muted">
              Visibility
              <select
                value={privacy}
                onChange={(event) =>
                  setPrivacy(event.target.value as "private" | "unlisted" | "public")
                }
                className="rounded-lg border border-cp-line bg-cp-bg px-2 py-1 text-xs text-cp-ink outline-none focus:border-cp-ink"
              >
                <option value="private">Private (YouTube)</option>
                <option value="unlisted">Unlisted (YouTube)</option>
                <option value="public">Public (YouTube)</option>
              </select>
            </label>

            <button
              type="button"
              onClick={postNow}
              disabled={posting || selected.size === 0}
              className="cp-btn cp-btn-accent ml-auto h-10 px-5 disabled:opacity-60"
            >
              {posting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {posting ? "Posting…" : "Post now"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
