import { Readable } from "node:stream";
import type { AppEnv } from "@crosspost/shared";
import { hasDriveCredentials, parseDriveServiceAccount } from "@crosspost/shared";
import { google } from "googleapis";

export interface DriveUploadInput {
  fileName: string;
  mimeType: string;
  body: Buffer;
  folderPath?: string;
}

export interface DriveUploadResult {
  fileId: string;
  drivePath: string;
  webViewLink?: string | null;
}

function buildDriveClient(env: AppEnv) {
  const credentials = parseDriveServiceAccount(env);
  if (!credentials) {
    throw new Error("Invalid DRIVE_SA_JSON_BASE64");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    // drive.file only sees files the app created — shared folders 404 on files.get
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

async function ensureFolderPath(
  drive: ReturnType<typeof google.drive>,
  rootFolderId: string,
  segments: string[],
): Promise<string> {
  let parentId = rootFolderId;

  for (const name of segments) {
    const query = [
      `'${parentId}' in parents`,
      "trashed = false",
      "mimeType = 'application/vnd.google-apps.folder'",
      `name = '${name.replace(/'/g, "\\'")}'`,
    ].join(" and ");

    const existing = await drive.files.list({
      q: query,
      fields: "files(id,name)",
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const found = existing.data.files?.[0];
    if (found?.id) {
      parentId = found.id;
      continue;
    }

    const created = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id",
      supportsAllDrives: true,
    });

    if (!created.data.id) {
      throw new Error(`Failed to create Drive folder segment: ${name}`);
    }

    parentId = created.data.id;
  }

  return parentId;
}

async function findExistingFile(
  drive: ReturnType<typeof google.drive>,
  parentId: string,
  fileName: string,
) {
  const query = [
    `'${parentId}' in parents`,
    "trashed = false",
    `name = '${fileName.replace(/'/g, "\\'")}'`,
  ].join(" and ");

  const existing = await drive.files.list({
    q: query,
    fields: "files(id,name,webViewLink)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return existing.data.files?.[0] ?? null;
}

export async function uploadToGoogleDrive(
  env: AppEnv,
  input: DriveUploadInput,
): Promise<DriveUploadResult> {
  if (!hasDriveCredentials(env)) {
    throw new Error("Google Drive credentials are not configured");
  }

  const drive = buildDriveClient(env);
  const rootFolderId = env.DRIVE_ROOT_FOLDER_ID!.trim();
  const pathSegments = input.folderPath?.split("/").filter(Boolean) ?? [];
  const parentId = pathSegments.length
    ? await ensureFolderPath(drive, rootFolderId, pathSegments)
    : rootFolderId;

  const drivePath = [...pathSegments, input.fileName].join("/");
  const existing = await findExistingFile(drive, parentId, input.fileName);
  if (existing?.id) {
    return {
      fileId: existing.id,
      drivePath,
      webViewLink: existing.webViewLink,
    };
  }

  const uploaded = await drive.files.create({
    requestBody: {
      name: input.fileName,
      parents: [parentId],
    },
    media: {
      mimeType: input.mimeType,
      body: Readable.from(input.body),
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });

  const fileId = uploaded.data.id;
  if (!fileId) {
    throw new Error("Drive upload succeeded without file id");
  }

  return {
    fileId,
    drivePath,
    webViewLink: uploaded.data.webViewLink,
  };
}

export function getDriveServiceAccountEmail(env: AppEnv): string | null {
  const credentials = parseDriveServiceAccount(env);
  const email = credentials?.client_email;
  return typeof email === "string" && email.trim() ? email.trim() : null;
}

export async function checkGoogleDriveAccess(
  env: AppEnv,
): Promise<{ ok: boolean; message: string; serviceAccountEmail?: string; folderId?: string }> {
  if (!hasDriveCredentials(env)) {
    return { ok: false, message: "Drive credentials missing" };
  }

  const credentials = parseDriveServiceAccount(env);
  if (!credentials) {
    return { ok: false, message: "DRIVE_SA_JSON_BASE64 is invalid" };
  }

  const serviceAccountEmail = getDriveServiceAccountEmail(env) ?? undefined;
  const folderId = env.DRIVE_ROOT_FOLDER_ID!.trim();

  try {
    const drive = buildDriveClient(env);
    const folder = await drive.files.get({
      fileId: folderId,
      fields: "id,name",
      supportsAllDrives: true,
    });
    const name = folder.data.name ?? folderId;
    return {
      ok: true,
      message: `Drive folder reachable: ${name}`,
      serviceAccountEmail,
      folderId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Drive check failed";
    return {
      ok: false,
      message: /not found|404/i.test(message)
        ? `${message} — verify DRIVE_ROOT_FOLDER_ID (${folderId}) and service account ${serviceAccountEmail ?? "unknown"}`
        : message,
      serviceAccountEmail,
      folderId,
    };
  }
}
