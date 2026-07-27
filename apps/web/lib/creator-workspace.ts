import type { NextRequest } from "next/server";
import { resolveActiveWorkspace } from "@crosspost/pipeline";
import type { DbClient } from "@crosspost/db";
import { resolveCreatorUserId } from "./creator-auth";

export const WORKSPACE_COOKIE = "crosspost_ws";

export function workspaceCookieHeader(publicId: string) {
  return `${WORKSPACE_COOKIE}=${encodeURIComponent(publicId)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function readWorkspaceCookie(request: NextRequest): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${WORKSPACE_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function resolveCreatorWorkspace(
  request: NextRequest,
  db: DbClient,
): Promise<{ userId: string; workspacePublicId: string; workspaceId: number }> {
  const userId = await resolveCreatorUserId(request);
  const cookieWorkspace = readWorkspaceCookie(request);
  const workspace = await resolveActiveWorkspace(db, userId, cookieWorkspace);
  return {
    userId,
    workspacePublicId: workspace.publicId,
    workspaceId: workspace.id,
  };
}
