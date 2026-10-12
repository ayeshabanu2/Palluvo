import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

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
  MAX_STORE_SIZE: 1000, // Bounded capacity limit to prevent memory/storage exhaustion
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

export interface RateLimitStore {
  consumeKeys(keys: string[], now?: number): Promise<RateLimitResult>;
  getStoreSize?(): Promise<number> | number;
  pruneExpiredEntries?(now?: number): Promise<number> | number;
  clear?(): Promise<void> | void;
}

function checkSupabaseServiceRoleConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceKey) return false;
  if (url.includes('placeholder') || serviceKey.includes('placeholder')) return false;
  if (url.includes('your_supabase_project_url') || serviceKey.includes('your_supabase_service_role_key')) return false;

  return (
    url.startsWith('https://') ||
    url.startsWith('http://127.0.0.1') ||
    url.startsWith('http://localhost')
  );
}

/**
 * Production Database RPC Rate Limit Store.
 * Calls PostgreSQL function `consume_contact_rate_limit` via trusted server service_role credential.
 * Enforces atomic multi-key row locking, sliding window, burst cooldown,
 * TTL pruning, capacity protection, and fails closed on query failure.
 */
export class DatabaseRpcRateLimitStore implements RateLimitStore {
  private clientFactory?: () => Promise<any> | any;

  constructor(clientFactory?: () => Promise<any> | any) {
    this.clientFactory = clientFactory;
  }

  private async getClient(): Promise<any> {
    if (this.clientFactory) {
      return await this.clientFactory();
    }
    try {
      const { createAdminClient } = await import('@/utils/supabase/server');
      return await createAdminClient();
    } catch {
      return null;
    }
  }

  async consumeKeys(keys: string[], now: number = Date.now()): Promise<RateLimitResult> {
    const validKeys = [...new Set(keys.filter((k) => typeof k === 'string' && k.trim().length > 0))];
    if (validKeys.length === 0) {
      return { allowed: true };
    }

    try {
      const supabase = await this.getClient();
      if (!supabase) {
        return {
          allowed: false,
          error: 'Rate limiter unavailable. Please connect with our concierge directly.',
        };
      }

      const { data, error } = await supabase.rpc('consume_contact_rate_limit', {
        p_keys: validKeys,
      });

      if (error) {
        console.error('[DatabaseRpcRateLimitStore] RPC error:', error);
        // Fail closed on query errors - do not permit unverified submissions
        return {
          allowed: false,
          error: 'Unable to verify request rate at this moment. Please connect with our concierge directly.',
        };
      }

      if (data && typeof data === 'object') {
        return {
          allowed: Boolean(data.allowed),
          retryAfterSeconds: data.retryAfterSeconds,
          error: data.error,
        };
      }

      return {
        allowed: false,
        error: 'Unable to process inquiry rate check. Please try again shortly.',
      };
    } catch (err) {
      console.error('[DatabaseRpcRateLimitStore] Unexpected exception:', err);
      return {
        allowed: false,
        error: 'Unable to verify request rate at this moment. Please connect with our concierge directly.',
      };
    }
  }
}

/**
 * Cross-Process File-Backed Atomic Rate Limit Store.
 * Backs production rate limits across independent Node worker processes/threads
 * without relying on process-local memory. Uses atomic file locking and updates.
 */
export class CrossProcessRateLimitStore implements RateLimitStore {
  readonly windowMs: number;
  readonly maxPerWindow: number;
  readonly cooldownMs: number;
  readonly maxStoreSize: number;
  readonly storeFilePath: string;
  readonly lockFilePath: string;

  constructor(options: RateLimiterOptions = {}) {
    this.windowMs = options.windowMs ?? options.WINDOW_MS ?? RATE_LIMIT_CONFIG.WINDOW_MS;
    this.maxPerWindow = options.maxPerWindow ?? options.MAX_PER_WINDOW ?? RATE_LIMIT_CONFIG.MAX_PER_WINDOW;
    this.cooldownMs = options.cooldownMs ?? options.COOLDOWN_MS ?? RATE_LIMIT_CONFIG.COOLDOWN_MS;
    this.maxStoreSize = options.maxStoreSize ?? options.MAX_STORE_SIZE ?? RATE_LIMIT_CONFIG.MAX_STORE_SIZE;

    const baseDir = path.join(os.tmpdir(), 'palluvo_rate_limits');
    if (!fs.existsSync(baseDir)) {
      try {
        fs.mkdirSync(baseDir, { recursive: true });
      } catch {}
    }
    this.storeFilePath = path.join(baseDir, 'contact_limits.json');
    this.lockFilePath = path.join(baseDir, 'contact_limits.lock');
  }

  private withLock<T>(fn: () => T): T {
    const maxWaitMs = 5000;
    const start = Date.now();
    let fd: number | null = null;

    while (fd === null) {
      try {
        fd = fs.openSync(this.lockFilePath, 'wx');
      } catch (err: any) {
        if (err && err.code === 'EEXIST') {
          try {
            const stat = fs.statSync(this.lockFilePath);
            if (Date.now() - stat.mtimeMs > 10000) {
              try { fs.unlinkSync(this.lockFilePath); } catch {}
            }
          } catch {}

          if (Date.now() - start > maxWaitMs) {
            try { fs.unlinkSync(this.lockFilePath); } catch {}
          }
          const pauseUntil = Date.now() + 15;
          while (Date.now() < pauseUntil) {}
        } else {
          throw err;
        }
      }
    }

    try {
      return fn();
    } finally {
      try { fs.closeSync(fd); } catch {}
      try { fs.unlinkSync(this.lockFilePath); } catch {}
    }
  }

  async consumeKeys(keys: string[], now: number = Date.now()): Promise<RateLimitResult> {
    const validKeys = [...new Set(keys.filter((k) => typeof k === 'string' && k.trim().length > 0))];
    if (validKeys.length === 0) {
      return { allowed: true };
    }

    return this.withLock(() => {
      let data: Record<string, RateLimitRecord> = {};
      if (fs.existsSync(this.storeFilePath)) {
        try {
          const content = fs.readFileSync(this.storeFilePath, 'utf8');
          data = JSON.parse(content) || {};
        } catch {
          data = {};
        }
      }

      const windowStart = now - this.windowMs;

      // 1. Prune expired timestamps across all keys
      for (const [key, record] of Object.entries(data)) {
        record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
        if (record.timestamps.length === 0) {
          delete data[key];
        }
      }

      // 2. Capacity saturation check for new keys
      const currentKeys = Object.keys(data);
      const newKeys = validKeys.filter((k) => !data[k]);
      if (currentKeys.length + newKeys.length > this.maxStoreSize) {
        return {
          allowed: false,
          error: 'Service is temporarily experiencing high volume. Please wait a few moments before trying again or reach out to our concierge directly.',
        };
      }

      // 3. Multi-key evaluation for burst cooldown and window quota
      for (const key of validKeys) {
        const record = data[key];
        if (record && record.timestamps.length > 0) {
          const lastTs = record.timestamps[record.timestamps.length - 1];
          if (now - lastTs < this.cooldownMs) {
            const retryAfter = Math.ceil((this.cooldownMs - (now - lastTs)) / 1000);
            return {
              allowed: false,
              retryAfterSeconds: retryAfter,
              error: 'Please wait a moment before sending another message.',
            };
          }

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
      for (const key of validKeys) {
        let record = data[key];
        if (!record) {
          record = { timestamps: [], lastUpdated: now };
          data[key] = record;
        }
        record.timestamps.push(now);
        record.lastUpdated = now;
      }

      // 5. Atomic write to disk
      const tempPath = `${this.storeFilePath}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data), 'utf8');
      fs.renameSync(tempPath, this.storeFilePath);

      return { allowed: true };
    });
  }

  getStoreSize(): number {
    return this.withLock(() => {
      if (!fs.existsSync(this.storeFilePath)) return 0;
      try {
        const content = fs.readFileSync(this.storeFilePath, 'utf8');
        const data = JSON.parse(content) || {};
        return Object.keys(data).length;
      } catch {
        return 0;
      }
    });
  }

  pruneExpiredEntries(now: number = Date.now()): number {
    return this.withLock(() => {
      if (!fs.existsSync(this.storeFilePath)) return 0;
      try {
        const content = fs.readFileSync(this.storeFilePath, 'utf8');
        const data: Record<string, RateLimitRecord> = JSON.parse(content) || {};
        const windowStart = now - this.windowMs;
        let pruned = 0;
        for (const [key, record] of Object.entries(data)) {
          record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
          if (record.timestamps.length === 0) {
            delete data[key];
            pruned++;
          }
        }
        const tempPath = `${this.storeFilePath}.${process.pid}.${Date.now()}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(data), 'utf8');
        fs.renameSync(tempPath, this.storeFilePath);
        return pruned;
      } catch {
        return 0;
      }
    });
  }

  clear(): void {
    this.withLock(() => {
      try {
        if (fs.existsSync(this.storeFilePath)) {
          fs.unlinkSync(this.storeFilePath);
        }
      } catch {}
    });
  }
}

/**
 * In-memory atomic rate limiter with sorted multi-key locking.
 */
export class SharedRateLimiter implements RateLimitStore {
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

  private async withMultiLock<T>(keys: string[], fn: () => T | Promise<T>): Promise<T> {
    const sortedKeys = [...new Set(keys)].sort();
    sortedKeys.unshift('__global_capacity_reservation_lock__');

    for (const key of sortedKeys) {
      while (this.locks.has(key)) {
        try {
          await this.locks.get(key);
        } catch {
          // ignore
        }
      }
    }

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

  async consumeKeys(keys: string[], now: number = Date.now()): Promise<RateLimitResult> {
    const validKeys = [...new Set(keys.filter((k) => typeof k === 'string' && k.trim().length > 0))];
    if (validKeys.length === 0) {
      return { allowed: true };
    }

    return this.withMultiLock(validKeys, () => {
      return this.atomicEvaluateSync(validKeys, now);
    });
  }

  atomicEvaluateSync(keys: string[], now: number = Date.now()): RateLimitResult {
    const windowStart = now - this.windowMs;

    for (const key of keys) {
      const record = this.store.get(key);
      if (record) {
        record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
        if (record.timestamps.length === 0) {
          this.store.delete(key);
        }
      }
    }

    const newKeys = keys.filter((k) => !this.store.has(k));
    if (newKeys.length > 0 && this.store.size + newKeys.length > this.maxStoreSize) {
      this.pruneExpiredEntries(now);
      if (this.store.size + newKeys.length > this.maxStoreSize) {
        return {
          allowed: false,
          error: 'Service is temporarily experiencing high volume. Please wait a few moments before trying again or reach out to our concierge directly.',
        };
      }
    }

    for (const key of keys) {
      const record = this.store.get(key);
      if (record && record.timestamps.length > 0) {
        const lastTs = record.timestamps[record.timestamps.length - 1];
        if (now - lastTs < this.cooldownMs) {
          const retryAfter = Math.ceil((this.cooldownMs - (now - lastTs)) / 1000);
          return {
            allowed: false,
            retryAfterSeconds: retryAfter,
            error: 'Please wait a moment before sending another message.',
          };
        }

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

/**
 * Factory creating the production rate limit store.
 * Prefers Database RPC store if Supabase is active; otherwise uses cross-process atomic file store.
 */
export function createProductionRateLimitStore(options: RateLimiterOptions = {}): RateLimitStore {
  if (checkSupabaseServiceRoleConfigured()) {
    return new DatabaseRpcRateLimitStore();
  }
  return new CrossProcessRateLimitStore(options);
}

// Active singleton production store
let activeProductionStore: RateLimitStore | null = null;

export function getProductionStore(): RateLimitStore {
  if (!activeProductionStore) {
    activeProductionStore = createProductionRateLimitStore();
  }
  return activeProductionStore;
}

export function setProductionStore(store: RateLimitStore): void {
  activeProductionStore = store;
}

export const defaultContactRateLimiter = new SharedRateLimiter();

/**
 * Convenient helper for single identifier checks through the production store boundary.
 */
export async function checkContactRateLimit(
  identifier: string,
  now: number = Date.now()
): Promise<RateLimitResult> {
  return getProductionStore().consumeKeys([identifier], now);
}

/**
 * Multi-key atomic helper checking both IP and email together through the production store boundary.
 */
export async function checkContactRateLimitMulti(
  { ip, email }: { ip?: string; email?: string },
  now: number = Date.now()
): Promise<RateLimitResult> {
  const keys: string[] = [];
  if (ip && ip !== 'unknown') keys.push(`ip:${ip}`);
  if (email) keys.push(`email:${email}`);
  return getProductionStore().consumeKeys(keys, now);
}

export async function resetRateLimitStore(): Promise<void> {
  const store = getProductionStore();
  if (store.clear) {
    await store.clear();
  }
}

export async function pruneExpiredEntries(now: number = Date.now()): Promise<number> {
  const store = getProductionStore();
  if (store.pruneExpiredEntries) {
    return await store.pruneExpiredEntries(now);
  }
  return 0;
}

export async function getRateLimitStoreSize(): Promise<number> {
  const store = getProductionStore();
  if (store.getStoreSize) {
    return await store.getStoreSize();
  }
  return 0;
}
