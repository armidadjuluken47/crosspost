import type { AppEnv } from "@crosspost/shared";
import { hasDriveCredentials } from "@crosspost/shared";
import type { AssetStorage } from "../storage/local";
import { uploadToGoogleDrive } from "./google-drive";

export interface DeliverRunInput {
  runId: number;
  modelSlug: string;
  sourceShortcode: string;
  videoR2Key: string;
  mimeType?: string;
}

export function buildDriveDeliveryPaths(input: Pick<DeliverRunInput, "runId" | "modelSlug" | "sourceShortcode">) {
  const fileName = `${input.sourceShortcode}-run-${input.runId}-final.mp4`;
  const folderPath = input.modelSlug;
  return {
    fileName,
    folderPath,
    drivePath: `${folderPath}/${fileName}`,
  };
}

export interface DeliverRunResult {
  destination: "drive" | "local";
  drivePath: string;
  r2Key: string;
  driveFileId?: string;
  webViewLink?: string | null;
  payload: Record<string, unknown>;
}

export async function deliverRunAssets(
  env: AppEnv,
  storage: AssetStorage,
  input: DeliverRunInput,
): Promise<DeliverRunResult> {
  const videoBuffer = await storage.getObject(input.videoR2Key);
  const { fileName, folderPath } = buildDriveDeliveryPaths(input);

  if (hasDriveCredentials(env)) {
    try {
      const uploaded = await uploadToGoogleDrive(env, {
        fileName,
        mimeType: input.mimeType ?? "video/mp4",
        body: videoBuffer,
        folderPath,
      });

      return {
        destination: "drive",
        drivePath: uploaded.drivePath,
        r2Key: input.videoR2Key,
        driveFileId: uploaded.fileId,
        webViewLink: uploaded.webViewLink,
        payload: {
          mode: "drive",
          driveFileId: uploaded.fileId,
          webViewLink: uploaded.webViewLink,
          folderPath,
        },
      };
    } catch (error) {
      const driveError = error instanceof Error ? error.message : "Drive upload failed";
      const fixturePath = `fixture-drive/${folderPath}/${fileName}`;
      return {
        destination: "local",
        drivePath: fixturePath,
        r2Key: input.videoR2Key,
        payload: {
          mode: "fixture",
          note: "Drive upload failed — using fixture path until folder access is granted",
          driveError,
        },
      };
    }
  }

  const fixturePath = `fixture-drive/${folderPath}/${fileName}`;
  return {
    destination: "local",
    drivePath: fixturePath,
    r2Key: input.videoR2Key,
    payload: {
      mode: "fixture",
      note: "Drive credentials not configured — recorded fixture delivery path only",
    },
  };
}
