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
  MAX_STORE_SIZE: 1000, // Bounded capacity limit to prevent memory exhaustion
} as const;

export interface RateLimitRecord {
  timestamps: number[];
  lastUpdated: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  error?: string;
}

export interface RateLimiterOptions {
  windowMs?: number;
  maxPerWindow?: number;
  cooldownMs?: number;
  maxStoreSize?: number;
  WINDOW_MS?: number;
  MAX_PER_WINDOW?: number;
  COOLDOWN_MS?: number;
  MAX_STORE_SIZE?: number;
}

/**
 * Atomic, shared TTL-backed rate limiter supporting multi-key evaluation
 * (IP and email), concurrency locking, and bounded store capacity without
 * quota reset on eviction.
 */
export class SharedRateLimiter {
  private store: Map<string, RateLimitRecord>;
  private locks: Map<string, Promise<void>>;
  readonly windowMs: number;
  readonly maxPerWindow: number;
  readonly cooldownMs: number;
  readonly maxStoreSize: number;

  constructor(options: RateLimiterOptions = {}, sharedStore?: Map<string, RateLimitRecord>) {
    this.windowMs = options.windowMs ?? options.WINDOW_MS ?? RATE_LIMIT_CONFIG.WINDOW_MS;
    this.maxPerWindow = options.maxPerWindow ?? options.MAX_PER_WINDOW ?? RATE_LIMIT_CONFIG.MAX_PER_WINDOW;
    this.cooldownMs = options.cooldownMs ?? options.COOLDOWN_MS ?? RATE_LIMIT_CONFIG.COOLDOWN_MS;
    this.maxStoreSize = options.maxStoreSize ?? options.MAX_STORE_SIZE ?? RATE_LIMIT_CONFIG.MAX_STORE_SIZE;
    this.store = sharedStore ?? new Map<string, RateLimitRecord>();
    this.locks = new Map<string, Promise<void>>();
  }

  getStoreSize(): number {
    return this.store.size;
  }

  getRecord(key: string): RateLimitRecord | undefined {
    return this.store.get(key);
  }

  clear(): void {
    this.store.clear();
    this.locks.clear();
  }

  /**
   * Sweeps the store and purges all entries whose timestamps are outside the active window.
   */
  pruneExpiredEntries(now: number = Date.now()): number {
    const windowStart = now - this.windowMs;
    let prunedCount = 0;
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
        prunedCount++;
      }
    }
    return prunedCount;
  }

  /**
   * Acquires a sorted multi-key lock to serialize concurrent requests atomically
   * and avoid deadlocks across multiple keys.
   */
  private async withMultiLock<T>(keys: string[], fn: () => T | Promise<T>): Promise<T> {
    const sortedKeys = [...new Set(keys)].sort();

    // Wait for any existing locks on the keys
    for (const key of sortedKeys) {
      while (this.locks.has(key)) {
        try {
          await this.locks.get(key);
        } catch {
          // ignore lock resolution error
        }
      }
    }

    // Set lock promise
    let resolveLocks!: () => void;
    const lockPromise = new Promise<void>((res) => {
      resolveLocks = res;
    });

    for (const key of sortedKeys) {
      this.locks.set(key, lockPromise);
    }

    try {
      return await fn();
    } finally {
      for (const key of sortedKeys) {
        this.locks.delete(key);
      }
      resolveLocks();
    }
  }

  /**
   * Atomically checks and records quota for multiple keys (e.g. IP and email).
   */
  async consumeKeys(keys: string[], now: number = Date.now()): Promise<RateLimitResult> {
    const validKeys = [...new Set(keys.filter((k) => typeof k === 'string' && k.trim().length > 0))];
    if (validKeys.length === 0) {
      return { allowed: true };
    }

    return this.withMultiLock(validKeys, () => {
      return this.atomicEvaluateSync(validKeys, now);
    });
  }

  /**
   * Synchronous atomic evaluation inside lock critical section.
   */
  atomicEvaluateSync(keys: string[], now: number = Date.now()): RateLimitResult {
    const windowStart = now - this.windowMs;

    // 1. Evict expired timestamps on the requested keys
    for (const key of keys) {
      const record = this.store.get(key);
      if (record) {
        record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
        if (record.timestamps.length === 0) {
          this.store.delete(key);
        }
      }
    }

    // 2. Capacity check for new keys
    const newKeys = keys.filter((k) => !this.store.has(k));
    if (newKeys.length > 0 && this.store.size + newKeys.length > this.maxStoreSize) {
      this.pruneExpiredEntries(now);
      // If still exceeding maxStoreSize, all keys in store are active.
      // To prevent attacker flooding from evicting active keys and resetting their quotas,
      // fail closed for new keys.
      if (this.store.size + newKeys.length > this.maxStoreSize) {
        return {
          allowed: false,
          error: 'Service is temporarily experiencing high volume. Please wait a few moments before trying again or reach out to our concierge directly.',
        };
      }
    }

    // 3. Evaluate cooldown and quota for ALL keys before committing
    for (const key of keys) {
      const record = this.store.get(key);
      if (record && record.timestamps.length > 0) {
        // Cooldown check (burst protection)
        const lastTs = record.timestamps[record.timestamps.length - 1];
        if (now - lastTs < this.cooldownMs) {
          const retryAfter = Math.ceil((this.cooldownMs - (now - lastTs)) / 1000);
          return {
            allowed: false,
            retryAfterSeconds: retryAfter,
            error: 'Please wait a moment before sending another message.',
          };
        }

        // Window threshold check
        if (record.timestamps.length >= this.maxPerWindow) {
          const oldest = record.timestamps[0];
          const retryAfter = Math.ceil((oldest + this.windowMs - now) / 1000);
          return {
            allowed: false,
            retryAfterSeconds: retryAfter,
            error: 'Too many inquiries submitted. Please wait a few minutes before trying again or reach out to our concierge directly.',
          };
        }
      }
    }

    // 4. Commit timestamps atomically for all keys
    for (const key of keys) {
      let record = this.store.get(key);
      if (!record) {
        record = { timestamps: [], lastUpdated: now };
        this.store.set(key, record);
      }
      record.timestamps.push(now);
      record.lastUpdated = now;
    }

    return { allowed: true };
  }
}

// Shared global store across workers / modules within runtime
const GLOBAL_STORE_KEY = Symbol.for('palluvo.contact.rateLimitStore');
const globalScope = globalThis as unknown as { [GLOBAL_STORE_KEY]?: Map<string, RateLimitRecord> };

if (!globalScope[GLOBAL_STORE_KEY]) {
  globalScope[GLOBAL_STORE_KEY] = new Map<string, RateLimitRecord>();
}

export const defaultContactRateLimiter = new SharedRateLimiter(
  RATE_LIMIT_CONFIG,
  globalScope[GLOBAL_STORE_KEY]
);

/**
 * Convenient helper for single identifier checks
 */
export async function checkContactRateLimit(
  identifier: string,
  now: number = Date.now()
): Promise<RateLimitResult> {
  return defaultContactRateLimiter.consumeKeys([identifier], now);
}

/**
 * Multi-key atomic helper checking both IP and email together
 */
export async function checkContactRateLimitMulti(
  { ip, email }: { ip?: string; email?: string },
  now: number = Date.now()
): Promise<RateLimitResult> {
  const keys: string[] = [];
  if (ip && ip !== 'unknown') keys.push(`ip:${ip}`);
  if (email) keys.push(`email:${email}`);
  return defaultContactRateLimiter.consumeKeys(keys, now);
}

export function resetRateLimitStore(): void {
  defaultContactRateLimiter.clear();
}

export function pruneExpiredEntries(now: number = Date.now()): number {
  return defaultContactRateLimiter.pruneExpiredEntries(now);
}

export function getRateLimitStoreSize(): number {
  return defaultContactRateLimiter.getStoreSize();
}
