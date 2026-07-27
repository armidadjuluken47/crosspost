import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppEnv } from "@crosspost/shared";
import { compressImageForProvider } from "../../media/compress-image-for-provider";
import type { AssetStorage } from "../../storage/local";

/** URLs WaveSpeed's servers can fetch without our LAN. */
export function isProviderFetchableUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("data:")) return true;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.endsWith(".local")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function guessMimeType(keyOrUrl: string): string {
  const lower = keyOrUrl.toLowerCase().split("?")[0] ?? "";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

function stripApiAssetsPrefix(pathname: string): string | null {
  const markers = ["/api/assets/", "api/assets/"];
  for (const marker of markers) {
    const idx = pathname.indexOf(marker);
    if (idx >= 0) {
      return decodeURIComponent(pathname.slice(idx + marker.length).replace(/^\//, ""));
    }
  }
  return null;
}

/** Map a local/relative asset URL back to a storage object key. */
export function storageKeyFromMediaUrl(url: string, env?: AppEnv): string | null {
  if (!url) return null;
  if (url.startsWith("local://")) {
    return decodeURIComponent(url.slice("local://".length));
  }

  const configuredBase = env?.LOCAL_ASSET_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (configuredBase && url.startsWith(`${configuredBase}/`)) {
    return decodeURIComponent(url.slice(configuredBase.length + 1));
  }

  const r2Base = env?.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (r2Base && url.startsWith(`${r2Base}/`)) {
    return decodeURIComponent(url.slice(r2Base.length + 1));
  }

  try {
    const parsed = new URL(url);
    const fromPath = stripApiAssetsPrefix(parsed.pathname);
    if (fromPath) return fromPath;
    // Bare path after R2-style CDN host — last resort: pathname without leading slash
    if (parsed.pathname.length > 1 && !fromPath) {
      return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    }
  } catch {
    const fromRelative = stripApiAssetsPrefix(url.startsWith("/") ? url : `/${url}`);
    if (fromRelative) return fromRelative;
  }

  if (!url.includes("://") && !url.startsWith("/") && url.includes("/")) {
    return url;
  }

  return null;
}

function toDataUri(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function readLocalAssetFallback(env: AppEnv, key: string): Promise<Buffer | null> {
  const roots = [
    join(process.cwd(), env.LOCAL_ASSET_STORAGE_DIR),
    join(process.cwd(), "..", env.LOCAL_ASSET_STORAGE_DIR),
    join(process.cwd(), "../..", env.LOCAL_ASSET_STORAGE_DIR),
  ];

  for (const root of roots) {
    try {
      return await readFile(join(root, key));
    } catch {
      // try next root
    }
  }
  return null;
}

async function loadAssetBuffer(
  env: AppEnv,
  storage: AssetStorage,
  key: string,
): Promise<{ buffer: Buffer; migratedToRemote: boolean }> {
  try {
    const buffer = await storage.getObject(key);
    return { buffer, migratedToRemote: false };
  } catch {
    const local = await readLocalAssetFallback(env, key);
    if (!local) {
      throw new Error(`Asset not found in ${storage.mode} storage or local disk: ${key}`);
    }

    // Face refs often pre-date R2 — copy them up so WaveSpeed can fetch a public URL.
    if (storage.mode === "r2") {
      await storage.putObject({
        key,
        body: local,
        mimeType: guessMimeType(key),
      });
      return { buffer: local, migratedToRemote: true };
    }

    return { buffer: local, migratedToRemote: false };
  }
}

async function isPublicUrlReachable(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8_000) });
    if (head.ok) return true;
    // Some CDNs reject HEAD — try a tiny ranged GET
    const get = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      signal: AbortSignal.timeout(8_000),
    });
    return get.ok || get.status === 206;
  } catch {
    return false;
  }
}

export class ProviderMediaResolver {
  private readonly cache = new Map<string, string>();

  constructor(
    private readonly env: AppEnv,
    private readonly storage: AssetStorage,
  ) {}

  async resolve(url: string, mimeHint?: string): Promise<string> {
    if (!url) {
      throw new Error("Missing media URL for WaveSpeed provider");
    }
    if (url.startsWith("data:")) {
      return url;
    }

    const key = storageKeyFromMediaUrl(url, this.env);

    // External CDN we don't own — pass through only if we can't map a key.
    if (!key) {
      if (isProviderFetchableUrl(url)) return url;
      throw new Error(
        `Cannot resolve media for WaveSpeed (not a public URL and not a local asset): ${url.slice(0, 120)}`,
      );
    }

    const cacheKey = mimeHint ? `${key}:${mimeHint}` : key;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const { buffer } = await loadAssetBuffer(this.env, this.storage, key);
    let mimeType = mimeHint ?? guessMimeType(key);

    if (mimeType.startsWith("video/") && buffer.length > 40 * 1024 * 1024) {
      throw new Error(
        `Source video is too large to inline for WaveSpeed (${Math.round(buffer.length / (1024 * 1024))}MB). ` +
          `Ensure the object is on R2 and R2_PUBLIC_BASE_URL is a publicly reachable CDN URL.`,
      );
    }

    // Prefer a public HTTPS URL when the object is actually reachable (R2).
    const publicUrl = this.storage.getPublicUrl(key);
    if (publicUrl && isProviderFetchableUrl(publicUrl) && (await isPublicUrlReachable(publicUrl))) {
      this.cache.set(cacheKey, publicUrl);
      return publicUrl;
    }

    // Fallback: inline (compress images so WaveSpeed submit doesn't time out).
    let payload = buffer;
    if (mimeType.startsWith("image/")) {
      const compressed = await compressImageForProvider(this.env, buffer, mimeType);
      payload = compressed.buffer;
      mimeType = compressed.mimeType;
    }

    const dataUri = toDataUri(payload, mimeType);
    this.cache.set(cacheKey, dataUri);
    return dataUri;
  }
}

/**
 * WaveSpeed cannot fetch localhost or `/api/assets/...` paths.
 * Prefer public R2 URLs when reachable; otherwise migrate local→R2 or inline as data URIs.
 */
export async function resolveProviderMediaUrl(
  env: AppEnv,
  storage: AssetStorage,
  url: string,
  mimeHint?: string,
): Promise<string> {
  const resolver = new ProviderMediaResolver(env, storage);
  return resolver.resolve(url, mimeHint);
}

/** Redact huge data URIs before persisting stage request payloads. */
export function redactMediaUrlsForAudit<T>(value: T): T {
  if (typeof value === "string") {
    if (value.startsWith("data:") && value.length > 120) {
      const header = value.slice(0, value.indexOf(",") + 1) || "data:;base64,";
      return `${header}[omitted ${value.length} chars]` as T;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactMediaUrlsForAudit(item)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = redactMediaUrlsForAudit(nested);
    }
    return out as T;
  }
  return value;
}
