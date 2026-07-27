import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { AppEnv } from "@crosspost/shared";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function resolveKey(env: AppEnv): Buffer {
  const raw = env.SOCIAL_TOKEN_ENC_KEY?.trim();
  if (!raw) {
    throw new Error("SOCIAL_TOKEN_ENC_KEY is not configured");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("SOCIAL_TOKEN_ENC_KEY must decode to 32 bytes (base64-encoded)");
  }
  return key;
}

/** Encrypt a secret (OAuth token) for storage. Returns `iv:tag:ciphertext` (all base64). */
export function encryptToken(env: AppEnv, plaintext: string): string {
  const key = resolveKey(env);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

/** Decrypt a value produced by {@link encryptToken}. */
export function decryptToken(env: AppEnv, payload: string): string {
  const key = resolveKey(env);
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted token payload");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Optional helper for HMAC-signed OAuth state; reuses the same key material. */
export function getStateSigningSecret(env: AppEnv): Buffer {
  return resolveKey(env);
}
