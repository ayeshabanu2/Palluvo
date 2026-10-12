export const CONTACT_FIELD_LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 100,
  EMAIL_MAX: 254,
  PHONE_MAX: 25,
  SUBJECT_MAX: 150,
  MESSAGE_MIN: 5,
  MESSAGE_MAX: 3000,
} as const;

export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 10 * 60 * 1000, // 10 minutes sliding window
  MAX_PER_WINDOW: 5,
  COOLDOWN_MS: 5 * 1000, // 5 seconds minimum between consecutive requests
  MAX_STORE_SIZE: 1000, // Bounded capacity limit to prevent memory accumulation
} as const;

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Sweeps the store and purges all entries whose timestamps are outside the active window.
 */
export function pruneExpiredEntries(now: number = Date.now()): void {
  const windowStart = now - RATE_LIMIT_CONFIG.WINDOW_MS;
  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Returns the current number of tracked keys in the rate limit store.
 */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}

/**
 * Server-side sliding window rate limiter with rapid spam cooldown,
 * TTL-backed key eviction, and bounded capacity.
 */
export function checkContactRateLimit(
  identifier: string,
  now: number = Date.now()
): { allowed: boolean; error?: string } {
  if (!identifier) return { allowed: true };

  const windowStart = now - RATE_LIMIT_CONFIG.WINDOW_MS;
  let record = rateLimitStore.get(identifier);

  if (record) {
    // Filter out expired timestamps
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
    if (record.timestamps.length === 0) {
      // Key is completely expired - evict it immediately
      rateLimitStore.delete(identifier);
      record = undefined;
    }
  }

  // If the store is reaching bounded capacity, prune expired keys first
  if (rateLimitStore.size >= RATE_LIMIT_CONFIG.MAX_STORE_SIZE) {
    pruneExpiredEntries(now);
    // If still at or over capacity, evict the oldest inserted key
    if (rateLimitStore.size >= RATE_LIMIT_CONFIG.MAX_STORE_SIZE) {
      const oldestKey = rateLimitStore.keys().next().value;
      if (oldestKey) {
        rateLimitStore.delete(oldestKey);
      }
    }
  }

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(identifier, record);
  }

  // Check rapid burst cooldown
  const lastTs = record.timestamps[record.timestamps.length - 1];
  if (lastTs && now - lastTs < RATE_LIMIT_CONFIG.COOLDOWN_MS) {
    return {
      allowed: false,
      error: 'Please wait a moment before sending another message.',
    };
  }

  // Check window frequency threshold
  if (record.timestamps.length >= RATE_LIMIT_CONFIG.MAX_PER_WINDOW) {
    return {
      allowed: false,
      error: 'Too many inquiries submitted. Please wait a few minutes before trying again or reach out to our concierge directly.',
    };
  }

  record.timestamps.push(now);
  return { allowed: true };
}

/**
 * Clears the rate limit store (for test suites).
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}
