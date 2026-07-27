"use client";

import {
  Archive,
  AtSign,
  Check,
  Link2,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { assetUrl } from "@/lib/assets";

type Account = {
  id: number;
  handle: string;
  platform?: string;
  status: string;
  reelCount: number;
  previewReadyCount: number;
  lastScrapedAt: string | Date | null;
};

type Reel = {
  id: number;
  sourceAccountId: number;
  accountHandle: string;
  shortcode: string;
  caption: string | null;
  status: string;
  usedAt: string | Date | null;
  viewCount: number | null;
  durationSeconds: number | null;
  mp4R2Key: string | null;
  firstFrameR2Key: string | null;
  rankPayload?: unknown;
};

function reelHasUsedHistory(reel: Reel) {
  return Boolean(reel.usedAt);
}

/** Reel is locked after a run until operator restores to preview_ready. */
function reelLockedInUsedRun(reel: Reel) {
  return reel.status === "used";
}

type ReelStatusFilter = "all" | "preview_ready" | "selected" | "used" | "archived";

const REEL_FILTER_LABELS: Record<ReelStatusFilter, string> = {
  all: "All",
  preview_ready: "Preview ready",
  selected: "Selected",
  used: "Used",
  archived: "Archived",
};

function reelMediaUrls(reel: Reel) {
  const payload =
    reel.rankPayload && typeof reel.rankPayload === "object"
      ? (reel.rankPayload as { mp4PublicUrl?: string; firstFramePublicUrl?: string })
      : {};
  return {
    frameUrl: assetUrl(reel.firstFrameR2Key, payload.firstFramePublicUrl),
    videoUrl: assetUrl(reel.mp4R2Key, payload.mp4PublicUrl),
  };
}

function formatViews(count: number | null) {
  if (!count) return "— views";
  if (count >= 1000) return `${Math.round(count / 1000)}k views`;
  return `${count} views`;
}

export function SourcesClient({
  initialAccounts,
  initialReels,
}: {
  initialAccounts: Account[];
  initialReels: Reel[];
}) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [reels, setReels] = useState(initialReels);
  const [search, setSearch] = useState("");
  const [filterAccountId, setFilterAccountId] = useState<number | null>(null);
  const [reelStatusFilter, setReelStatusFilter] = useState<ReelStatusFilter>("all");
  const [newHandle, setNewHandle] = useState("");
  const [newPlatform, setNewPlatform] = useState<"instagram" | "tiktok" | "youtube">("instagram");
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [scrapingAccountId, setScrapingAccountId] = useState<number | null>(null);
  const [scrapeLogs, setScrapeLogs] = useState<string[]>([]);
  const [scrapingAll, setScrapingAll] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<number | null>(null);
  const [pendingDeleteAccount, setPendingDeleteAccount] = useState<Account | null>(null);
  const [playReel, setPlayReel] = useState<Reel | null>(null);

  const filteredAccounts = useMemo(
    () => accounts.filter((a) => a.handle.includes(search.replace("@", "").toLowerCase())),
    [accounts, search],
  );

  const filteredReels = useMemo(() => {
    return reels.filter((reel) => {
      const matchAccount = filterAccountId ? reel.sourceAccountId === filterAccountId : true;
      const matchStatus =
        reelStatusFilter === "all"
          ? !["archived", "rejected", "failed"].includes(reel.status)
          : reelStatusFilter === "preview_ready"
            ? ["ingested", "asset_ready", "preview_ready"].includes(reel.status)
            : reelStatusFilter === "selected"
              ? reel.status === "selected"
              : reelStatusFilter === "used"
                ? reelHasUsedHistory(reel)
                : ["rejected", "archived", "failed"].includes(reel.status);
      return matchAccount && matchStatus;
    });
  }, [reels, filterAccountId, reelStatusFilter]);

  async function refreshData() {
    const [accountsRes, reelsRes] = await Promise.all([
      fetch("/api/sources"),
      fetch("/api/sources/reels"),
    ]);
    const accountsData = await accountsRes.json();
    const reelsData = await reelsRes.json();
    if (accountsRes.ok) setAccounts(accountsData.accounts);
    if (reelsRes.ok) setReels(reelsData.reels);
    router.refresh();
  }

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const response = await fetch("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handle: newHandle, platform: newPlatform }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Failed to add account");
      return;
    }

    setAccounts([
      { ...data.account, reelCount: 0, previewReadyCount: 0 },
      ...accounts,
    ]);
    setNewHandle("");
    setNewPlatform("instagram");
    router.refresh();
  }

  async function importReel(e: React.FormEvent) {
    e.preventDefault();
    if (importing) return;
    setImporting(true);
    setMessage(null);
    setScrapeLogs([
      "[IMPORT]: Resolving public reel/Shorts URL…",
      "[PIPELINE]: Downloading MP4 and extracting first frame…",
    ]);

    try {
      const response = await fetch("/api/sources/import-reel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: importUrl, requestedBy: "dashboard" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Import failed");
      }

      if (data.result?.status === "skipped_duplicate") {
        setMessage(`Already in library: ${data.result.shortcode}`);
      } else {
        setMessage(`Imported reel ${data.result?.shortcode ?? ""}`);
      }
      setImportUrl("");
      await refreshData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
      setTimeout(() => setScrapeLogs([]), 2500);
    }
  }

  async function toggleAccountStatus(account: Account) {
    const next = account.status === "active" ? "paused" : "active";
    const response = await fetch(`/api/sources/${account.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Update failed");
      return;
    }

    setAccounts(accounts.map((a) => (a.id === account.id ? { ...a, status: data.account.status } : a)));
    router.refresh();
  }

  async function deleteAccount(account: Account) {
    setDeletingAccountId(account.id);
    setMessage(null);

    const response = await fetch(`/api/sources/${account.id}`, { method: "DELETE" });
    const data = await response.json();
    setDeletingAccountId(null);

    if (!response.ok) {
      if (response.status === 403) {
        setMessage("Only admins can delete source accounts.");
      } else {
        setMessage(data.error ?? "Failed to delete account");
      }
      return;
    }

    setAccounts(accounts.filter((a) => a.id !== account.id));
    setReels(reels.filter((r) => r.sourceAccountId !== account.id));
    if (filterAccountId === account.id) setFilterAccountId(null);
    setMessage(`Deleted @${account.handle} (${data.deletedReelCount ?? 0} reels removed)`);
    router.refresh();
  }

  async function setReelStatus(reelId: number, status: string) {
    const response = await fetch(`/api/sources/reels/${reelId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Failed to update reel");
      return;
    }

    setReels(reels.map((r) => (r.id === reelId ? { ...r, status: data.reel.status } : r)));
    router.refresh();
  }

  async function scrapeAccount(account: Account) {
    if (scrapingAccountId || scrapingAll) return;
    setScrapingAccountId(account.id);
    setScrapeLogs([
      `[APIFY]: Starting intake for @${account.handle}...`,
      `[PIPELINE]: Downloading reel MP4s and extracting first frames via ffmpeg...`,
    ]);
    setMessage(null);

    try {
      const response = await fetch(`/api/sources/${account.id}/intake`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ maxReels: 3, requestedBy: "dashboard" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Intake failed");
      }

      const ingested = data.results?.filter((r: { status: string }) => r.status === "ingested").length ?? 0;
      const skipped =
        data.results?.filter((r: { status: string }) => r.status === "skipped_duplicate").length ?? 0;
      setScrapeLogs((logs) => [
        ...logs,
        `[PIPELINE]: Provider ${data.providerId}`,
        `[PIPELINE]: ${ingested} ingested, ${skipped} skipped (duplicate)`,
        `[PIPELINE]: Intake complete for @${account.handle}`,
      ]);
      await refreshData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Intake failed");
      setScrapeLogs((logs) => [
        ...logs,
        `[ERROR]: ${error instanceof Error ? error.message : "Intake failed"}`,
      ]);
    } finally {
      setTimeout(() => {
        setScrapingAccountId(null);
        setScrapeLogs([]);
      }, 2500);
    }
  }

  async function scrapeAllActive() {
    if (scrapingAccountId || scrapingAll) return;
    setScrapingAll(true);
    setScrapeLogs(["[APIFY]: Running registered intake for all active accounts..."]);
    setMessage(null);

    try {
      const response = await fetch("/api/ingestion/registered", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ maxReels: 2, requestedBy: "dashboard" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Registered intake failed");
      }

      setScrapeLogs((logs) => [
        ...logs,
        `[PIPELINE]: Processed ${data.sourceCount} account(s) via ${data.providerId}`,
        `[PIPELINE]: Registered intake complete`,
      ]);
      await refreshData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Registered intake failed");
    } finally {
      setScrapingAll(false);
      setTimeout(() => setScrapeLogs([]), 2500);
    }
  }

  const activeFilterAccount = accounts.find((a) => a.id === filterAccountId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-muted)]">
          Apify intake for Instagram, TikTok, and YouTube — ffmpeg first-frame extraction and asset storage sync.
        </p>
        <button
          type="button"
          className="btn-secondary"
          disabled={scrapingAll || scrapingAccountId !== null}
          onClick={scrapeAllActive}
        >
          <RefreshCw className={`h-4 w-4 ${scrapingAll ? "animate-spin" : ""}`} />
          Scrape all active
        </button>
      </div>

      <form onSubmit={importReel} className="panel flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <Link2 className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wide">Import by link</span>
        </div>
        <input
          className="input min-w-[240px] flex-1"
          placeholder="Instagram / TikTok / YouTube Shorts URL…"
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary shrink-0" disabled={importing}>
          {importing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {importing ? "Importing…" : "Import reel"}
        </button>
        <p className="w-full text-[10px] text-[var(--text-muted)]">
          Paste any public Instagram Reel, TikTok, or YouTube Shorts URL. It&apos;s added to the{" "}
          <code>@imported</code> library for that platform, ready to select for a run.
        </p>
      </form>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-[var(--text-muted)]" />
            <input
              className="input"
              placeholder="Search handles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <form onSubmit={addAccount} className="mb-4 space-y-2">
            <select
              className="input"
              value={newPlatform}
              onChange={(e) =>
                setNewPlatform(e.target.value as "instagram" | "tiktok" | "youtube")
              }
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
            </select>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="@handle"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                required
              />
              <button type="submit" className="btn-secondary shrink-0">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </form>

          <ul className="max-h-[420px] space-y-2 overflow-y-auto">
            <li>
              <button
                type="button"
                onClick={() => setFilterAccountId(null)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${filterAccountId === null ? "bg-[var(--bg-hover)]" : ""}`}
              >
                All accounts ({accounts.length})
              </button>
            </li>
            {filteredAccounts.map((account) => (
              <li key={account.id}>
                <div
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    filterAccountId === account.id ? "border-[#f487b7]" : "border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setFilterAccountId(account.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate font-semibold">@{account.handle}</span>
                        <span className={`badge ${account.status === "active" ? "badge-ok" : "badge-muted"}`}>
                          {account.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {(account.platform ?? "instagram").toUpperCase()} · {account.reelCount}{" "}
                        reels · {account.previewReadyCount} preview-ready
                      </div>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary shrink-0 p-2"
                      disabled={account.status !== "active" || scrapingAccountId !== null || scrapingAll}
                      onClick={() => scrapeAccount(account)}
                      title="Scrape account"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${scrapingAccountId === account.id ? "animate-spin" : ""}`}
                      />
                    </button>
                    <button
                      type="button"
                      className="btn-secondary shrink-0 p-2 text-[var(--error-text)]"
                      disabled={
                        deletingAccountId !== null || scrapingAccountId !== null || scrapingAll
                      }
                      onClick={() => setPendingDeleteAccount(account)}
                      title="Delete account"
                    >
                      <Trash2
                        className={`h-3.5 w-3.5 ${deletingAccountId === account.id ? "animate-pulse" : ""}`}
                      />
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="text-[10px] text-[var(--accent)]"
                      onClick={() => toggleAccountStatus(account)}
                    >
                      Toggle {account.status === "active" ? "pause" : "activate"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          {scrapingAccountId !== null || scrapeLogs.length > 0 ? (
            <div className="panel p-4 font-mono text-[10px]">
              <div className="mb-2 flex items-center gap-2 text-[var(--accent)]">
                <Terminal className="h-4 w-4" />
                <span className="font-bold">Live intake output</span>
              </div>
              <div className="panel-inset max-h-40 space-y-1 overflow-y-auto p-3 text-[var(--text-muted)]">
                {scrapeLogs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="panel p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-2">
                <AtSign className="h-5 w-5 text-[var(--accent)]" />
                <div>
                  <h2 className="text-lg font-bold">Scraped Reels Queue</h2>
                  {activeFilterAccount ? (
                    <p className="text-xs text-[var(--accent)]">
                      Filter: @{activeFilterAccount.handle}
                      <button
                        type="button"
                        className="ml-2 underline"
                        onClick={() => setFilterAccountId(null)}
                      >
                        Clear
                      </button>
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 rounded-lg border border-[var(--border)] p-1">
                {(["all", "preview_ready", "selected", "used", "archived"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setReelStatusFilter(filter)}
                    className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase ${
                      reelStatusFilter === filter
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {REEL_FILTER_LABELS[filter]}
                  </button>
                ))}
              </div>
            </div>

            {filteredReels.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No reels in queue yet. Scrape an account, import a link, or run registered intake.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {filteredReels.map((reel) => {
                  const media = reelMediaUrls(reel);
                  return (
                    <div
                      key={reel.id}
                      className="panel-inset flex flex-col overflow-hidden rounded-xl border border-[var(--border)]"
                    >
                      <div className="group relative aspect-[3/4] overflow-hidden bg-black">
                        {media.frameUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={media.frameUrl}
                            alt={`@${reel.accountHandle} ${reel.shortcode}`}
                            className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">
                            No preview
                          </div>
                        )}
                        <span className="absolute left-2 top-2 rounded bg-black/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                          {reel.durationSeconds ?? "—"}s
                        </span>
                        <span className="absolute right-2 top-2 rounded bg-black/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                          {formatViews(reel.viewCount)}
                        </span>
                        {media.videoUrl ? (
                          <button
                            type="button"
                            onClick={() => setPlayReel(reel)}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <PlayCircle className="h-10 w-10 text-[var(--accent)]" />
                          </button>
                        ) : null}
                      </div>

                      <div className="flex flex-1 flex-col p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-[var(--accent)]">
                            @{reel.accountHandle}
                          </span>
                          <span className="truncate font-mono text-[10px] text-[var(--text-muted)]">
                            {reel.shortcode}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs text-[var(--text-muted)]">
                          {reel.caption ?? "No caption"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="badge badge-muted w-fit">{reel.status}</span>
                          {reelHasUsedHistory(reel) ? (
                            <span className="badge w-fit border border-sky-500/30 bg-sky-500/10 text-sky-700">
                              Used
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-t border-[var(--border)] p-2">
                        {reelLockedInUsedRun(reel) ? (
                          <div className="flex w-full items-center justify-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1.5 text-[10px] font-bold uppercase text-sky-700">
                            <Check className="h-3.5 w-3.5" />
                            Used in run
                          </div>
                        ) : reel.status === "selected" ? (
                          <button
                            type="button"
                            className="flex w-full items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-[10px] font-bold uppercase text-emerald-600 hover:bg-emerald-500/20"
                            title="Click to deselect"
                            onClick={() => setReelStatus(reel.id, "preview_ready")}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Selected
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-secondary w-full text-[10px]"
                            onClick={() => setReelStatus(reel.id, "selected")}
                          >
                            Select
                          </button>
                        )}
                        {reel.status !== "archived" &&
                        reel.status !== "rejected" &&
                        !reelLockedInUsedRun(reel) ? (
                          <button
                            type="button"
                            className="btn-secondary p-2"
                            title="Archive"
                            onClick={() => setReelStatus(reel.id, "archived")}
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-secondary p-2"
                            title="Restore"
                            onClick={() => setReelStatus(reel.id, "preview_ready")}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {message ? <p className="mt-4 text-sm text-[var(--accent)]">{message}</p> : null}
          </div>
        </div>
      </div>

      {playReel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4">
          <div className="panel flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-panel)] p-4">
              <div>
                <div className="text-sm font-bold text-[var(--accent)]">@{playReel.accountHandle}</div>
                <div className="font-mono text-[10px] text-[var(--text-muted)]">{playReel.shortcode}</div>
              </div>
              <button type="button" className="btn-secondary p-2" onClick={() => setPlayReel(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mx-auto w-full max-w-[320px] flex-1 bg-black">
              {reelMediaUrls(playReel).videoUrl ? (
                <video
                  src={reelMediaUrls(playReel).videoUrl}
                  autoPlay
                  controls
                  loop
                  muted
                  className="h-full max-h-[70vh] w-full object-contain"
                />
              ) : null}
            </div>
            <div className="max-h-24 overflow-y-auto border-t border-[var(--border)] p-4 text-xs text-[var(--text-muted)]">
              {playReel.caption ?? "No caption"}
            </div>
          </div>
        </div>
      ) : null}

      {pendingDeleteAccount ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="panel w-full max-w-md rounded-2xl border border-[var(--border)]">
            <div className="border-b border-[var(--border)] p-5">
              <h3 className="text-lg font-bold text-[var(--error-text)]">Delete source account?</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                This will delete <strong>@{pendingDeleteAccount.handle}</strong> (
                {(pendingDeleteAccount.platform ?? "instagram").toUpperCase()}) and{" "}
                <strong>{pendingDeleteAccount.reelCount}</strong> reel(s).
              </p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Historical runs are kept, but their source reel links are cleared.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-4">
              <button
                type="button"
                className="btn-secondary"
                disabled={deletingAccountId !== null}
                onClick={() => setPendingDeleteAccount(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--error-text)] bg-[var(--error-bg)] px-4 py-2 text-sm font-bold text-[var(--error-text)] hover:opacity-90 disabled:opacity-60"
                disabled={deletingAccountId !== null}
                onClick={async () => {
                  const account = pendingDeleteAccount;
                  setPendingDeleteAccount(null);
                  if (account) {
                    await deleteAccount(account);
                  }
                }}
              >
                {deletingAccountId === pendingDeleteAccount.id ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
