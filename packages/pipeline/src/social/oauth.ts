import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { AppEnv } from "@crosspost/shared";
import { getStateSigningSecret } from "./crypto";
import type { SocialPlatform } from "./publishers/types";

export type OAuthState = {
  uid: string;
  workspaceId: number | null;
  nonce: string;
  exp: number;
};

const STATE_TTL_MS = 10 * 60 * 1000;

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Create a tamper-proof state string embedding the acting user's identity. */
export function signOAuthState(env: AppEnv, input: { uid: string; workspaceId: number | null }): string {
  const payload: OAuthState = {
    uid: input.uid,
    workspaceId: input.workspaceId,
    nonce: randomUUID(),
    exp: Date.now() + STATE_TTL_MS,
  };
  const body = base64url(JSON.stringify(payload));
  const sig = createHmac("sha256", getStateSigningSecret(env)).update(body).digest();
  return `${body}.${base64url(sig)}`;
}

/** Verify a state string and return the embedded identity, or null if invalid/expired. */
export function verifyOAuthState(env: AppEnv, state: string): OAuthState | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;

  const expected = createHmac("sha256", getStateSigningSecret(env)).update(body).digest();
  const provided = fromBase64url(sig);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64url(body).toString("utf8")) as OAuthState;
    if (!payload.uid || typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/** Canonical OAuth redirect URI for a platform, derived from APP_BASE_URL. */
export function socialRedirectUri(env: AppEnv, platform: SocialPlatform): string {
  const base = (env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/creator/social/${platform}/callback`;
}
