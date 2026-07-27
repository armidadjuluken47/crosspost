export function buildModelRefKey(modelSlug: string, ordinal: number, assetId: string, ext: string) {
  return `models/${modelSlug}/refs/${ordinal}-${assetId}.${ext}`;
}

export function buildSourceMp4Key(sourceHandle: string, shortcode: string) {
  return `sources/${sourceHandle}/${shortcode}/source.mp4`;
}

export function buildSourceFirstFrameKey(sourceHandle: string, shortcode: string) {
  return `sources/${sourceHandle}/${shortcode}/first-frame.png`;
}

export function buildGeneratedImageKey(
  modelSlug: string,
  shortcode: string,
  runId: number | string,
  providerId: string,
  ordinal: number,
) {
  return `generated/${modelSlug}/${shortcode}/run-${runId}/${providerId}/candidate-${ordinal}.png`;
}

export function buildNormalizedImageKey(
  modelSlug: string,
  shortcode: string,
  runId: number | string,
  providerId: string,
  ordinal: number,
) {
  return `generated/${modelSlug}/${shortcode}/run-${runId}/${providerId}/candidate-${ordinal}-9x16.png`;
}

export function buildGeneratedVideoKey(
  modelSlug: string,
  shortcode: string,
  runId: number | string,
  providerId: string,
) {
  return `videos/${modelSlug}/${shortcode}/run-${runId}/${providerId}/final.mp4`;
}

export function buildCreatorProjectSrtKey(publicId: string) {
  return `creator-projects/${publicId}/captions.srt`;
}

export function buildCreatorProjectThumbnailKey(publicId: string) {
  return `creator-projects/${publicId}/cover.jpg`;
}

export function buildCreatorProjectBurnedVideoKey(publicId: string) {
  return `creator-projects/${publicId}/burned.mp4`;
}

export function buildCreatorProjectOutputKey(publicId: string) {
  return `creator-projects/${publicId}/remix.mp4`;
}

export function buildCreatorProjectFaceKey(publicId: string) {
  return `creator-projects/${publicId}/face.jpg`;
}

export function normalizeInstagramHandle(input: string): string {
  return input
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/(reels\/)?\/?$/i, "")
    .split("/")[0]!
    .toLowerCase();
}

export function normalizeSourceHandle(
  input: string,
  platform: "instagram" | "tiktok" | "youtube" = "instagram",
): string {
  let value = input.trim().replace(/^@/, "");
  if (platform === "tiktok") {
    value = value
      .replace(/^https?:\/\/(www\.)?(vm\.)?tiktok\.com\/@?/i, "")
      .split(/[/?#]/)[0]!;
  } else if (platform === "youtube") {
    value = value
      .replace(/^https?:\/\/(www\.)?youtube\.com\/@?/i, "")
      .replace(/^https?:\/\/(www\.)?youtu\.be\//i, "")
      .replace(/\/(shorts|videos|featured)?\/?$/i, "")
      .split(/[/?#]/)[0]!;
  } else {
    return normalizeInstagramHandle(input);
  }
  return value.toLowerCase();
}

export function parseInstagramHandlesFromText(content: string): string[] {
  const handles = new Set<string>();
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.includes("instagram.com")) {
      handles.add(normalizeInstagramHandle(trimmed));
      continue;
    }

    handles.add(normalizeInstagramHandle(trimmed));
  }

  return [...handles].filter(Boolean);
}
