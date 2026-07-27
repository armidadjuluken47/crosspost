import JSZip from "jszip";
import type { AppEnv } from "@crosspost/shared";
import type { creatorProjects } from "@crosspost/db";
import type { PlatformKey, PlatformPack } from "@crosspost/content-ai";
import { createAssetStorage } from "../storage/index";
import { transcriptToSrt } from "./srt";

type CreatorProject = typeof creatorProjects.$inferSelect;

const PLATFORM_KEYS: PlatformKey[] = ["tiktok", "instagram", "youtube", "linkedin"];

function buildCaptionFileBody(pack: PlatformPack): string {
  return [
    pack.caption,
    "",
    ...pack.hookVariants.map((hook) => `• ${hook}`),
  ].join("\n");
}

function resolvePlatformPacks(project: CreatorProject): Record<PlatformKey, PlatformPack> {
  const raw = project.platformVariants as Partial<Record<PlatformKey, PlatformPack>> | null;
  const fallback: PlatformPack = {
    caption: project.caption ?? "",
    hashtags: project.hashtags ?? "",
    hookVariants: Array.isArray(project.hookVariants)
      ? (project.hookVariants as string[])
      : [],
  };

  return PLATFORM_KEYS.reduce(
    (acc, key) => {
      const pack = raw?.[key];
      acc[key] =
        pack && typeof pack.caption === "string"
          ? {
              caption: pack.caption,
              hashtags: typeof pack.hashtags === "string" ? pack.hashtags : fallback.hashtags,
              hookVariants: Array.isArray(pack.hookVariants)
                ? pack.hookVariants.map(String)
                : fallback.hookVariants,
            }
          : fallback;
      return acc;
    },
    {} as Record<PlatformKey, PlatformPack>,
  );
}

export async function buildCreatorExportZip(
  env: AppEnv,
  project: CreatorProject,
): Promise<Buffer> {
  const storage = createAssetStorage(env);
  const zip = new JSZip();

  if (project.outputVideoKey) {
    try {
      const video = await storage.getObject(project.outputVideoKey);
      zip.file("video/remix.mp4", video);
    } catch (error) {
      console.warn("[export] ZIP skipped video:", error);
    }
  }

  const srt =
    (project.srtKey
      ? await storage
          .getObject(project.srtKey)
          .then((buf) => buf.toString("utf8"))
          .catch(() => null)
      : null) ?? transcriptToSrt(project.transcript);

  if (srt) {
    zip.file("subtitles/captions.srt", srt);
  }

  if (project.burnedVideoKey) {
    try {
      const burned = await storage.getObject(project.burnedVideoKey);
      zip.file("subtitles/burned.mp4", burned);
    } catch (error) {
      console.warn("[export] ZIP skipped burned video:", error);
    }
  }

  if (project.thumbnailKey) {
    try {
      const thumb = await storage.getObject(project.thumbnailKey);
      zip.file("thumbnails/cover.jpg", thumb);
    } catch (error) {
      console.warn("[export] ZIP skipped thumbnail:", error);
    }
  }

  const platformPacks = resolvePlatformPacks(project);
  const tiktokPack = platformPacks.tiktok;

  zip.file("captions/captions.txt", buildCaptionFileBody(tiktokPack));
  zip.file("hashtags/hashtags.txt", tiktokPack.hashtags);

  for (const key of PLATFORM_KEYS) {
    zip.file(`captions/${key}.txt`, buildCaptionFileBody(platformPacks[key]));
    zip.file(`hashtags/${key}.txt`, platformPacks[key].hashtags);
  }

  const generated = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return Buffer.from(generated);
}
