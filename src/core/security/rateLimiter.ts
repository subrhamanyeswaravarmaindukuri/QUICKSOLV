export interface RateLimitResult {
  limited: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  source: "upstash_redis" | "in_memory_fallback";
}

interface MemoryWindow {
  timestamps: number[];
}

const inMemoryStore = new Map<string, MemoryWindow>();

/**
 * Clean up old timestamps from in-memory store periodically.
 */
function cleanupInMemoryStore(windowMs: number) {
  const now = Date.now();
  const threshold = now - windowMs;
  for (const [key, record] of inMemoryStore.entries()) {
    record.timestamps = record.timestamps.filter(ts => ts > threshold);
    if (record.timestamps.length === 0) {
      inMemoryStore.delete(key);
    }
  }
}

/**
 * Distributed & Fallback Rate Limiter for QuickSolv API.
 * Uses Upstash Redis REST API when environment variables are set;
 * falls back to sliding-window in-memory rate limiting when running locally.
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60000
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const windowSec = Math.ceil(windowMs / 1000);
      const redisKey = `ratelimit:${identifier}`;
      
      // Perform INCR and EXPIRE via Upstash REST Pipeline
      const response = await fetch(`${redisUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([
          ["INCR", redisKey],
          ["EXPIRE", redisKey, windowSec]
        ]),
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        const data = await response.json();
        const currentCount = data?.[0]?.result || 1;
        const remaining = Math.max(0, limit - currentCount);
        const resetTime = Date.now() + windowMs;

        return {
          limited: currentCount > limit,
          limit,
          remaining,
          resetTime,
          source: "upstash_redis"
        };
      }
    } catch (err) {
      // Safe log using non-sensitive metadata
      console.warn(`[RateLimiter] Upstash Redis call failed, switching to fallback mode. Identifier: ${identifier.substring(0, 15)}...`);
    }
  }

  // --- IN-MEMORY SLIDING WINDOW FALLBACK ---
  cleanupInMemoryStore(windowMs);

  const now = Date.now();
  const threshold = now - windowMs;
  let record = inMemoryStore.get(identifier);

  if (!record) {
    record = { timestamps: [] };
    inMemoryStore.set(identifier, record);
  }

  // Filter timestamps within the current window
  record.timestamps = record.timestamps.filter(ts => ts > threshold);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetTime = oldest + windowMs;
    return {
      limited: true,
      limit,
      remaining: 0,
      resetTime,
      source: "in_memory_fallback"
    };
  }

  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);
  const resetTime = now + windowMs;

  return {
    limited: false,
    limit,
    remaining,
    resetTime,
    source: "in_memory_fallback"
  };
}
