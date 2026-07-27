import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { authenticateFirebase } from "./firebase-auth";

export const CREATOR_USER_COOKIE = "crosspost_uid";

export async function resolveCreatorUserId(request: NextRequest): Promise<string> {
  const auth = await authenticateFirebase(request);
  if ("user" in auth && auth.user?.uid) {
    return auth.user.uid;
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${CREATOR_USER_COOKIE}=([^;]+)`));
  if (match?.[1]) {
    return decodeURIComponent(match[1]);
  }

  return `dev_${randomUUID().slice(0, 8)}`;
}

export function creatorUserCookieHeader(userId: string) {
  return `${CREATOR_USER_COOKIE}=${encodeURIComponent(userId)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
