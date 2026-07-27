import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "@crosspost/shared";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
config({ path: resolve(root, ".env") });
const env = loadEnv(process.env);
const token = env.APIFY_TOKEN?.trim();
if (!token) throw new Error("no token");

const actor = "clockworks~tiktok-scraper";
const url = `https://api.apify.com/v2/acts/${encodeURIComponent(actor)}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=180`;
const res = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    profiles: ["https://www.tiktok.com/@khaby.lame"],
    resultsPerPage: 1,
    shouldDownloadVideos: true,
    shouldDownloadCovers: false,
  }),
  signal: AbortSignal.timeout(240000),
});
const items = await res.json();
const item = Array.isArray(items) ? items[0] : null;
if (!item) {
  console.log("status", res.status, items);
  process.exit(1);
}
const summary: Record<string, unknown> = {
  keys: Object.keys(item),
  id: item.id,
  webVideoUrl: item.webVideoUrl,
  videoUrl: item.videoUrl,
  mediaUrls: item.mediaUrls,
  videoMetaKeys: item.videoMeta && typeof item.videoMeta === "object" ? Object.keys(item.videoMeta) : null,
  videoMetaDownload: item.videoMeta?.downloadAddr ?? item.videoMeta?.playAddr,
};
console.log(JSON.stringify(summary, null, 2));
