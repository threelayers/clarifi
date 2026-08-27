import Redis from "ioredis";

let client: Redis | null = null;
let loggedRedisError = false;

export const getRedis = () => {
  if (!process.env.REDIS_URL) return null;
  if (!client) {
    client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: (attempt) => (attempt > 2 ? null : Math.min(attempt * 100, 500))
    });
    client.on("error", (error) => {
      if (loggedRedisError) return;
      loggedRedisError = true;
      console.warn(`Redis unavailable: ${error.message}`);
    });
  }
  return client;
};

export const rememberJson = async <T>(key: string, value: T, ttlSeconds = 900) => {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Cache is non-critical; keep the request path alive if Redis is unavailable.
  }
};

export const readJson = async <T>(key: string) => {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const checkRedis = async () => {
  const redis = getRedis();
  if (!redis) return { configured: false, ok: false, status: "not-configured" };
  try {
    const pong = await redis.ping();
    return { configured: true, ok: pong === "PONG", status: pong === "PONG" ? "ready" : "unexpected-response" };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      status: error instanceof Error ? error.message : "unavailable"
    };
  }
};
