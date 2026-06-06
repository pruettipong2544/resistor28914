// Simple in-memory TTL cache — persists across requests within the same Node.js process.
// Suitable for server-side API route caching to stay within Finnhub rate limits.

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function deleteCached(key: string): void {
  store.delete(key);
}

export function deleteCachedByPrefix(prefix: string): void {
  Array.from(store.keys()).forEach(k => {
    if (k.startsWith(prefix)) store.delete(k);
  });
}


export const TTL = {
  QUOTE: 30_000,        // 30 seconds — near real-time price
  CANDLE_1D: 5 * 60_000,      // 5 minutes
  CANDLE_1W: 15 * 60_000,     // 15 minutes
  CANDLE_1M: 30 * 60_000,     // 30 minutes
  CANDLE_1Y: 60 * 60_000,     // 1 hour
  PROFILE: 24 * 60 * 60_000,  // 24 hours — company name doesn't change
};
