import crypto from 'node:crypto';
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

export const ADMISSION_LIMIT_CONFIG = {
  WINDOW_MS: 60 * 1000, // 1 minute sliding window
  MAX_ADMISSIONS_PER_IP: 15, // Max 15 submissions per minute per IP admission limit
  MAX_GLOBAL_ADMISSIONS: 120, // Max 120 submissions per minute globally across all IPs (WAF/flood protection)
  MAX_MAP_SIZE: 1000, // Strict bound to prevent unbound memory growth from rotating IPs
} as const;

interface AdmissionRecord {
  timestamps: number[];
  lastUpdated: number;
}

interface SharedAdmissionData {
  globalTimestamps: number[];
  ipRecords: Record<string, AdmissionRecord>;
}

/**
 * Cross-Process File-Backed Atomic Admission Store.
 * Shares the global admission window and per-IP admission tracking across
 * independent Node worker processes/threads and serverless instances using atomic file locking.
 */
export class CrossProcessAdmissionStore {
  readonly filePath: string;
  readonly lockFilePath: string;

  constructor(baseDir?: string) {
    const dir = baseDir || path.join(os.tmpdir(), 'palluvo_rate_limits');
    if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    this.filePath = path.join(dir, 'admission_store.json');
    this.lockFilePath = path.join(dir, 'admission_store.lock');
  }

  private withLock<T>(fn: () => T): T {
    const maxWaitMs = 5000;
    const start = Date.now();
    let fd: number | null = null;

    while (fd === null) {
      try {
        fd = fs.openSync(this.lockFilePath, 'wx');
      } catch (err: any) {
        if (
          err &&
          (err.code === 'EEXIST' ||
            err.code === 'EPERM' ||
            err.code === 'EBUSY' ||
            err.code === 'EACCES')
        ) {
          try {
            const stat = fs.statSync(this.lockFilePath);
            if (Date.now() - stat.mtimeMs > 10000) {
              try { fs.unlinkSync(this.lockFilePath); } catch {}
            }
          } catch {}

          if (Date.now() - start > maxWaitMs) {
            try { fs.unlinkSync(this.lockFilePath); } catch {}
          }
          const pauseUntil = Date.now() + 10 + Math.floor(Math.random() * 10);
          while (Date.now() < pauseUntil) {}
        } else {
          throw err;
        }
      }
    }

    try {
      return fn();
    } finally {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch {}
      }
      try { fs.unlinkSync(this.lockFilePath); } catch {}
    }
  }

  private readData(): SharedAdmissionData {
    if (!fs.existsSync(this.filePath)) {
      return { globalTimestamps: [], ipRecords: {} };
    }
    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(content);
      return {
        globalTimestamps: Array.isArray(parsed?.globalTimestamps) ? parsed.globalTimestamps : [],
        ipRecords: parsed?.ipRecords && typeof parsed.ipRecords === 'object' ? parsed.ipRecords : {},
      };
    } catch {
      return { globalTimestamps: [], ipRecords: {} };
    }
  }

  private writeData(data: SharedAdmissionData): void {
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data), 'utf8');
    fs.renameSync(tempPath, this.filePath);
  }

  checkAdmission({ ip }: { ip?: string }, now: number = Date.now()): RateLimitResult {
    return this.withLock(() => {
      const data = this.readData();
      const windowStart = now - ADMISSION_LIMIT_CONFIG.WINDOW_MS;

      // 1. Shared global WAF admission window across all instances/workers
      data.globalTimestamps = data.globalTimestamps.filter((ts) => ts > windowStart);
      if (data.globalTimestamps.length >= ADMISSION_LIMIT_CONFIG.MAX_GLOBAL_ADMISSIONS) {
        const retryAfter = Math.ceil(
          (data.globalTimestamps[0] + ADMISSION_LIMIT_CONFIG.WINDOW_MS - now) / 1000
        );
        return {
          allowed: false,
          retryAfterSeconds: retryAfter,
          error:
            'Inquiry service is receiving unusually high traffic. Please wait a moment or contact our atelier directly via phone or WhatsApp.',
        };
      }

      if (!ip || ip === 'unknown') {
        data.globalTimestamps.push(now);
        this.writeData(data);
        return { allowed: true };
      }

      // 2. Per-IP admission limit
      let record: AdmissionRecord | undefined = data.ipRecords[ip];
      if (record) {
        record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
        if (record.timestamps.length === 0) {
          delete data.ipRecords[ip];
          record = undefined;
        }
      }

      // Memory/capacity bounding on ipRecords
      const currentKeys = Object.keys(data.ipRecords);
      if (!record && currentKeys.length >= ADMISSION_LIMIT_CONFIG.MAX_MAP_SIZE) {
        // Sweep expired
        for (const [k, rec] of Object.entries(data.ipRecords)) {
          rec.timestamps = rec.timestamps.filter((ts) => ts > windowStart);
          if (rec.timestamps.length === 0) {
            delete data.ipRecords[k];
          }
        }
        const remainingKeys = Object.keys(data.ipRecords);
        if (remainingKeys.length >= ADMISSION_LIMIT_CONFIG.MAX_MAP_SIZE) {
          const needed = remainingKeys.length + 1 - ADMISSION_LIMIT_CONFIG.MAX_MAP_SIZE;
          const oldest = Object.entries(data.ipRecords)
            .sort((a, b) => a[1].lastUpdated - b[1].lastUpdated)
            .slice(0, needed)
            .map(([k]) => k);
          for (const k of oldest) {
            delete data.ipRecords[k];
          }
        }
      }

      if (record && record.timestamps.length >= ADMISSION_LIMIT_CONFIG.MAX_ADMISSIONS_PER_IP) {
        const oldest = record.timestamps[0];
        const retryAfter = Math.ceil((oldest + ADMISSION_LIMIT_CONFIG.WINDOW_MS - now) / 1000);
        return {
          allowed: false,
          retryAfterSeconds: retryAfter,
          error:
            'Too many inquiries received from your connection. Please wait a moment before trying again.',
        };
      }

      if (!record) {
        record = { timestamps: [now], lastUpdated: now };
        data.ipRecords[ip] = record;
      } else {
        record.timestamps.push(now);
        record.lastUpdated = now;
      }

      data.globalTimestamps.push(now);
      this.writeData(data);
      return { allowed: true };
    });
  }

  pruneExpired(now: number = Date.now()): number {
    return this.withLock(() => {
      const data = this.readData();
      const windowStart = now - ADMISSION_LIMIT_CONFIG.WINDOW_MS;
      data.globalTimestamps = data.globalTimestamps.filter((ts) => ts > windowStart);
      let pruned = 0;
      for (const [ip, record] of Object.entries(data.ipRecords)) {
        record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
        if (record.timestamps.length === 0) {
          delete data.ipRecords[ip];
          pruned++;
        }
      }
      this.writeData(data);
      return pruned;
    });
  }

  getTrackerSize(): number {
    return this.withLock(() => {
      const data = this.readData();
      return Object.keys(data.ipRecords).length;
    });
  }

  getGlobalCount(): number {
    return this.withLock(() => {
      const data = this.readData();
      return data.globalTimestamps.length;
    });
  }

  clear(): void {
    this.withLock(() => {
      try {
        if (fs.existsSync(this.filePath)) {
          fs.unlinkSync(this.filePath);
        }
      } catch {}
    });
  }
}

// Active singleton cross-process admission store
export const defaultAdmissionStore = new CrossProcessAdmissionStore();

/**
 * Periodically or on-demand sweeps and deletes stale IP entries and global timestamps older than the sliding window.
 * Ensures the shared admission store does not accumulate stale client addresses indefinitely.
 */
export function pruneExpiredAdmissions(now: number = Date.now()): number {
  return defaultAdmissionStore.pruneExpired(now);
}

// Background sweep in warm Node process environments
if (typeof setInterval !== 'undefined') {
  const sweepTimer = setInterval(() => {
    pruneExpiredAdmissions();
  }, ADMISSION_LIMIT_CONFIG.WINDOW_MS);
  if (typeof sweepTimer.unref === 'function') {
    sweepTimer.unref();
  }
}

/**
 * Independent abuse/WAF admission limit at the application boundary.
 * Throttles rapid bursts from a single source connection as well as global volumetric floods
 * before inquiry persistence, backed by shared atomic cross-process state.
 */
export function checkAdmissionLimit(
  { ip }: { ip?: string },
  now: number = Date.now()
): RateLimitResult {
  return defaultAdmissionStore.checkAdmission({ ip }, now);
}

export function getAdmissionTrackerSize(): number {
  return defaultAdmissionStore.getTrackerSize();
}

export function getGlobalAdmissionCount(): number {
  return defaultAdmissionStore.getGlobalCount();
}

export function resetAdmissionTracker(): void {
  defaultAdmissionStore.clear();
}

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

export function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.npm_lifecycle_event === 'test' ||
    (Array.isArray(process.execArgv) && process.execArgv.includes('--test')) ||
    (Array.isArray(process.argv) && process.argv.includes('--test'))
  );
}

/**
 * Resolves the high-entropy server secret for HMAC keying.
 * Consistently supports RATE_LIMIT_PEPPER, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_SECRET_KEY.
 * Never falls back to a public or guessable constant.
 * Fails closed (throws) if high-entropy server credential is absent in production or when Supabase is configured.
 */
export function getRateLimitPepper(): string {
  const secret =
    process.env.RATE_LIMIT_PEPPER ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (secret && typeof secret === 'string') {
    const trimmed = secret.trim();
    if (
      trimmed.length >= 16 &&
      !trimmed.includes('placeholder') &&
      !trimmed.includes('your_supabase_service_role_key')
    ) {
      return trimmed;
    }
  }

  // In test environments without explicit secrets, provide an isolated test key unless simulating absent secret
  if (isTestEnvironment() && !process.env.TEST_SIMULATE_NO_SECRET) {
    return 'isolated_test_suite_pepper_key_1234567890abcdef';
  }

  // In local development fallback only when Supabase is completely unconfigured
  if (
    !checkSupabaseConfigured() &&
    process.env.NODE_ENV !== 'production' &&
    !process.env.TEST_SIMULATE_NO_SECRET
  ) {
    return 'local_dev_rate_limit_pepper_unconfigured_supabase';
  }

  throw new Error(
    'Missing required high-entropy rate limit secret: RATE_LIMIT_PEPPER, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_SECRET_KEY must be configured.'
  );
}

/**
 * Creates a non-reversible HMAC-SHA256 keyed digest of identifier keys (IP/email)
 * using a high-entropy server secret. Prevents storing or exposing raw personal identifiers.
 */
export function hashRateLimitIdentifier(identifier: string): string {
  if (typeof identifier !== 'string' || identifier.length === 0) {
    return '';
  }
  if (identifier.startsWith('digest:sha256:')) {
    return identifier;
  }
  const pepper = getRateLimitPepper();
  const hmac = crypto
    .createHmac('sha256', pepper)
    .update(identifier.trim().toLowerCase())
    .digest('hex');
  return `digest:sha256:${hmac}`;
}

export function checkSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) return false;
  if (url.includes('placeholder') || key.includes('placeholder')) return false;
  if (url.includes('your_supabase_project_url') || key.includes('your_supabase_anon_key')) return false;

  return (
    url.startsWith('https://') ||
    url.startsWith('http://127.0.0.1') ||
    url.startsWith('http://localhost')
  );
}

export function checkSupabaseServiceRoleConfigured(): boolean {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) return false;
  if (serviceKey.includes('placeholder') || serviceKey.includes('your_supabase_service_role_key')) return false;
  return serviceKey.trim().length > 10;
}

/**
 * Checks whether the deployment requires and enforces confirmed email verification in Supabase Auth.
 * Supabase allows projects to have "Confirm email" disabled, where any caller can register an address
 * and immediately receive a session without proving mailbox access.
 * To prevent quota poisoning on public forms, shared email rate limits are strictly gated behind this deployment requirement.
 */
export function isEmailConfirmationEnforced(): boolean {
  const env =
    process.env.REQUIRE_EMAIL_CONFIRMATION ||
    process.env.SUPABASE_AUTH_CONFIRM_EMAIL;
  if (!env) return false;
  const val = env.trim().toLowerCase();
  return val === 'true' || val === '1';
}

/**
 * Verifies whether the submitted email address has proven mailbox access.
 * If the deployment does not enforce email confirmation (e.g. Supabase project with "Confirm Email" disabled,
 * where signups are immediately issued sessions without email delivery), authenticated sessions do NOT
 * prove mailbox access and must not be used to apply shared email quotas (which would allow an attacker
 * to register an unused victim address and poison their quota).
 *
 * Strict mailbox verification requires:
 * 1. Confirmed-email configuration is enforced as a deployment requirement (`isEmailConfirmationEnforced() === true`).
 * 2. Authenticated user object exists with a valid email.
 * 3. The user's `email_confirmed_at` timestamp is present and verified.
 * 4. The user's email matches the submitted email.
 */
export function isMailboxVerified(
  user: { email?: string; email_confirmed_at?: string | null } | null | undefined,
  submittedEmail: string
): boolean {
  if (!isEmailConfirmationEnforced()) {
    return false;
  }
  if (!user || !user.email) {
    return false;
  }
  if (
    !user.email_confirmed_at ||
    typeof user.email_confirmed_at !== 'string' ||
    user.email_confirmed_at.trim().length === 0
  ) {
    return false;
  }
  return (user.email || '').toLowerCase().trim() === (submittedEmail || '').toLowerCase().trim();
}


/**
 * Fail-closed store used when production environment is misconfigured
 * (e.g., Supabase is active but SUPABASE_SERVICE_ROLE_KEY is absent).
 */
export class MisconfiguredRateLimitStore implements RateLimitStore {
  async consumeKeys(): Promise<RateLimitResult> {
    console.error(
      '[RateLimiter] Configuration error: Supabase is configured in production but SUPABASE_SERVICE_ROLE_KEY is absent. Failing closed to avoid per-instance storage leak.'
    );
    return {
      allowed: false,
      error: 'Inquiry service is temporarily unavailable due to a server configuration issue. Please connect with our concierge directly.',
    };
  }

  getStoreSize(): number {
    return 0;
  }

  pruneExpiredEntries(): number {
    return 0;
  }

  clear(): void {}
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
    // Guaranteed background cleanup interval in warm processes
    if (typeof setInterval !== 'undefined') {
      const timer = setInterval(() => {
        this.pruneExpiredEntries().catch(() => {});
      }, RATE_LIMIT_CONFIG.WINDOW_MS);
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    }
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
    const validKeys = [
      ...new Set(
        keys
          .filter((k) => typeof k === 'string' && k.trim().length > 0)
          .map(hashRateLimitIdentifier)
      ),
    ];
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

  async pruneExpiredEntries(): Promise<number> {
    try {
      const supabase = await this.getClient();
      if (!supabase) return 0;
      const { data, error } = await supabase.rpc('prune_expired_contact_rate_limits');
      if (error) {
        console.error('[DatabaseRpcRateLimitStore] prune error:', error);
        return 0;
      }
      return typeof data === 'number' ? data : 0;
    } catch {
      return 0;
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
    if (!fs.existsSync(/*turbopackIgnore: true*/ baseDir)) {
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
        if (
          err &&
          (err.code === 'EEXIST' ||
            err.code === 'EPERM' ||
            err.code === 'EBUSY' ||
            err.code === 'EACCES')
        ) {
          try {
            const stat = fs.statSync(this.lockFilePath);
            if (Date.now() - stat.mtimeMs > 10000) {
              try { fs.unlinkSync(this.lockFilePath); } catch {}
            }
          } catch {}

          if (Date.now() - start > maxWaitMs) {
            try { fs.unlinkSync(this.lockFilePath); } catch {}
          }
          const pauseUntil = Date.now() + 10 + Math.floor(Math.random() * 10);
          while (Date.now() < pauseUntil) {}
        } else {
          throw err;
        }
      }
    }

    try {
      return fn();
    } finally {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch {}
      }
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

      // 2. Multi-key evaluation for burst cooldown and window quota
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

      // 3. Resilient capacity strategy for new keys:
      // Prevent untrusted public submissions from globally exhausting the shared key budget
      const currentKeys = Object.keys(data);
      const newKeys = validKeys.filter((k) => !data[k]);
      if (currentKeys.length + newKeys.length > this.maxStoreSize) {
        const needed = currentKeys.length + newKeys.length - this.maxStoreSize;
        const keysToEvict: string[] = [];
        const eligibleEntries = Object.entries(data).filter(([k]) => !validKeys.includes(k));

        // Phase 1: Evict un-throttled entries (single-use or low-frequency synthetic keys from rotated submissions)
        // Strictly protects active throttled quotas (keys with >= maxPerWindow or within burst cooldown)
        const unthrottledEntries = eligibleEntries
          .filter(([, rec]) => {
            const isThrottled = rec.timestamps.length >= this.maxPerWindow;
            const inCooldown =
              rec.timestamps.length > 0 &&
              now - rec.timestamps[rec.timestamps.length - 1] < this.cooldownMs;
            return !isThrottled && !inCooldown;
          })
          .sort((a, b) => {
            if (a[1].timestamps.length !== b[1].timestamps.length) {
              return a[1].timestamps.length - b[1].timestamps.length;
            }
            return a[1].lastUpdated - b[1].lastUpdated;
          });

        for (const [k] of unthrottledEntries) {
          if (keysToEvict.length >= needed) break;
          keysToEvict.push(k);
        }

        for (const k of keysToEvict) {
          delete data[k];
        }

        // Enforce hard storage capacity bound: if store remains full because remaining entries are actively throttled,
        // do NOT insert new keys. Reject while strictly preserving all active throttled quotas intact.
        if (Object.keys(data).length + newKeys.length > this.maxStoreSize) {
          return {
            allowed: false,
            retryAfterSeconds: 60,
            error: 'Service is currently experiencing high inquiry volume. Please try again in a few moments or reach out to our concierge directly.',
          };
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

    // 2. Multi-key quota and cooldown evaluation
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

    // 3. Resilient capacity strategy for new keys:
    // Prevent untrusted public submissions from globally exhausting the shared key budget
    const newKeys = keys.filter((k) => !this.store.has(k));
    if (newKeys.length > 0 && this.store.size + newKeys.length > this.maxStoreSize) {
      this.pruneExpiredEntries(now);
      if (this.store.size + newKeys.length > this.maxStoreSize) {
        const needed = this.store.size + newKeys.length - this.maxStoreSize;
        const keysToEvict: string[] = [];
        const eligibleEntries = Array.from(this.store.entries()).filter(([k]) => !keys.includes(k));

        // Phase 1: Evict un-throttled entries (single-use or low-frequency synthetic keys from rotated submissions)
        // Strictly protects actively throttled quotas (keys with >= maxPerWindow or within burst cooldown)
        const unthrottledEntries = eligibleEntries
          .filter(([, rec]) => {
            const isThrottled = rec.timestamps.length >= this.maxPerWindow;
            const inCooldown =
              rec.timestamps.length > 0 &&
              now - rec.timestamps[rec.timestamps.length - 1] < this.cooldownMs;
            return !isThrottled && !inCooldown;
          })
          .sort((a, b) => {
            if (a[1].timestamps.length !== b[1].timestamps.length) {
              return a[1].timestamps.length - b[1].timestamps.length;
            }
            return a[1].lastUpdated - b[1].lastUpdated;
          });

        for (const [k] of unthrottledEntries) {
          if (keysToEvict.length >= needed) break;
          keysToEvict.push(k);
        }

        for (const k of keysToEvict) {
          this.store.delete(k);
        }

        // Enforce hard storage capacity bound: if store remains full because remaining entries are actively throttled,
        // do NOT insert new keys. Reject while strictly preserving all active throttled quotas intact.
        if (this.store.size + newKeys.length > this.maxStoreSize) {
          return {
            allowed: false,
            retryAfterSeconds: 60,
            error: 'Service is currently experiencing high inquiry volume. Please try again in a few moments or reach out to our concierge directly.',
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
  const isSupabase = checkSupabaseConfigured();
  const hasServiceRole = checkSupabaseServiceRoleConfigured();

  if (isSupabase) {
    if (!hasServiceRole) {
      // Fail closed in production when the service-role key is missing instead of silently using per-instance storage
      return new MisconfiguredRateLimitStore();
    }
    return new DatabaseRpcRateLimitStore();
  }

  // Local development fallback only (when Supabase is completely unconfigured)
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
  try {
    const hashed = hashRateLimitIdentifier(identifier);
    return await getProductionStore().consumeKeys([hashed], now);
  } catch (error) {
    console.error('[RateLimiter] Configuration error in checkContactRateLimit:', error);
    return {
      allowed: false,
      error: 'Inquiry service is temporarily unavailable due to a server configuration issue. Please connect with our concierge directly.',
    };
  }
}

/**
 * Multi-key atomic helper checking IP and verified email through the production store boundary.
 * Identifiers are mapped to non-reversible keyed HMAC digests before consumption.
 * To prevent quota poisoning (where malicious callers submit victim email addresses to lock them out),
 * caller-chosen form emails are only hard rate-limited if mailbox ownership is verified (isEmailVerified = true).
 */
export async function checkContactRateLimitMulti(
  {
    ip,
    email,
    isEmailVerified = false,
  }: {
    ip?: string;
    email?: string;
    isEmailVerified?: boolean;
  },
  now: number = Date.now()
): Promise<RateLimitResult> {
  try {
    const keys: string[] = [];
    if (ip && ip !== 'unknown') {
      keys.push(hashRateLimitIdentifier(`ip:${ip}`));
    }
    // Only enforce shared hard rate-limiting on email if ownership is verified.
    // Prevents unverified public submissions from poisoning a victim's quota.
    if (email && isEmailVerified) {
      keys.push(hashRateLimitIdentifier(`email:${email}`));
    }
    if (keys.length === 0) {
      return { allowed: true };
    }
    return await getProductionStore().consumeKeys(keys, now);
  } catch (error) {
    console.error('[RateLimiter] Configuration error in checkContactRateLimitMulti:', error);
    return {
      allowed: false,
      error: 'Inquiry service is temporarily unavailable due to a server configuration issue. Please connect with our concierge directly.',
    };
  }
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

/**
 * Durable scheduled cleanup handler for serverless and cron environments.
 * Authenticates via CRON_SECRET or service credentials and enforces bounded retention.
 */
export async function handlePruneRateLimits(req: Request): Promise<Response> {
  const authHeader = req.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  // Verify authorization
  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) ||
    (!cronSecret && !serviceRoleKey && process.env.NODE_ENV !== 'production');

  if (!isAuthorized) {
    return Response.json(
      { error: 'Unauthorized: Invalid or missing cron secret authorization header.' },
      { status: 401 }
    );
  }

  try {
    let deletedCount = 0;
    try {
      const { createAdminClient } = await import('@/utils/supabase/admin');
      const admin = await createAdminClient();
      if (admin) {
        const { data, error } = await admin.rpc('prune_expired_contact_rate_limits');
        if (error) {
          console.error('[Cron Prune] RPC error:', error);
          return Response.json({ error: error.message }, { status: 500 });
        }
        deletedCount = typeof data === 'number' ? data : 0;
      } else {
        deletedCount = await pruneExpiredEntries();
      }
    } catch {
      deletedCount = await pruneExpiredEntries();
    }

    return Response.json({
      success: true,
      pruned: deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron Prune] Unexpected failure during rate limit pruning:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Pruning failed' },
      { status: 500 }
    );
  }
}

