type AssetUrlEnv = {
  R2_PUBLIC_BASE_URL?: string;
};

export function assetUrl(r2Key?: string | null, publicUrl?: string | null) {
  if (publicUrl) return publicUrl;
  if (!r2Key) return undefined;
  return `/api/assets/${r2Key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Prefer stored/CDN URL, then R2 public base, then local /api/assets proxy. */
export function resolveAssetUrl(
  env: AssetUrlEnv,
  r2Key?: string | null,
  publicUrl?: string | null,
): string | null {
  const stored = publicUrl?.trim();
  if (stored) return stored;

  const key = r2Key?.trim();
  if (!key) return null;

  const r2Base = env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (r2Base) return `${r2Base}/${key}`;

  return assetUrl(key) ?? null;
}
