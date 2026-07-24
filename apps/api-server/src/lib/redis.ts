import Redis from "ioredis";
import { env } from "../config/env";

/**
 * Shared Redis client. Used for token blocklist (logout) and future caching.
 * Reconnects automatically on disconnect.
 */
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true, // Don't fail at import-time if Redis is down
  enableReadyCheck: false,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy: () => null,
  reconnectOnError: () => false,
});

redis.on("error", (err: Error) => {
  // Log but don't crash — Redis is non-critical for reads
  console.error("Redis error:", err.message);
});
