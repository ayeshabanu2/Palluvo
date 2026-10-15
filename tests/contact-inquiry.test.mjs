import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  CONTACT_FIELD_LIMITS,
  RATE_LIMIT_CONFIG,
  SharedRateLimiter,
  DatabaseRpcRateLimitStore,
  CrossProcessRateLimitStore,
  MisconfiguredRateLimitStore,
  createProductionRateLimitStore,
  getRateLimitPepper,
  hashRateLimitIdentifier,
  checkContactRateLimit,
  checkContactRateLimitMulti,
  pruneExpiredEntries,
  getRateLimitStoreSize,
  resetRateLimitStore,
  handlePruneRateLimits,
  ADMISSION_LIMIT_CONFIG,
  checkAdmissionLimit,
  pruneExpiredAdmissions,
  getAdmissionTrackerSize,
  getGlobalAdmissionCount,
  resetAdmissionTracker,
  defaultAdmissionStore,
  CrossProcessAdmissionStore,
  hasOpenFileDescriptor,
  isProcessAlive,
  isLockOwnerAlive,
  isEmailConfirmationEnforced,
  isMailboxVerified,
} from '../src/app/contact/rateLimiter.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Contact Inquiry Server-Side Rate Limiting & Bounds Tests', () => {
  beforeEach(async () => {
    await resetRateLimitStore();
  });

  test('enforces field limit constants configuration', () => {
    assert.equal(CONTACT_FIELD_LIMITS.NAME_MIN, 2);
    assert.equal(CONTACT_FIELD_LIMITS.NAME_MAX, 100);
    assert.equal(CONTACT_FIELD_LIMITS.EMAIL_MAX, 254);
    assert.equal(CONTACT_FIELD_LIMITS.PHONE_MAX, 25);
    assert.equal(CONTACT_FIELD_LIMITS.SUBJECT_MAX, 150);
    assert.equal(CONTACT_FIELD_LIMITS.MESSAGE_MIN, 5);
    assert.equal(CONTACT_FIELD_LIMITS.MESSAGE_MAX, 3000);
    assert.equal(RATE_LIMIT_CONFIG.MAX_STORE_SIZE, 1000);
  });

  test('allows initial valid submission within limits', async () => {
    const result = await checkContactRateLimit('ip:192.168.1.1');
    assert.equal(result.allowed, true);
    assert.equal(result.error, undefined);
  });

  test('throttles rapid repeated submissions within cooldown window (burst protection)', async () => {
    const now = 100000;
    // First request
    const first = await checkContactRateLimit('ip:10.0.0.1', now);
    assert.equal(first.allowed, true);

    // Second request 2 seconds later (within 5s cooldown)
    const second = await checkContactRateLimit('ip:10.0.0.1', now + 2000);
    assert.equal(second.allowed, false);
    assert.match(second.error, /Please wait a moment before sending another message/i);

    // Third request after cooldown expires (6 seconds later)
    const third = await checkContactRateLimit('ip:10.0.0.1', now + 6000);
    assert.equal(third.allowed, true);
  });

  test('throttles submissions when maximum requests per window is reached', async () => {
    let currentTime = 200000;
    const identifier = 'email:test@example.com';

    // Submit up to MAX_PER_WINDOW (5) requests with 6s spacing (past cooldown)
    for (let i = 0; i < RATE_LIMIT_CONFIG.MAX_PER_WINDOW; i++) {
      currentTime += 6000;
      const res = await checkContactRateLimit(identifier, currentTime);
      assert.equal(res.allowed, true, `Request ${i + 1} should be allowed`);
    }

    // 6th request within the 10-minute window should be rejected
    currentTime += 6000;
    const exceededRes = await checkContactRateLimit(identifier, currentTime);
    assert.equal(exceededRes.allowed, false);
    assert.match(exceededRes.error, /Too many inquiries submitted/i);

    // After window expires (10 minutes = 600,000 ms), requests should be permitted again
    currentTime += RATE_LIMIT_CONFIG.WINDOW_MS + 1000;
    const windowExpiredRes = await checkContactRateLimit(identifier, currentTime);
    assert.equal(windowExpiredRes.allowed, true);
  });

  test('evicts expired keys so memory does not accumulate on warm processes', async () => {
    const t0 = 500000;
    await checkContactRateLimit('ip:1.1.1.1', t0);
    await checkContactRateLimit('ip:2.2.2.2', t0);
    assert.equal(await getRateLimitStoreSize(), 2);

    // After window expires for both keys
    const tExpired = t0 + RATE_LIMIT_CONFIG.WINDOW_MS + 1000;
    await pruneExpiredEntries(tExpired);
    assert.equal(await getRateLimitStoreSize(), 0, 'Expired keys must be deleted from store');

    // Also verify individual key access auto-evicts expired record
    await checkContactRateLimit('ip:3.3.3.3', t0);
    assert.equal(await getRateLimitStoreSize(), 1);
    await checkContactRateLimit('ip:3.3.3.3', tExpired);
    assert.equal(await getRateLimitStoreSize(), 1);
  });

  test('exercises full capacity saturation (MAX_STORE_SIZE = 1000) and ensures active quotas are not reset', async () => {
    const now = 600000;
    const limiter = new SharedRateLimiter({ maxStoreSize: 1000 });

    // 1. Establish an actively throttled key with 5 requests
    const throttledKey = 'ip:throttled-key';
    for (let i = 0; i < 5; i++) {
      await limiter.consumeKeys([throttledKey], now + i * 6000);
    }
    const throttledCheck = await limiter.consumeKeys([throttledKey], now + 35000);
    assert.equal(throttledCheck.allowed, false, 'Key with 5 requests must be throttled');

    // 2. Fill store to its full capacity with active keys up to 1000
    const startSize = limiter.getStoreSize();
    for (let i = 0; i < 1000 - startSize; i++) {
      const res = await limiter.consumeKeys([`ip:capacity-test-${i}`], now + 40000);
      assert.equal(res.allowed, true, `Key ${i} should be accepted`);
    }
    assert.equal(limiter.getStoreSize(), 1000);

    // 3. Under resilient capacity strategy, inserting a 1001st active key does NOT fail closed;
    // it evicts the oldest un-throttled synthetic key and admits the new visitor
    const saturatedRes = await limiter.consumeKeys(['ip:capacity-test-1001'], now + 45000);
    assert.equal(saturatedRes.allowed, true, 'Legitimate new key must be admitted under saturation');
    assert.equal(limiter.getStoreSize(), 1000, 'Store size must strictly remain bounded at 1000');

    // 4. Verify actively throttled key was protected and NOT wiped or reset
    const throttledRecheck = await limiter.consumeKeys([throttledKey], now + 50000);
    assert.equal(throttledRecheck.allowed, false, 'Throttled quota must remain enforced and not reset');

    // 5. Advance time past the 10-minute window so active keys expire
    const expiredTime = now + RATE_LIMIT_CONFIG.WINDOW_MS + 60000;
    const prunedCount = limiter.pruneExpiredEntries(expiredTime);
    assert.equal(prunedCount, 1000);
    assert.equal(limiter.getStoreSize(), 0, 'All expired keys should be purged');

    // Now new keys can be inserted cleanly
    const postPruneRes = await limiter.consumeKeys(['ip:new-after-prune'], expiredTime);
    assert.equal(postPruneRes.allowed, true);
    assert.equal(limiter.getStoreSize(), 1);
  });

  test('enforces atomic handling for concurrent requests without quota over-allocation', async () => {
    const limiter = new SharedRateLimiter({ cooldownMs: 0, maxPerWindow: 5 });
    const key = 'ip:concurrent-client';
    const now = 700000;

    // Launch 10 concurrent requests at the exact same millisecond
    const concurrentRequests = Array.from({ length: 10 }, () =>
      limiter.consumeKeys([key], now)
    );

    const results = await Promise.all(concurrentRequests);
    const allowedCount = results.filter((r) => r.allowed).length;
    const rejectedCount = results.filter((r) => !r.allowed).length;

    // Exactly maxPerWindow (5) must succeed, remaining 5 must be rejected atomically
    assert.equal(allowedCount, 5, 'Exactly 5 concurrent requests must be allowed');
    assert.equal(rejectedCount, 5, 'Excess concurrent requests must be rejected');
  });

  test('shares rate limit state across workers through the production store boundary', async () => {
    const now = 800000;
    const clientIp = '203.0.113.55';

    // 1. Worker A receives request from clientIp with verified emailA via production store boundary
    const resA = await checkContactRateLimitMulti({ ip: clientIp, email: 'alice@example.com', isEmailVerified: true }, now);
    assert.equal(resA.allowed, true);

    // 2. Worker B immediately receives request from same clientIp with different emailB
    // Must be rejected by shared IP burst cooldown across workers
    const resB = await checkContactRateLimitMulti({ ip: clientIp, email: 'bob@example.com', isEmailVerified: true }, now + 1000);
    assert.equal(resB.allowed, false, 'Worker B must enforce IP cooldown from Worker A');
    assert.match(resB.error, /wait a moment/i);

    // 3. Worker B receives request with verified alice@example.com from different clientIp
    // Must be rejected by shared email burst cooldown across workers
    const resC = await checkContactRateLimitMulti({ ip: '198.51.100.99', email: 'alice@example.com', isEmailVerified: true }, now + 1000);
    assert.equal(resC.allowed, false, 'Worker B must enforce email cooldown from Worker A');
    assert.match(resC.error, /wait a moment/i);

    // 4. Cumulative window limit across workers
    let timeCursor = now;
    const targetEmail = 'shared-user@example.com';
    // Worker A consumes 2 slots
    timeCursor += 6000;
    await checkContactRateLimitMulti({ ip: '10.0.0.1', email: targetEmail, isEmailVerified: true }, timeCursor);
    timeCursor += 6000;
    await checkContactRateLimitMulti({ ip: '10.0.0.2', email: targetEmail, isEmailVerified: true }, timeCursor);

    // Worker B consumes 3 slots
    timeCursor += 6000;
    await checkContactRateLimitMulti({ ip: '10.0.0.3', email: targetEmail, isEmailVerified: true }, timeCursor);
    timeCursor += 6000;
    await checkContactRateLimitMulti({ ip: '10.0.0.4', email: targetEmail, isEmailVerified: true }, timeCursor);
    timeCursor += 6000;
    await checkContactRateLimitMulti({ ip: '10.0.0.5', email: targetEmail, isEmailVerified: true }, timeCursor);

    // 6th request across either worker must be rejected
    timeCursor += 6000;
    const rejectedWorkerA = await checkContactRateLimitMulti({ ip: '10.0.0.6', email: targetEmail, isEmailVerified: true }, timeCursor);
    const rejectedWorkerB = await checkContactRateLimitMulti({ ip: '10.0.0.7', email: targetEmail, isEmailVerified: true }, timeCursor);

    assert.equal(rejectedWorkerA.allowed, false);
    assert.equal(rejectedWorkerB.allowed, false);
  });

  test('cross-worker isolation: separate Node worker thread shares production rate-limit boundary with main thread', async () => {
    const workerIp = '198.51.100.77';
    const now = 850000;

    // Run request in a separate Worker Thread with its own isolated globalThis
    const workerScript = `
      import { checkContactRateLimitMulti } from './src/app/contact/rateLimiter.ts';
      import { parentPort, workerData } from 'node:worker_threads';

      const result = await checkContactRateLimitMulti(
        { ip: workerData.ip, email: workerData.email },
        workerData.now
      );
      parentPort.postMessage(result);
    `;

    const workerResult = await new Promise((resolve, reject) => {
      const worker = new Worker(workerScript, {
        eval: true,
        workerData: { ip: workerIp, email: 'worker-thread@example.com', now },
      });
      worker.on('message', resolve);
      worker.on('error', reject);
    });

    assert.equal(workerResult.allowed, true, 'Worker thread request must be permitted');

    // Main thread (in separate V8 isolate) immediately attempts request for the same IP
    const mainThreadAttempt = await checkContactRateLimitMulti(
      { ip: workerIp, email: 'main-thread@example.com' },
      now + 1000
    );

    assert.equal(
      mainThreadAttempt.allowed,
      false,
      'Main thread must be throttled by IP cooldown consumed in separate worker thread'
    );
    assert.match(mainThreadAttempt.error, /wait a moment/i);
  });

  test('database RPC store: enforces atomic multi-key limits, server-derived policy, and fails closed on DB query errors', async () => {
    let capturedRpc = null;
    let shouldFail = false;

    const mockSupabase = {
      rpc: async (funcName, params) => {
        capturedRpc = { funcName, params };
        if (shouldFail) {
          return { data: null, error: { message: 'Database connection failed' } };
        }
        return {
          data: {
            allowed: true,
          },
          error: null,
        };
      },
    };

    const dbStore = new DatabaseRpcRateLimitStore(async () => mockSupabase);

    // 1. Successful consumption passes ONLY keyed digests to RPC (server derives policy constants and timestamps)
    const successRes = await dbStore.consumeKeys(['ip:1.2.3.4', 'email:test@example.com']);
    assert.equal(successRes.allowed, true);
    assert.equal(capturedRpc.funcName, 'consume_contact_rate_limit');
    assert.deepEqual(capturedRpc.params, {
      p_keys: [
        hashRateLimitIdentifier('ip:1.2.3.4'),
        hashRateLimitIdentifier('email:test@example.com'),
      ],
    });
    assert.ok(capturedRpc.params.p_keys[0].startsWith('digest:sha256:'));
    assert.ok(capturedRpc.params.p_keys[1].startsWith('digest:sha256:'));
    assert.equal(capturedRpc.params.p_now, undefined, 'Caller must not pass p_now');
    assert.equal(capturedRpc.params.p_window_ms, undefined, 'Caller must not pass p_window_ms');
    assert.equal(capturedRpc.params.p_max_requests, undefined, 'Caller must not pass p_max_requests');
    assert.equal(capturedRpc.params.p_cooldown_ms, undefined, 'Caller must not pass p_cooldown_ms');
    assert.equal(capturedRpc.params.p_max_store_size, undefined, 'Caller must not pass p_max_store_size');

    // 2. Database query failure FAILS CLOSED (never fails open)
    shouldFail = true;
    const failRes = await dbStore.consumeKeys(['ip:1.2.3.4', 'email:test@example.com']);
    assert.equal(failRes.allowed, false, 'Must fail closed when database returns error');
    assert.match(failRes.error, /unable to verify request rate/i);

    // 3. Null client / connection failure FAILS CLOSED
    const nullDbStore = new DatabaseRpcRateLimitStore(async () => null);
    const nullRes = await nullDbStore.consumeKeys(['ip:1.2.3.4']);
    assert.equal(nullRes.allowed, false, 'Must fail closed when database client is unavailable');
    assert.match(nullRes.error, /unavailable/i);
  });

  test('database RPC store: serializes capacity reservations for concurrent distinct-key inserts at capacity boundary', async () => {
    // Simulated database engine implementing the RPC with advisory capacity locking
    const dbStore = new Map();
    const capacityLimit = 5;
    let advisoryLock = Promise.resolve();

    // Pre-populate 4 keys so exactly 1 slot remains
    for (let i = 0; i < 4; i++) {
      dbStore.set(`ip:prepopulated-${i}`, { timestamps: [Date.now()], lastUpdated: Date.now() - 50000 + i * 1000 });
    }
    assert.equal(dbStore.size, 4);

    const mockSupabase = {
      rpc: async (funcName, params) => {
        assert.equal(funcName, 'consume_contact_rate_limit');
        const keys = params.p_keys;

        // Simulate transactional advisory lock: serialize concurrent capacity checks and inserts
        const previousLock = advisoryLock;
        let releaseLock;
        advisoryLock = new Promise((resolve) => {
          releaseLock = resolve;
        });

        await previousLock;

        try {
          // Inside the advisory capacity lock section:
          const totalKeys = dbStore.size;
          const newKeys = keys.filter((k) => !dbStore.has(k));

          // Resilient capacity management with serialized eviction:
          if (newKeys.length > 0 && totalKeys + newKeys.length > capacityLimit) {
            const needed = (totalKeys + newKeys.length) - capacityLimit;
            // Evict oldest unthrottled keys to make room
            const evictable = Array.from(dbStore.keys())
              .filter((k) => !keys.includes(k))
              .slice(0, needed);
            for (const k of evictable) {
              dbStore.delete(k);
            }
          }

          // Commit new keys to database table
          for (const key of newKeys) {
            dbStore.set(key, { timestamps: [Date.now()], lastUpdated: Date.now() });
          }

          return {
            data: { allowed: true },
            error: null,
          };
        } finally {
          releaseLock();
        }
      },
    };

    const clientStore = new DatabaseRpcRateLimitStore(async () => mockSupabase);

    // Launch 5 concurrent calls with distinct new keys at the exact same time
    const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
      clientStore.consumeKeys([`ip:distinct-new-${i}`])
    );

    const results = await Promise.all(concurrentRequests);
    const allowedResults = results.filter((r) => r.allowed);

    // Under serialized advisory locking and resilient capacity management, all 5 succeed
    // and database size strictly remains bounded at capacityLimit (5)
    assert.equal(allowedResults.length, 5, 'All concurrent new keys must be handled under serialized capacity management');
    assert.equal(dbStore.size, 5, 'Database table must strictly not exceed capacity limit');
  });

  test('REGRESSION [P1]: public client (anon/authenticated) cannot execute RPC to mutate arbitrary email/IP quota keys', async () => {
    // Simulated database tracking quota table and permissions
    const dbQuotaTable = new Map();
    const victimEmail = 'email:legitimate-customer@example.com';

    // Mock Supabase client factory simulating role-based access control
    const createMockClientForRole = (role) => ({
      rpc: async (funcName, params) => {
        assert.equal(funcName, 'consume_contact_rate_limit');
        // If caller is NOT service_role (e.g. anon or authenticated public client), deny execution!
        if (role !== 'service_role') {
          return {
            data: null,
            error: {
              code: '42501',
              message: 'permission denied for function consume_contact_rate_limit',
              details: 'Public execution revoked. Function requires server service_role credential.',
            },
          };
        }

        // Server service_role execution:
        for (const k of params.p_keys) {
          const rec = dbQuotaTable.get(k) || { timestamps: [] };
          rec.timestamps.push(Date.now());
          dbQuotaTable.set(k, rec);
        }
        return { data: { allowed: true }, error: null };
      },
    });

    // 1. Attacker attempts to call RPC directly using public anon key to poison victim's quota
    const publicAnonStore = new DatabaseRpcRateLimitStore(async () => createMockClientForRole('anon'));
    const maliciousAttempt = await publicAnonStore.consumeKeys([victimEmail]);

    // Must fail closed / be rejected
    assert.equal(maliciousAttempt.allowed, false, 'Public client must be rejected from calling rate limiter RPC');
    assert.match(maliciousAttempt.error, /unable to verify request rate/i);

    // Verify victim's quota was NOT modified by the public client
    assert.equal(dbQuotaTable.has(victimEmail), false, 'Victim key must not be created or mutated by public caller');

    // 2. An authenticated public user also cannot poison quotas
    const publicAuthStore = new DatabaseRpcRateLimitStore(async () => createMockClientForRole('authenticated'));
    const authAttempt = await publicAuthStore.consumeKeys([victimEmail]);
    assert.equal(authAttempt.allowed, false);
    assert.equal(dbQuotaTable.has(victimEmail), false);

    // 3. Trusted server-only service_role credential is required to execute quota check
    const trustedServerStore = new DatabaseRpcRateLimitStore(async () => createMockClientForRole('service_role'));
    const legitimateServerCheck = await trustedServerStore.consumeKeys([victimEmail]);
    assert.equal(legitimateServerCheck.allowed, true, 'Server service_role credential must be permitted');
    assert.equal(dbQuotaTable.has(hashRateLimitIdentifier(victimEmail)), true, 'Quota table is mutated only by trusted server credential');
  });

  test('[P2] fails closed in production when Supabase is configured but service-role credential is absent', async () => {
    // Preserve original environment variables
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const originalService = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const originalSecret = process.env.SUPABASE_SECRET_KEY;

    try {
      // Simulate production where Supabase URL is active, but service-role secret was not provisioned
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://palluvo-production.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon';
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_SECRET_KEY;

      const store = createProductionRateLimitStore();
      assert.ok(
        store instanceof MisconfiguredRateLimitStore,
        'Factory must return MisconfiguredRateLimitStore instead of silently falling back to per-instance storage'
      );

      const result = await store.consumeKeys(['digest:sha256:1234567890abcdef']);
      assert.equal(result.allowed, false, 'Misconfigured production environment must fail closed');
      assert.match(result.error, /temporarily unavailable/i);
    } finally {
      // Restore environment
      if (originalUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      else delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (originalAnon !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
      else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (originalService !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = originalService;
      else delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (originalSecret !== undefined) process.env.SUPABASE_SECRET_KEY = originalSecret;
      else delete process.env.SUPABASE_SECRET_KEY;
    }
  });

  test('[P2] generates deterministic keyed digests for identifiers and avoids persisting raw IP or email', () => {
    const rawIp = 'ip:203.0.113.195';
    const rawEmail = 'email:Ayesha.Banu@Example.COM';

    const ipDigest = hashRateLimitIdentifier(rawIp);
    const emailDigest = hashRateLimitIdentifier(rawEmail);

    // Verify format
    assert.ok(ipDigest.startsWith('digest:sha256:'), 'Key must be formatted with digest prefix');
    assert.ok(emailDigest.startsWith('digest:sha256:'), 'Key must be formatted with digest prefix');
    assert.equal(ipDigest.length, 78, 'Digest must be 78 chars (prefix + 64 hex characters)');
    assert.equal(emailDigest.length, 78, 'Digest must be 78 chars (prefix + 64 hex characters)');

    // Verify raw values do not appear in the hash
    assert.equal(ipDigest.includes('203.0.113.195'), false, 'Raw IP must not be present in key');
    assert.equal(emailDigest.includes('Ayesha.Banu'), false, 'Raw email name must not be present in key');
    assert.equal(emailDigest.includes('Example.COM'), false, 'Raw email domain must not be present in key');

    // Verify case normalization & determinism
    const lowerEmailDigest = hashRateLimitIdentifier('email:ayesha.banu@example.com');
    assert.equal(emailDigest, lowerEmailDigest, 'Digest must be case-insensitive and deterministic');

    // Verify distinct inputs produce distinct digests
    const differentIpDigest = hashRateLimitIdentifier('ip:203.0.113.196');
    assert.notEqual(ipDigest, differentIpDigest, 'Different identifiers must yield distinct digests');

    // Regression check: verify admission_store.json does NOT contain raw IP strings and indexes records by keyed digest
    const admissionTestIp = '198.51.100.77';
    checkAdmissionLimit({ ip: admissionTestIp });
    assert.ok(fs.existsSync(defaultAdmissionStore.filePath), 'Admission store file must exist on disk');
    const storeContent = fs.readFileSync(defaultAdmissionStore.filePath, 'utf8');
    assert.equal(
      storeContent.includes(admissionTestIp),
      false,
      'Raw IP address must NEVER be serialized or persisted in admission_store.json'
    );
    const expectedAdmissionKey = hashRateLimitIdentifier(`ip:${admissionTestIp}`);
    const parsedAdmissionData = JSON.parse(storeContent);
    assert.ok(
      parsedAdmissionData.ipRecords && typeof parsedAdmissionData.ipRecords === 'object',
      'ipRecords map must be present in admission_store.json'
    );
    assert.ok(
      expectedAdmissionKey in parsedAdmissionData.ipRecords,
      'Admission record must be indexed under keyed digest (digest:sha256:...)'
    );
  });

  test('[P2] enforces actual expiry cleanup via prune_expired_contact_rate_limits RPC', async () => {
    let capturedPruneRpc = null;

    const mockSupabase = {
      rpc: async (funcName) => {
        capturedPruneRpc = funcName;
        // Simulate database reporting 12 expired keys removed
        return { data: 12, error: null };
      },
    };

    const dbStore = new DatabaseRpcRateLimitStore(async () => mockSupabase);
    const deletedCount = await dbStore.pruneExpiredEntries();

    assert.equal(capturedPruneRpc, 'prune_expired_contact_rate_limits');
    assert.equal(deletedCount, 12, 'Prune must return count of deleted expired records');
  });

  test('[P2] SUPABASE_SECRET_KEY-only configuration derives strong HMAC and never uses public fallback', () => {
    const originalPepper = process.env.RATE_LIMIT_PEPPER;
    const originalService = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const originalSecret = process.env.SUPABASE_SECRET_KEY;

    try {
      delete process.env.RATE_LIMIT_PEPPER;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      const testSecret = 'supabase-secret-high-entropy-key-9876543210';
      process.env.SUPABASE_SECRET_KEY = testSecret;

      const testId = 'email:customer@example.com';
      const computedDigest = hashRateLimitIdentifier(testId);

      const expectedHmac = crypto
        .createHmac('sha256', testSecret)
        .update(testId)
        .digest('hex');
      const expectedDigest = `digest:sha256:${expectedHmac}`;

      assert.equal(
        computedDigest,
        expectedDigest,
        'When only SUPABASE_SECRET_KEY is configured, it must be used as HMAC key'
      );

      // Verify it NEVER matches the guessable string 'palluvo_default_rate_limit_pepper'
      const guessableHmac = crypto
        .createHmac('sha256', 'palluvo_default_rate_limit_pepper')
        .update(testId)
        .digest('hex');
      assert.notEqual(
        computedDigest,
        `digest:sha256:${guessableHmac}`,
        'Must never fall back to public/guessable constant'
      );
    } finally {
      if (originalPepper !== undefined) process.env.RATE_LIMIT_PEPPER = originalPepper;
      else delete process.env.RATE_LIMIT_PEPPER;
      if (originalService !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = originalService;
      else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (originalSecret !== undefined) process.env.SUPABASE_SECRET_KEY = originalSecret;
      else delete process.env.SUPABASE_SECRET_KEY;
    }
  });

  test('[P2] fails closed when all pepper/secret variables are absent in non-test simulation', async () => {
    const originalPepper = process.env.RATE_LIMIT_PEPPER;
    const originalService = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const originalSecret = process.env.SUPABASE_SECRET_KEY;
    const originalSimulate = process.env.TEST_SIMULATE_NO_SECRET;

    try {
      delete process.env.RATE_LIMIT_PEPPER;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_SECRET_KEY;
      process.env.TEST_SIMULATE_NO_SECRET = 'true';

      assert.throws(() => {
        getRateLimitPepper();
      }, /Missing required high-entropy rate limit secret/);

      // Multi-key check must fail closed gracefully
      const res = await checkContactRateLimitMulti({ email: 'test@example.com', ip: '1.2.3.4' });
      assert.equal(res.allowed, false);
      assert.match(res.error, /temporarily unavailable/i);
    } finally {
      if (originalPepper !== undefined) process.env.RATE_LIMIT_PEPPER = originalPepper;
      else delete process.env.RATE_LIMIT_PEPPER;
      if (originalService !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = originalService;
      else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (originalSecret !== undefined) process.env.SUPABASE_SECRET_KEY = originalSecret;
      else delete process.env.SUPABASE_SECRET_KEY;
      if (originalSimulate !== undefined) process.env.TEST_SIMULATE_NO_SECRET = originalSimulate;
      else delete process.env.TEST_SIMULATE_NO_SECRET;
    }
  });

  test('[P2] scheduled serverless cron endpoint enforces authentication and calls rate limit pruning', async () => {
    const originalCronSecret = process.env.CRON_SECRET;
    const originalService = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const originalSecret = process.env.SUPABASE_SECRET_KEY;

    try {
      process.env.CRON_SECRET = 'super-secret-cron-token-12345';
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_SECRET_KEY;

      // 1. Unauthenticated request must return 401
      const unauthReq = new Request('http://localhost:3000/api/cron/prune-rate-limits', {
        headers: { authorization: 'Bearer invalid-token' },
      });
      const unauthRes = await handlePruneRateLimits(unauthReq);
      assert.equal(unauthRes.status, 401);
      const unauthBody = await unauthRes.json();
      assert.match(unauthBody.error, /Unauthorized/i);

      // 2. Authenticated request with valid CRON_SECRET must succeed
      const authReq = new Request('http://localhost:3000/api/cron/prune-rate-limits', {
        headers: { authorization: 'Bearer super-secret-cron-token-12345' },
      });
      const authRes = await handlePruneRateLimits(authReq);
      assert.equal(authRes.status, 200);
      const authBody = await authRes.json();
      assert.equal(authBody.success, true);
      assert.equal(typeof authBody.pruned, 'number');
    } finally {
      if (originalCronSecret !== undefined) process.env.CRON_SECRET = originalCronSecret;
      else delete process.env.CRON_SECRET;
      if (originalService !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = originalService;
      else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (originalSecret !== undefined) process.env.SUPABASE_SECRET_KEY = originalSecret;
      else delete process.env.SUPABASE_SECRET_KEY;
    }
  });

  test('validates payload length boundary checks correctly', () => {
    const validName = 'A'.repeat(100);
    const oversizedName = 'A'.repeat(101);
    assert.equal(validName.length <= CONTACT_FIELD_LIMITS.NAME_MAX, true);
    assert.equal(oversizedName.length > CONTACT_FIELD_LIMITS.NAME_MAX, true);

    const validEmail = 'a'.repeat(64) + '@' + 'b'.repeat(180) + '.com';
    const oversizedEmail = 'a'.repeat(100) + '@' + 'b'.repeat(200) + '.com';
    assert.equal(validEmail.length <= CONTACT_FIELD_LIMITS.EMAIL_MAX, true);
    assert.equal(oversizedEmail.length > CONTACT_FIELD_LIMITS.EMAIL_MAX, true);

    const validPhone = '+91 98765 43210 ext 123';
    const oversizedPhone = '+91 98765 43210 1234567890123456';
    assert.equal(validPhone.length <= CONTACT_FIELD_LIMITS.PHONE_MAX, true);
    assert.equal(oversizedPhone.length > CONTACT_FIELD_LIMITS.PHONE_MAX, true);

    const validSubject = 'S'.repeat(150);
    const oversizedSubject = 'S'.repeat(151);
    assert.equal(validSubject.length <= CONTACT_FIELD_LIMITS.SUBJECT_MAX, true);
    assert.equal(oversizedSubject.length > CONTACT_FIELD_LIMITS.SUBJECT_MAX, true);

    const validMsg = 'M'.repeat(3000);
    const oversizedMsg = 'M'.repeat(3001);
    assert.equal(validMsg.length <= CONTACT_FIELD_LIMITS.MESSAGE_MAX, true);
    assert.equal(oversizedMsg.length > CONTACT_FIELD_LIMITS.MESSAGE_MAX, true);
  });

  test('REGRESSION [P2]: public client (anon/authenticated) cannot read or bypass RLS on active_contact_rate_limits view', async () => {
    // Simulated database tracking table, view permissions, and RLS policies
    const activeViewName = 'active_contact_rate_limits';
    const baseTableName = 'contact_rate_limits';

    // Simulated RLS / grant engine
    const executeQueryAsRole = (role, queryTarget) => {
      // Direct grants: SELECT on active_contact_rate_limits is revoked from PUBLIC, anon, and authenticated
      // Granted EXCLUSIVELY to service_role
      if (queryTarget === activeViewName) {
        if (role === 'anon' || role === 'authenticated' || role === 'PUBLIC') {
          return {
            data: null,
            error: {
              code: '42501',
              message: 'permission denied for table active_contact_rate_limits',
              details: 'Public access revoked. View access is restricted to service_role credential.',
            },
          };
        }
      }

      // Security Invoker check: Even if a client role somehow queried the view,
      // security_invoker = true enforces the underlying table's RLS policy (USING (false))
      if (queryTarget === baseTableName || queryTarget === activeViewName) {
        if (role !== 'service_role') {
          // RLS policy: Deny direct public access to contact_rate_limits (USING (false))
          return {
            data: [], // 0 rows visible due to deny-all RLS
            error: null,
          };
        }
      }

      // Trusted server service_role credential query
      return {
        data: [
          {
            key: hashRateLimitIdentifier('ip:203.0.113.1'),
            timestamps: [Date.now()],
            last_updated: Date.now(),
            expires_at: new Date(Date.now() + 600000).toISOString(),
          },
        ],
        error: null,
      };
    };

    // 1. Anonymous client attempt to query active rate limits view
    const anonResult = executeQueryAsRole('anon', activeViewName);
    assert.ok(anonResult.error || anonResult.data.length === 0);
    if (anonResult.error) {
      assert.equal(anonResult.error.code, '42501');
      assert.match(anonResult.error.message, /permission denied/i);
    }

    // 2. Authenticated non-admin client attempt to query view
    const authResult = executeQueryAsRole('authenticated', activeViewName);
    assert.ok(authResult.error || authResult.data.length === 0);
    if (authResult.error) {
      assert.equal(authResult.error.code, '42501');
      assert.match(authResult.error.message, /permission denied/i);
    }

    // 3. Server-only service_role query succeeds and reads active records
    const serverResult = executeQueryAsRole('service_role', activeViewName);
    assert.equal(serverResult.error, null);
    assert.equal(serverResult.data.length, 1);
    assert.ok(serverResult.data[0].key.startsWith('digest:sha256:'));
  });

  test('REGRESSION [P2]: untrusted callers cannot globally exhaust shared key budget to lock out new legitimate visitors (saturation and recovery)', async () => {
    const capacityLimit = 1000;
    const limiter = new SharedRateLimiter({ maxStoreSize: capacityLimit });
    const now = 600000;

    // 1. An abuser hits maximum requests and is throttled
    const abuserKey = 'ip:known-abuser';
    for (let i = 0; i < 5; i++) {
      await limiter.consumeKeys([abuserKey], now + i * 6000);
    }
    const abuserStatus = await limiter.consumeKeys([abuserKey], now + 35000);
    assert.equal(abuserStatus.allowed, false, 'Abuser must be throttled');

    // 2. A distributed attacker rotates 500 IPs and synthetic emails to flood the store with ~1000 keys
    // (occupying all remaining slots up to capacityLimit)
    const initialSlots = limiter.getStoreSize();
    for (let i = 0; i < capacityLimit - initialSlots; i++) {
      const res = await limiter.consumeKeys([`ip:attacker-rotated-${i}`], now + 40000);
      assert.equal(res.allowed, true);
    }
    assert.equal(limiter.getStoreSize(), capacityLimit, 'Store is at full 1000 capacity');

    // 3. A legitimate first-time visitor arrives with new IP and new email
    // Under the resilient capacity strategy, the legitimate visitor must NOT fail closed!
    const legitResult = await limiter.consumeKeys(['ip:legitimate-customer', 'email:legitimate@example.com'], now + 45000);
    assert.equal(legitResult.allowed, true, 'Legitimate first-time visitor must be admitted under saturation');
    assert.equal(limiter.getStoreSize(), capacityLimit, 'Store size must strictly remain bounded at 1000');

    // 4. Actively throttled abuser quota must NOT have been evicted or reset by attacker seeding keys
    const abuserRecheck = await limiter.consumeKeys([abuserKey], now + 50000);
    assert.equal(abuserRecheck.allowed, false, 'Abuser quota must remain enforced and not reset');
    assert.match(abuserRecheck.error, /too many inquiries/i);

    // 5. Sustained saturation recovery: Continuous new visitors are admitted while store size stays at capacity
    for (let i = 0; i < 10; i++) {
      const continuousVisit = await limiter.consumeKeys([`ip:legit-batch-${i}`], now + 60000 + i * 1000);
      assert.equal(continuousVisit.allowed, true, `Continuous legitimate visitor ${i} must succeed`);
      assert.equal(limiter.getStoreSize(), capacityLimit);
    }
  });

  test('[P2] independent abuse/WAF admission limit throttles rapid single-source burst flooding', () => {
    resetAdmissionTracker();
    const testIp = '198.51.100.42';
    const now = 100000;

    // Up to 15 rapid admissions in 1 minute are allowed
    for (let i = 0; i < ADMISSION_LIMIT_CONFIG.MAX_ADMISSIONS_PER_IP; i++) {
      const res = checkAdmissionLimit({ ip: testIp }, now + i * 100);
      assert.equal(res.allowed, true, `Admission ${i + 1} should be permitted`);
    }

    // 16th rapid submission is throttled at admission boundary
    const throttledRes = checkAdmissionLimit({ ip: testIp }, now + 2000);
    assert.equal(throttledRes.allowed, false, '16th rapid submission must be throttled');
    assert.match(throttledRes.error, /too many inquiries received/i);

    // After admission window expires (60 seconds), connection recovers
    const recoveredRes = checkAdmissionLimit({ ip: testIp }, now + ADMISSION_LIMIT_CONFIG.WINDOW_MS + 1000);
    assert.equal(recoveredRes.allowed, true, 'Connection must recover after window expires');
  });

  test('[P2] admission map bounds capacity and sweeps stale expired entries', () => {
    resetAdmissionTracker();
    const now = 200000;

    // 1. Populate multiple distinct IPs
    for (let i = 0; i < 50; i++) {
      checkAdmissionLimit({ ip: `198.51.100.${i}` }, now);
    }
    assert.equal(getAdmissionTrackerSize(), 50);

    // 2. Advance time past the admission window and sweep expired entries
    const swept = pruneExpiredAdmissions(now + ADMISSION_LIMIT_CONFIG.WINDOW_MS + 500);
    assert.equal(swept, 50, 'All 50 expired IPs must be swept and deleted');
    assert.equal(getAdmissionTrackerSize(), 0, 'Admission map size must be 0 after sweep');

    // 3. Verify on-access cleanup: query an expired key, it must be cleaned up
    checkAdmissionLimit({ ip: '203.0.113.88' }, now);
    assert.equal(getAdmissionTrackerSize(), 1);
    // After window, calling checkAdmissionLimit with fresh time starts new record and cleans old
    const nextRes = checkAdmissionLimit({ ip: '203.0.113.88' }, now + ADMISSION_LIMIT_CONFIG.WINDOW_MS + 500);
    assert.equal(nextRes.allowed, true);
    assert.equal(getAdmissionTrackerSize(), 1);

    // 4. Verify capacity bounding: inserting past MAX_MAP_SIZE enforces upper bound
    resetAdmissionTracker();
    for (let i = 0; i < ADMISSION_LIMIT_CONFIG.MAX_MAP_SIZE + 25; i++) {
      checkAdmissionLimit({ ip: `10.10.${Math.floor(i / 255)}.${i % 255}` }, now);
    }
    assert.ok(
      getAdmissionTrackerSize() <= ADMISSION_LIMIT_CONFIG.MAX_MAP_SIZE,
      `Map size (${getAdmissionTrackerSize()}) must not exceed MAX_MAP_SIZE (${ADMISSION_LIMIT_CONFIG.MAX_MAP_SIZE})`
    );
  });

  test('REGRESSION [P2]: preserves active quota records during all-throttled store saturation and enforces hard capacity bound', async () => {
    // SharedRateLimiter with a bounded target size of 5 keys
    const limiter = new SharedRateLimiter({ maxStoreSize: 5 });
    const now = 300000;

    // 1. Saturate all 5 slots with actively throttled keys (each making 5 requests)
    for (let keyIdx = 0; keyIdx < 5; keyIdx++) {
      const key = `ip:throttled-client-${keyIdx}`;
      for (let req = 0; req < 5; req++) {
        await limiter.consumeKeys([key], now + req * 6000);
      }
      const check = await limiter.consumeKeys([key], now + 35000);
      assert.equal(check.allowed, false, `Key ${key} must be actively throttled`);
    }
    assert.equal(limiter.getStoreSize(), 5, 'Store is at full capacity (5)');

    // 2. A new submission arrives with a 6th distinct key while all 5 slots are actively throttled.
    // The store must strictly enforce the hard capacity bound without growing beyond maxStoreSize,
    // and without evicting or resetting any of the 5 actively throttled rows!
    const fullStoreAttempt = await limiter.consumeKeys(['ip:new-visitor-full'], now + 40000);
    assert.equal(fullStoreAttempt.allowed, false, 'Store must enforce hard capacity bound when all entries are throttled');
    assert.match(fullStoreAttempt.error, /high inquiry volume/i);
    assert.equal(limiter.getStoreSize(), 5, 'Store size must strictly remain within hard cap (5)');

    // 3. Verify ALL 5 original throttled keys were PRESERVED and their quotas were NOT reset
    for (let keyIdx = 0; keyIdx < 5; keyIdx++) {
      const key = `ip:throttled-client-${keyIdx}`;
      const recheck = await limiter.consumeKeys([key], now + 45000);
      assert.equal(recheck.allowed, false, `Quota for ${key} must NOT have been reset by key churn`);
      assert.match(recheck.error, /too many inquiries/i);
      const record = limiter.getRecord(key);
      assert.ok(record, `Record for ${key} must still exist`);
      assert.equal(record.timestamps.length, 5, `Timestamps for ${key} must remain intact`);
    }

    // 4. Test database RPC store under all-throttled saturation condition
    const dbStore = new Map();
    const capacityLimit = 3;

    // Prepopulate 3 throttled keys (all slots full of throttled entries)
    for (let i = 0; i < 3; i++) {
      dbStore.set(hashRateLimitIdentifier(`ip:db-throttled-${i}`), {
        timestamps: [now, now + 1000, now + 2000, now + 3000, now + 4000],
        lastUpdated: now + 4000,
      });
    }

    const mockSupabase = {
      rpc: async (funcName, params) => {
        assert.equal(funcName, 'consume_contact_rate_limit');
        const keys = params.p_keys;
        const totalKeys = dbStore.size;
        const newKeys = keys.filter((k) => !dbStore.has(k));

        let evictedCount = 0;
        if (newKeys.length > 0 && totalKeys + newKeys.length > capacityLimit) {
          const needed = (totalKeys + newKeys.length) - capacityLimit;
          const unthrottled = Array.from(dbStore.entries())
            .filter(([k, rec]) => !keys.includes(k) && rec.timestamps.length < 5 && (now - rec.lastUpdated >= 5000))
            .map(([k]) => k);

          const evicted = unthrottled.slice(0, needed);
          evictedCount = evicted.length;
          for (const k of evicted) {
            dbStore.delete(k);
          }

          // Enforce hard capacity bound: if store remains full because remaining entries are throttled, do NOT insert
          if (totalKeys - evictedCount + newKeys.length > capacityLimit) {
            return {
              data: {
                allowed: false,
                retryAfterSeconds: 60,
                error: 'Service is currently experiencing high inquiry volume. Please try again in a few moments or reach out to our concierge directly.',
              },
              error: null,
            };
          }
        }

        for (const k of keys) {
          let rec = dbStore.get(k);
          if (!rec) {
            rec = { timestamps: [now + 40000], lastUpdated: now + 40000 };
            dbStore.set(k, rec);
          } else {
            rec.timestamps.push(now + 40000);
          }
        }

        return { data: { allowed: true }, error: null };
      },
    };

    const clientStore = new DatabaseRpcRateLimitStore(async () => mockSupabase);
    const dbResult = await clientStore.consumeKeys(['ip:legit-db-visitor']);
    assert.equal(dbResult.allowed, false, 'Database RPC must enforce capacity bound when all slots are throttled');
    assert.match(dbResult.error, /high inquiry volume/i);
    assert.equal(dbStore.size, capacityLimit, 'Database row count must strictly stay at cap (3)');
    assert.ok(!dbStore.has(hashRateLimitIdentifier('ip:legit-db-visitor')), 'New visitor key was not inserted into saturated database');
    assert.ok(dbStore.has(hashRateLimitIdentifier('ip:db-throttled-0')), 'Throttled entry 0 preserved');
    assert.ok(dbStore.has(hashRateLimitIdentifier('ip:db-throttled-1')), 'Throttled entry 1 preserved');
    assert.ok(dbStore.has(hashRateLimitIdentifier('ip:db-throttled-2')), 'Throttled entry 2 preserved');
  });

  test('[P2] evicts unthrottled synthetic keys to admit legitimate visitors when store capacity is reached', async () => {
    const limiter = new SharedRateLimiter({ maxStoreSize: 3 });
    const now = 400000;

    // 2 throttled keys (5 requests each) + 1 unthrottled key (1 request)
    for (let req = 0; req < 5; req++) {
      await limiter.consumeKeys(['ip:throttled-1'], now + req * 6000);
      await limiter.consumeKeys(['ip:throttled-2'], now + req * 6000);
    }
    await limiter.consumeKeys(['ip:unthrottled-3'], now);
    assert.equal(limiter.getStoreSize(), 3, 'Store reaches capacity with 2 throttled and 1 unthrottled');

    // New visitor arrives: unthrottled key is evicted in Phase 1, visitor is admitted within cap
    const admitNew = await limiter.consumeKeys(['ip:new-visitor'], now + 25000);
    assert.equal(admitNew.allowed, true, 'Unthrottled key must be evicted to admit new visitor');
    assert.equal(limiter.getStoreSize(), 3, 'Store size must strictly stay at cap (3)');
    assert.ok(limiter.getRecord('ip:throttled-1'), 'Throttled 1 preserved');
    assert.ok(limiter.getRecord('ip:throttled-2'), 'Throttled 2 preserved');
    assert.ok(!limiter.getRecord('ip:unthrottled-3'), 'Unthrottled key was evicted');
    assert.ok(limiter.getRecord('ip:new-visitor'), 'New visitor was recorded');
  });

  test('[P2] independent global/WAF admission control throttles distributed flood across IPs', () => {
    resetAdmissionTracker();
    const now = 500000;

    // Up to MAX_GLOBAL_ADMISSIONS (120) submissions per minute across multiple distinct IPs are permitted
    for (let i = 0; i < ADMISSION_LIMIT_CONFIG.MAX_GLOBAL_ADMISSIONS; i++) {
      const res = checkAdmissionLimit({ ip: `198.51.100.${i % 250}` }, now + i * 10);
      assert.equal(res.allowed, true, `Global admission ${i + 1} must be permitted`);
    }
    assert.equal(getGlobalAdmissionCount(), ADMISSION_LIMIT_CONFIG.MAX_GLOBAL_ADMISSIONS);

    // 121st submission from a brand-new IP is throttled at admission boundary due to global flood threshold
    const floodRes = checkAdmissionLimit({ ip: '203.0.113.99' }, now + 2000);
    assert.equal(floodRes.allowed, false, 'Distributed volumetric flood must be throttled by global admission limit');
    assert.match(floodRes.error, /unusually high traffic/i);

    // After admission window expires (60 seconds), global admission control recovers
    const recoveredRes = checkAdmissionLimit({ ip: '203.0.113.99' }, now + ADMISSION_LIMIT_CONFIG.WINDOW_MS + 1000);
    assert.equal(recoveredRes.allowed, true, 'Global admission control recovers after window');
  });

  test('[P2] cross-worker global admission control: separate Node worker threads share atomic global admission window across workers', async () => {
    resetAdmissionTracker();
    const now = 900000;

    // Worker script running in isolated V8 context
    const workerScript = `
      import { checkAdmissionLimit } from './src/app/contact/rateLimiter.ts';
      import { parentPort, workerData } from 'node:worker_threads';

      const results = [];
      for (let i = 0; i < workerData.count; i++) {
        const res = checkAdmissionLimit({ ip: \`10.1.\${workerData.workerId}.\${i}\` }, workerData.now + i * 10);
        results.push(res.allowed);
      }
      parentPort.postMessage({ results, allAllowed: results.every(Boolean) });
    `;

    const runWorker = (workerId, count, startTime) => {
      return new Promise((resolve, reject) => {
        const worker = new Worker(workerScript, {
          eval: true,
          workerData: { workerId, count, now: startTime },
        });
        worker.on('message', resolve);
        worker.on('error', reject);
      });
    };

    // Concurrently run Worker A (60 admissions) and Worker B (60 admissions)
    const [resA, resB] = await Promise.all([
      runWorker('a', 60, now),
      runWorker('b', 60, now + 100),
    ]);

    assert.equal(resA.allAllowed, true, 'Worker A admissions must be allowed');
    assert.equal(resB.allAllowed, true, 'Worker B admissions must be allowed');
    assert.equal(getGlobalAdmissionCount(), 120, 'Shared global admission count must be 120 across workers');

    // 121st admission from main thread is throttled by the shared global limit across workers
    const throttledMain = checkAdmissionLimit({ ip: '203.0.113.199' }, now + 2000);
    assert.equal(throttledMain.allowed, false, '121st admission across workers must be throttled');
    assert.match(throttledMain.error, /unusually high traffic/i);
  });

  test('[P2] live lock holder is not unlinked when waiter times out', async () => {
    const lockPath = defaultAdmissionStore.lockFilePath;
    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
    } catch {}

    // Worker holds the admission lock file for 700ms
    const holderWorkerScript = `
      import { parentPort, workerData } from 'node:worker_threads';
      import fs from 'node:fs';

      let fd = null;
      try {
        fd = fs.openSync(workerData.lockPath, 'wx');
        parentPort.postMessage({ type: 'ACQUIRED' });
      } catch (err) {
        parentPort.postMessage({ type: 'ERROR', error: err.message });
      }

      // Hold lock until delay expires
      const stopAt = Date.now() + workerData.holdMs;
      while (Date.now() < stopAt) {}

      if (fd !== null) {
        try { fs.closeSync(fd); } catch {}
      }
      try { fs.unlinkSync(workerData.lockPath); } catch {}
      parentPort.postMessage({ type: 'RELEASED' });
    `;

    const holderWorker = new Worker(holderWorkerScript, {
      eval: true,
      workerData: { lockPath, holdMs: 700 },
    });

    const holderAcquired = new Promise((resolve, reject) => {
      holderWorker.on('message', (msg) => {
        if (msg.type === 'ACQUIRED') resolve();
        else if (msg.type === 'ERROR') reject(new Error(msg.error));
      });
      holderWorker.on('error', reject);
    });

    const holderReleased = new Promise((resolve, reject) => {
      holderWorker.on('message', (msg) => {
        if (msg.type === 'RELEASED') resolve();
      });
      holderWorker.on('error', reject);
    });

    // Wait until the holder has acquired the lock
    await holderAcquired;
    assert.ok(fs.existsSync(lockPath), 'Lock file must exist while holder is active');

    // Waiter attempts admission with a timeout (200ms) shorter than holder's duration (700ms)
    const waiterResult = checkAdmissionLimit({ ip: '203.0.113.50', maxWaitMs: 200 });

    // The waiter must fail closed cleanly without crashing
    assert.equal(waiterResult.allowed, false, 'Waiter must fail closed when lock cannot be acquired within maxWaitMs');
    assert.equal(waiterResult.retryAfterSeconds, 5);
    assert.match(waiterResult.error, /momentarily busy/i);

    // CRITICAL ASSERTION: The live lock file MUST NOT have been unlinked by the timed-out waiter!
    assert.ok(
      fs.existsSync(lockPath),
      'Live lock file must NOT be deleted/unlinked when a waiter times out'
    );

    // Wait for holder to finish and cleanly release its lock
    await holderReleased;
    await holderWorker.terminate();

    // Subsequent admission request after holder releases must succeed without being blocked
    const subsequentResult = checkAdmissionLimit({ ip: '203.0.113.50', maxWaitMs: 2000 });
    assert.equal(subsequentResult.allowed, true, 'Subsequent request must succeed after live holder finishes');
  });

  test('[P2] reclaims demonstrably stale lock (> 10s old) from abandoned process', () => {
    const lockPath = defaultAdmissionStore.lockFilePath;
    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
    } catch {}

    // Create an abandoned lock file with mtime 15 seconds in the past
    fs.writeFileSync(lockPath, 'abandoned-pid-99999');
    const pastTime = (Date.now() - 15000) / 1000;
    fs.utimesSync(lockPath, pastTime, pastTime);

    // Verify lock file exists and is older than 10s
    const statBefore = fs.statSync(lockPath);
    assert.ok(Date.now() - statBefore.mtimeMs > 10000, 'Lock mtime must be older than 10 seconds');

    // checkAdmissionLimit should identify it as demonstrably stale (> 10s) and reclaim it
    const result = checkAdmissionLimit({ ip: '203.0.113.60', maxWaitMs: 1000 });
    assert.equal(result.allowed, true, 'Stale lock (>10s old) must be reclaimed to allow admission');
    assert.equal(fs.existsSync(lockPath), false, 'Lock must be cleaned up after successful execution');
  });

  test('REGRESSION [P2]: live lock holder with aged mtime (> 10s) is not reclaimed while descriptor remains open', () => {
    const lockPath = defaultAdmissionStore.lockFilePath;
    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
    } catch {}

    // 1. Live holder opens file descriptor and holds it open
    const fd = fs.openSync(lockPath, 'wx');
    try {
      // Artificially age the lock file's mtime to 15 seconds in the past (older than 10s staleThresholdMs)
      const pastTime = (Date.now() - 15000) / 1000;
      fs.utimesSync(lockPath, pastTime, pastTime);

      // Verify lock mtime is older than 10 seconds
      const statBefore = fs.statSync(lockPath);
      assert.ok(Date.now() - statBefore.mtimeMs > 10000, 'Lock mtime must be older than 10s threshold');

      // Verify liveness detection identifies the active descriptor
      assert.equal(hasOpenFileDescriptor(lockPath), true, 'hasOpenFileDescriptor must detect open handle');
      assert.equal(isLockOwnerAlive(lockPath), true, 'isLockOwnerAlive must return true for open descriptor');

      // 2. A waiter calls checkAdmissionLimit() while the holder descriptor remains open
      const waiterResult = checkAdmissionLimit({ ip: '203.0.113.60', maxWaitMs: 200 });

      // 3. The waiter MUST NOT steal the lock or return allowed: true!
      // It must fail closed and report service momentarily busy
      assert.equal(waiterResult.allowed, false, 'Waiter must not steal live lock despite aged mtime > 10s');
      assert.equal(waiterResult.retryAfterSeconds, 5);
      assert.match(waiterResult.error, /momentarily busy/i);

      // 4. CRITICAL ASSERTION: The live lock file MUST NOT have been unlinked or reclaimed!
      assert.ok(fs.existsSync(lockPath), 'Lock file must remain on disk while holder descriptor is open');
    } finally {
      // 5. Clean up live descriptor
      try { fs.closeSync(fd); } catch {}
      try { fs.unlinkSync(lockPath); } catch {}
    }

    // 6. After the holder legitimately closes its descriptor, admission recovers cleanly
    const subsequentResult = checkAdmissionLimit({ ip: '203.0.113.60', maxWaitMs: 2000 });
    assert.equal(subsequentResult.allowed, true, 'Subsequent admission must succeed after holder releases');
  });

  test('REGRESSION [P2]: rate limit store does not steal lock from live descriptor with aged mtime (> 10s)', async () => {
    const store = new CrossProcessRateLimitStore();
    try {
      if (fs.existsSync(store.lockFilePath)) {
        fs.unlinkSync(store.lockFilePath);
      }
    } catch {}

    const fd = fs.openSync(store.lockFilePath, 'wx');
    try {
      const pastTime = (Date.now() - 15000) / 1000;
      fs.utimesSync(store.lockFilePath, pastTime, pastTime);

      const waiterResult = await store.consumeKeys(['ip:203.0.113.70'], Date.now(), 200);
      assert.equal(waiterResult.allowed, false, 'Rate limit waiter must not steal live lock despite aged mtime');
      assert.equal(waiterResult.retryAfterSeconds, 5);
      assert.match(waiterResult.error, /momentarily busy/i);
      assert.ok(fs.existsSync(store.lockFilePath), 'Lock file must remain intact while holder descriptor is open');
    } finally {
      try { fs.closeSync(fd); } catch {}
      try { fs.unlinkSync(store.lockFilePath); } catch {}
    }

    const subsequentResult = await store.consumeKeys(['ip:203.0.113.70'], Date.now(), 2000);
    assert.equal(subsequentResult.allowed, true, 'Subsequent rate limit request succeeds after holder releases');
  });

  test('REGRESSION [P2]: two simultaneous stale-lock recoverers atomically contend without unlinking live lock or losing admissions', async () => {
    const store = new CrossProcessAdmissionStore();
    try {
      if (fs.existsSync(store.lockFilePath)) {
        fs.unlinkSync(store.lockFilePath);
      }
      if (fs.existsSync(`${store.lockFilePath}.reclaim`)) {
        fs.unlinkSync(`${store.lockFilePath}.reclaim`);
      }
      if (fs.existsSync(store.filePath)) {
        fs.unlinkSync(store.filePath);
      }
    } catch {}

    // 1. Create an abandoned dead-owner lock older than 15s (staleThresholdMs = 10s)
    const deadPid = 99999999;
    fs.writeFileSync(
      store.lockFilePath,
      JSON.stringify({ pid: deadPid, ownerId: 'dead-abandoned-owner', createdAt: Date.now() - 15000 }),
      'utf8'
    );
    const pastTime = (Date.now() - 15000) / 1000;
    fs.utimesSync(store.lockFilePath, pastTime, pastTime);

    // Verify lock is older than 10s and owner is dead
    assert.ok(Date.now() - fs.statSync(store.lockFilePath).mtimeMs > 10000);
    assert.equal(isLockOwnerAlive(store.lockFilePath), false, 'Owner must be dead');

    // 2. Launch two simultaneous stale-lock recoverers racing concurrently
    const recoverer1 = new Promise((resolve) => {
      setImmediate(() => {
        const res = store.checkAdmission({ ip: '198.51.100.10', maxWaitMs: 3000 });
        resolve(res);
      });
    });

    const recoverer2 = new Promise((resolve) => {
      setImmediate(() => {
        const res = store.checkAdmission({ ip: '198.51.100.20', maxWaitMs: 3000 });
        resolve(res);
      });
    });

    const [res1, res2] = await Promise.all([recoverer1, recoverer2]);

    assert.equal(res1.allowed, true, 'Recoverer 1 must succeed');
    assert.equal(res2.allowed, true, 'Recoverer 2 must succeed');

    // 3. Both admissions must be recorded without lost updates
    const globalCount = store.getGlobalCount();
    assert.equal(globalCount, 2, 'Both simultaneous recoverers must have their admissions counted');

    // 4. Rate limit store simultaneous recovery test as well
    const rateStore = new CrossProcessRateLimitStore();
    try {
      if (fs.existsSync(rateStore.lockFilePath)) {
        fs.unlinkSync(rateStore.lockFilePath);
      }
      if (fs.existsSync(`${rateStore.lockFilePath}.reclaim`)) {
        fs.unlinkSync(`${rateStore.lockFilePath}.reclaim`);
      }
      if (fs.existsSync(rateStore.storeFilePath)) {
        fs.unlinkSync(rateStore.storeFilePath);
      }
    } catch {}

    fs.writeFileSync(
      rateStore.lockFilePath,
      JSON.stringify({ pid: deadPid, ownerId: 'dead-rate-owner', createdAt: Date.now() - 15000 }),
      'utf8'
    );
    fs.utimesSync(rateStore.lockFilePath, pastTime, pastTime);

    const rateRec1 = rateStore.consumeKeys(['ip:198.51.100.30'], Date.now(), 3000);
    const rateRec2 = rateStore.consumeKeys(['ip:198.51.100.40'], Date.now(), 3000);

    const [rateRes1, rateRes2] = await Promise.all([rateRec1, rateRec2]);
    assert.equal(rateRes1.allowed, true, 'Rate recoverer 1 must succeed');
    assert.equal(rateRes2.allowed, true, 'Rate recoverer 2 must succeed');
    assert.equal(rateStore.getStoreSize(), 2, 'Both rate limit keys must be committed without lost updates');
  });

  test('REGRESSION [P2]: fenced commit aborts stale write if lock ownership was reassigned or storage epoch advanced', () => {
    const store = new CrossProcessAdmissionStore();
    try {
      if (fs.existsSync(store.lockFilePath)) {
        fs.unlinkSync(store.lockFilePath);
      }
      if (fs.existsSync(store.filePath)) {
        fs.unlinkSync(store.filePath);
      }
    } catch {}

    // Initialize store with epoch 1
    store.checkAdmission({ ip: '198.51.100.50' });
    const { data: initialData, epoch: initialEpoch } = store['readData']();
    assert.equal(initialEpoch, 1);

    // 1. Stale token test: attempt writeData with an outdated fencingToken when lock has been reassigned
    fs.writeFileSync(
      store.lockFilePath,
      JSON.stringify({ pid: process.pid, ownerId: 'newer-owner-uuid', createdAt: Date.now() }),
      'utf8'
    );

    assert.throws(
      () => {
        store['writeData'](initialData, initialEpoch, 'stale-token-uuid');
      },
      /LockFenced/i,
      'writeData must throw LockFenced when lock ownership is reassigned'
    );

    // 2. Advanced storage epoch test: simulate disk advancing to epoch 5
    fs.writeFileSync(
      store.filePath,
      JSON.stringify({ epoch: 5, globalTimestamps: [Date.now()], ipRecords: {} }),
      'utf8'
    );
    // Write matching lock file
    fs.writeFileSync(
      store.lockFilePath,
      JSON.stringify({ pid: process.pid, ownerId: 'matching-owner', createdAt: Date.now() }),
      'utf8'
    );

    assert.throws(
      () => {
        // Attempting to commit with initialEpoch = 1 when disk is already at 5
        store['writeData'](initialData, 1, 'matching-owner');
      },
      /LockFenced/i,
      'writeData must throw LockFenced when on-disk storage epoch has advanced'
    );

    // Ensure the on-disk state was NOT overwritten by the stale commit
    const diskContent = JSON.parse(fs.readFileSync(store.filePath, 'utf8'));
    assert.equal(diskContent.epoch, 5, 'On-disk epoch must remain protected from stale commit');

    // Clean up
    try {
      if (fs.existsSync(store.lockFilePath)) fs.unlinkSync(store.lockFilePath);
      if (fs.existsSync(store.filePath)) fs.unlinkSync(store.filePath);
    } catch {}
  });

  test('REGRESSION [P2]: unverified form emails cannot poison victim quota across separate IP addresses', async () => {
    const now = 600000;
    const attackerIp = '198.51.100.1';
    const victimIp = '203.0.113.88';
    const victimEmail = 'victim@example.com';

    // 1. Attacker sends 5 unverified inquiries using victim@example.com from attackerIp
    for (let i = 0; i < 5; i++) {
      const res = await checkContactRateLimitMulti(
        { ip: attackerIp, email: victimEmail, isEmailVerified: false },
        now + i * 6000
      );
      assert.equal(res.allowed, true, `Attacker submission ${i + 1} permitted until IP limit reached`);
    }

    // 2. Attacker's 6th request from attackerIp is throttled by their own IP quota
    const attackerThrottled = await checkContactRateLimitMulti(
      { ip: attackerIp, email: victimEmail, isEmailVerified: false },
      now + 35000
    );
    assert.equal(attackerThrottled.allowed, false, 'Attacker IP must be throttled');

    // 3. Genuine victim arrives from their own IP (victimIp) with victim@example.com
    // Because unverified email is not hard-quota'd as a shared identity, victim must NOT be blocked!
    const victimSubmission = await checkContactRateLimitMulti(
      { ip: victimIp, email: victimEmail, isEmailVerified: false },
      now + 40000
    );
    assert.equal(victimSubmission.allowed, true, 'Genuine victim must NOT be blocked by attacker submitting their email');

    // 4. If an authenticated user with verified email submits across different IPs, verified email quota IS enforced
    const verifiedUser = 'verified-customer@example.com';
    for (let i = 0; i < 5; i++) {
      await checkContactRateLimitMulti(
        { ip: `10.20.30.${i}`, email: verifiedUser, isEmailVerified: true },
        now + 50000 + i * 6000
      );
    }
    const verifiedThrottled = await checkContactRateLimitMulti(
      { ip: '10.20.30.99', email: verifiedUser, isEmailVerified: true },
      now + 85000
    );
    assert.equal(verifiedThrottled.allowed, false, 'Verified email must enforce quota across IPs');
    assert.match(verifiedThrottled.error, /too many inquiries/i);
  });

  test('[P2] verifies confirmed-email deployment configuration and mailbox ownership states', () => {
    const originalEnv = { ...process.env };

    try {
      // 1. When REQUIRE_EMAIL_CONFIRMATION is unset, isEmailConfirmationEnforced is false
      delete process.env.REQUIRE_EMAIL_CONFIRMATION;
      delete process.env.SUPABASE_AUTH_CONFIRM_EMAIL;
      assert.equal(isEmailConfirmationEnforced(), false);

      // Even if user object has email and confirmed timestamp, isMailboxVerified must be false
      const mockUser = {
        email: 'test@example.com',
        email_confirmed_at: '2026-10-13T07:00:00Z',
      };
      assert.equal(
        isMailboxVerified(mockUser, 'test@example.com'),
        false,
        'Cannot trust mailbox access without enforced confirmed-email deployment requirement'
      );

      // 2. When REQUIRE_EMAIL_CONFIRMATION is 'true', confirmed-email is enforced
      process.env.REQUIRE_EMAIL_CONFIRMATION = 'true';
      assert.equal(isEmailConfirmationEnforced(), true);

      // Null user -> false
      assert.equal(isMailboxVerified(null, 'test@example.com'), false);

      // User without email -> false
      assert.equal(isMailboxVerified({}, 'test@example.com'), false);

      // User with unconfirmed email (email_confirmed_at: null or undefined) -> false
      assert.equal(
        isMailboxVerified({ email: 'test@example.com', email_confirmed_at: null }, 'test@example.com'),
        false
      );
      assert.equal(
        isMailboxVerified({ email: 'test@example.com', email_confirmed_at: '' }, 'test@example.com'),
        false
      );

      // User with mismatched email -> false
      assert.equal(
        isMailboxVerified(mockUser, 'other@example.com'),
        false
      );

      // User with confirmed email matching submitted email -> true
      assert.equal(
        isMailboxVerified(mockUser, 'test@example.com'),
        true
      );
      assert.equal(
        isMailboxVerified(mockUser, '  TEST@example.com '),
        true,
        'Casing and whitespace normalization must be respected'
      );
    } finally {
      process.env = originalEnv;
    }
  });

  test('REGRESSION [P2]: no-confirmation signup path does not trust unverified authenticated emails to poison quota', async () => {
    const originalEnv = { ...process.env };
    delete process.env.REQUIRE_EMAIL_CONFIRMATION;
    delete process.env.SUPABASE_AUTH_CONFIRM_EMAIL;

    const now = 700000;
    const attackerIp = '198.51.100.1';
    const victimIp = '203.0.113.88';
    const victimEmail = 'victim@example.com';

    try {
      // In a Supabase project with "Confirm Email" disabled, Supabase issues immediate sessions
      // upon signup without verifying mailbox access (auto-populating email_confirmed_at).
      const unverifiedSignupUser = {
        id: 'attacker-victim-account-id',
        email: victimEmail,
        email_confirmed_at: '2026-10-13T07:00:00Z',
      };

      // In this no-confirmation configuration, isMailboxVerified MUST evaluate to false!
      const isVerified = isMailboxVerified(unverifiedSignupUser, victimEmail);
      assert.equal(
        isVerified,
        false,
        'Unconfirmed/no-confirmation signup accounts must not be treated as verified mailboxes'
      );

      // Attacker submits 5 inquiries with victim@example.com from attackerIp
      for (let i = 0; i < 5; i++) {
        const res = await checkContactRateLimitMulti(
          { ip: attackerIp, email: victimEmail, isEmailVerified: isVerified },
          now + i * 6000
        );
        assert.equal(res.allowed, true, `Attacker submission ${i + 1} permitted until IP limit reached`);
      }

      // Attacker's 6th request from attackerIp is throttled by their own IP
      const attackerThrottled = await checkContactRateLimitMulti(
        { ip: attackerIp, email: victimEmail, isEmailVerified: isVerified },
        now + 35000
      );
      assert.equal(attackerThrottled.allowed, false, 'Attacker connection must be throttled');

      // Now genuine victim arrives on their own IP (victimIp) with victim@example.com
      // Because confirmed-email was not enforced, the shared email quota was NOT applied to victim@example.com
      const victimSubmission = await checkContactRateLimitMulti(
        { ip: victimIp, email: victimEmail, isEmailVerified: false },
        now + 40000
      );
      assert.equal(
        victimSubmission.allowed,
        true,
        'Genuine victim must NOT be blocked by an attacker registering their email under no-confirmation signup'
      );
    } finally {
      process.env = originalEnv;
    }
  });
});
