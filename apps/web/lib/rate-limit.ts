import { createClient, type RedisClientType } from "redis";

const buckets = new Map<string, { count: number; resetAt: number }>();

let redisClient: RedisClientType | null = null;
let redisConnectPromise: Promise<RedisClientType | null> | null = null;

async function getRedisClient(redisUrl?: string | null) {
  if (!redisUrl?.trim()) return null;

  if (redisClient?.isOpen) return redisClient;

  if (!redisConnectPromise) {
    redisConnectPromise = (async () => {
      const client = createClient({ url: redisUrl.trim() });
      client.on("error", () => {
        // Fall back to in-memory limits if Redis blips.
      });
      await client.connect();
      redisClient = client as RedisClientType;
      return redisClient;
    })().catch(() => {
      redisConnectPromise = null;
      return null;
    });
  }

  return redisConnectPromise;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  redisUrl?: string | null,
) {
  const redis = await getRedisClient(redisUrl);
  if (redis) {
    const bucket = Math.floor(Date.now() / windowMs);
    const redisKey = `crosspost:rl:${key}:${bucket}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.pExpire(redisKey, windowMs);
    }
    if (count > limit) {
      return { allowed: false, remaining: 0, retryAfterMs: windowMs };
    }
    return { allowed: true, remaining: Math.max(0, limit - count) };
  }

  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}

export function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "local";
}
