import Redis from 'ioredis';
import { logger } from './logger';

// Upper bound on how long any single cache operation may delay a request.
// If Redis is slow or unreachable we give up and fall through to the real
// upstream call — the cache is an optimisation, never a dependency.
const OP_TIMEOUT_MS = 1000;
const ERROR_LOG_INTERVAL_MS = 60_000;

let client: Redis | null = null;
let lastErrorLogAt = 0;

// Created lazily on first use so that (a) importing this module never opens a
// connection, and (b) with REDIS_URL unset, caching is simply switched off.
function getClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }
  if (!client) {
    client = new Redis(url, {
      connectTimeout: 2000,
      commandTimeout: OP_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
    });
    // ioredis emits 'error' on every failed reconnect attempt. Without a
    // listener that spams the console; log it, but at most once a minute.
    client.on('error', (err) => {
      const now = Date.now();
      if (now - lastErrorLogAt > ERROR_LOG_INTERVAL_MS) {
        lastErrorLogAt = now;
        logger.warn({ err }, 'Redis error — continuing without cache');
      }
    });
  }
  return client;
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('cache operation timed out')), OP_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Opens the connection at startup (when REDIS_URL is set) so the very first
 * request after a boot/wake-up can already use the cache, instead of
 * finding it still connecting. Safe to call when caching is disabled.
 */
export function initCache(): void {
  getClient();
}

async function cacheGet<T>(key: string): Promise<T | undefined> {
  const redis = getClient();
  // Not connected (still connecting, or Redis is down and ioredis is
  // retrying): don't make the request wait for it — treat as a miss now.
  if (!redis || redis.status !== 'ready') return undefined;
  try {
    const raw = await withTimeout(redis.get(key));
    if (raw === null) return undefined;
    return JSON.parse(raw) as T;
  } catch (err) {
    // Covers Redis being down, timeouts, and a corrupt/non-JSON value alike.
    logger.warn({ err, key }, 'cache read failed — treating as miss');
    return undefined;
  }
}

async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getClient();
  if (!redis || redis.status !== 'ready') return;
  try {
    await withTimeout(redis.set(key, JSON.stringify(value), 'EX', ttlSeconds));
  } catch (err) {
    logger.warn({ err, key }, 'cache write failed — continuing');
  }
}

// An empty array is treated as "nothing worth remembering": if the upstream
// had a hiccup that surfaced as [], we don't want to serve it for hours.
function isCacheable(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

/**
 * Returns the cached value for `key` if present; otherwise runs `fetcher`,
 * stores a successful result for `ttlSeconds`, and returns it.
 *
 * `fetcher` signals failure by resolving to `undefined` (as our upstream
 * controllers already do), and failures are never cached — the next request
 * simply tries the upstream again.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T | undefined>
): Promise<T | undefined> {
  const cached = await cacheGet<T>(key);
  if (cached !== undefined) {
    logger.info({ key }, 'cache hit');
    return cached;
  }

  const fresh = await fetcher();
  if (isCacheable(fresh)) {
    logger.info({ key, ttlSeconds }, 'cache miss — stored');
    await cacheSet(key, fresh, ttlSeconds);
  }
  return fresh;
}

export async function closeCache(): Promise<void> {
  if (client) {
    const c = client;
    client = null;
    try {
      await c.quit();
    } catch {
      c.disconnect();
    }
  }
}
