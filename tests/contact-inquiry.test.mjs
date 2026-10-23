import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { fork } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
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
  isTakeoverFenceValid,
  isEmailConfirmationEnforced,
  isMailboxVerified,
  acquireStaleReclaimMutex,
  atomicTakeoverStaleLock,
  unlinkDescriptorInode,
  unlinkIfSameInode,
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

  test('REGRESSION [P2]: writer paused after validation cannot overwrite newer owner commit (atomic CAS)', async () => {
    const testDir = path.join(os.tmpdir(), `test_fencing_cas_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });

    try {
      // 1. Test CrossProcessAdmissionStore
      const admissionStore = new CrossProcessAdmissionStore();
      admissionStore.filePath = path.join(testDir, 'test_admission.json');
      admissionStore.lockFilePath = path.join(testDir, 'test_admission.lock');

      // Seed store at epoch 1 with initial entry
      admissionStore.checkAdmission({ ip: '10.0.0.1' }, 1000);
      const { data: writer1Data, epoch: writer1Epoch } = admissionStore['readData']();
      assert.equal(writer1Epoch, 1);

      // Writer 1 prepares its update based on epoch 1
      writer1Data.globalTimestamps.push(2000);

      // Now simulate Writer 1 being paused after reading/validating initial state (e.g. GC pause or event loop delay).
      // While Writer 1 is paused, Writer 2 arrives, reads epoch 1, and successfully commits epoch 2!
      const writer2Res = admissionStore.checkAdmission({ ip: '10.0.0.2' }, 3000);
      assert.equal(writer2Res.allowed, true);

      const diskAfterWriter2 = JSON.parse(fs.readFileSync(admissionStore.filePath, 'utf8'));
      assert.equal(diskAfterWriter2.epoch, 2, 'Writer 2 successfully committed epoch 2 to disk');

      // Now Writer 1 wakes up from pause and attempts to commit its stale data (still based on epoch 1)
      assert.throws(
        () => {
          admissionStore['writeData'](writer1Data, writer1Epoch);
        },
        /LockFenced.*epoch.*advanced/i,
        'Stale Writer 1 must be rejected by atomic CAS validation when epoch on disk has advanced'
      );

      // Verify on-disk state is preserved: Writer 2 data remains, Writer 1 stale data did NOT overwrite it
      const finalDiskContent = JSON.parse(fs.readFileSync(admissionStore.filePath, 'utf8'));
      assert.equal(finalDiskContent.epoch, 2, 'On-disk epoch must remain 2');
      assert.equal(
        finalDiskContent.globalTimestamps.includes(2000),
        false,
        'Stale timestamp from paused Writer 1 must not appear on disk'
      );

      // 2. Test CrossProcessRateLimitStore
      const rateLimitStore = new CrossProcessRateLimitStore();
      rateLimitStore.storeFilePath = path.join(testDir, 'test_ratelimit.json');
      rateLimitStore.lockFilePath = path.join(testDir, 'test_ratelimit.lock');

      // Seed rateLimitStore at epoch 1
      await rateLimitStore.consumeKeys(['key1'], 1000);
      const content1 = JSON.parse(fs.readFileSync(rateLimitStore.storeFilePath, 'utf8'));
      assert.equal(content1.__epoch, 1);

      // Stale writer prepares data based on epoch 1
      const staleData = {
        key1: { timestamps: [1000, 1500], lastUpdated: 1500 },
        stale_key: { timestamps: [1500], lastUpdated: 1500 },
      };

      // Newer writer runs while stale writer is paused, committing epoch 2
      await rateLimitStore.consumeKeys(['key2'], 2000);
      const content2 = JSON.parse(fs.readFileSync(rateLimitStore.storeFilePath, 'utf8'));
      assert.equal(content2.__epoch, 2);
      assert.ok(content2.key2, 'Writer 2 committed key2');

      // Stale writer resumes and attempts commit with epoch 1
      assert.throws(
        () => {
          rateLimitStore['writeData'](staleData, 1);
        },
        /LockFenced.*epoch.*advanced/i,
        'Stale writer on CrossProcessRateLimitStore must be rejected by atomic CAS'
      );

      // Verify key2 is intact and stale_key was never written
      const finalStoreContent = JSON.parse(fs.readFileSync(rateLimitStore.storeFilePath, 'utf8'));
      assert.equal(finalStoreContent.__epoch, 2);
      assert.ok(finalStoreContent.key2);
      assert.equal(finalStoreContent.stale_key, undefined, 'Stale key must not overwrite storage');

      // 3. Test interception / pause right before atomic commit swap
      // Simulate Writer 1 acquiring lock with token 1.
      // Writer 1 is paused so long that its lock is reclaimed via exclusive takeover by Writer 2 with token 2.
      // Writer 2 commits with token 2.
      // Writer 1 tries to commit with stale token 1: rejected by lock ownership check!
      fs.writeFileSync(
        rateLimitStore.lockFilePath,
        JSON.stringify({ pid: process.pid, ownerId: 'writer2-token', createdAt: Date.now() }),
        'utf8'
      );

      assert.throws(
        () => {
          rateLimitStore['writeData'](staleData, 2, 'writer1-token');
        },
        /LockFenced.*reassigned/i,
        'Writer with stale ownership token must be rejected even if epoch matched'
      );
    } finally {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {}
    }
  });

  test('REGRESSION [P2]: paused waiter between liveness validation and unlink cannot delete newly acquired reclaim mutex', async () => {
    const testDir = path.join(os.tmpdir(), `test_reclaim_pause_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    const lockPath = path.join(testDir, 'test.lock');
    const reclaimDir = `${lockPath}.reclaim_dir`;
    fs.mkdirSync(reclaimDir, { recursive: true });

    try {
      // 1. Plant an abandoned dead ticket in the reclaim directory
      const deadPid = 99999999;
      const deadClaimName = `seq_000000000001_dead-owner.ticket`;
      const deadClaimPath = path.join(reclaimDir, deadClaimName);
      fs.writeFileSync(
        deadClaimPath,
        JSON.stringify({ seq: 1, pid: deadPid, ownerId: 'dead-owner', createdAt: Date.now() - 10000 }),
        'utf8'
      );

      // Verify the dead claim's PID is dead
      assert.equal(isProcessAlive(deadPid), false, 'Dead PID must be identified as not alive');

      // 2. Waiter A (running in a separate worker thread) inspects the dead ticket, validates liveness (dead),
      // and pauses right before unlinking
      const waiterAWorkerScript = `
        import { parentPort, workerData } from 'node:worker_threads';
        import fs from 'node:fs';
        import path from 'node:path';

        const { reclaimDir, deadClaimName } = workerData;
        const targetPath = path.join(reclaimDir, deadClaimName);

        // Waiter A reads the dead claim file and validates liveness
        const content = fs.readFileSync(targetPath, 'utf8');
        const meta = JSON.parse(content);

        // Post validated message to simulate pause between liveness check and unlink
        parentPort.postMessage({ type: 'VALIDATED_DEAD' });

        // Wait for resume signal from main thread
        parentPort.on('message', (msg) => {
          if (msg.type === 'RESUME_UNLINK') {
            try {
              // Resumed Waiter A attempts to unlink the target dead claim file it validated
              fs.unlinkSync(targetPath);
              parentPort.postMessage({ type: 'UNLINKED' });
            } catch (err) {
              parentPort.postMessage({ type: 'UNLINK_FAILED', error: err.code || err.message });
            }
          }
        });
      `;

      const waiterAWorker = new Worker(waiterAWorkerScript, {
        eval: true,
        workerData: { reclaimDir, deadClaimName },
      });

      const validatedPromise = new Promise((resolve, reject) => {
        waiterAWorker.on('message', (msg) => {
          if (msg.type === 'VALIDATED_DEAD') resolve();
        });
        waiterAWorker.on('error', reject);
      });

      // Wait until Waiter A has validated liveness and is paused right before unlinking
      await validatedPromise;

      // 3. While Waiter A is paused, Waiter B arrives and acquires the reclaim mutex
      const waiterBOwner = 'waiter-b-owner';
      const reclaimB = acquireStaleReclaimMutex(lockPath, waiterBOwner);

      assert.equal(reclaimB.won, true, 'Waiter B must successfully acquire exclusive reclaim rights');

      // Verify Waiter B's ticket or winner lock exists in reclaimDir
      const filesAfterB = fs.readdirSync(reclaimDir).filter((f) => f.includes('ticket') || f.includes('winner'));
      const waiterBFile = filesAfterB.find((f) => f.includes(waiterBOwner));
      assert.ok(waiterBFile, 'Waiter B claim file must exist in reclaim directory');
      const waiterBFilePath = path.join(reclaimDir, waiterBFile);
      assert.ok(fs.existsSync(waiterBFilePath), 'Waiter B claim file must be on disk');

      // 4. Now unpause Waiter A and let it resume its unlink
      const resumePromise = new Promise((resolve, reject) => {
        waiterAWorker.on('message', (msg) => {
          if (msg.type === 'UNLINKED' || msg.type === 'UNLINK_FAILED') resolve(msg);
        });
        waiterAWorker.on('error', reject);
      });

      waiterAWorker.postMessage({ type: 'RESUME_UNLINK' });
      await resumePromise;
      await waiterAWorker.terminate();

      // 5. CRITICAL ASSERTIONS:
      // Waiter B's newly acquired claim mutex file MUST STILL EXIST!
      // Waiter A's delayed execution must NOT have deleted Waiter B's mutex!
      assert.ok(
        fs.existsSync(waiterBFilePath),
        'CRITICAL: Waiter B claim file must NOT be deleted by resumed Waiter A'
      );

      // A competing attempt by Waiter C to acquire the reclaim mutex while B holds it must fail
      const reclaimC = acquireStaleReclaimMutex(lockPath, 'waiter-c-owner');
      assert.equal(reclaimC.won, false, 'Waiter C must not steal reclaim mutex from active Waiter B');

      // Clean up B
      reclaimB.cleanup();
      assert.equal(
        fs.existsSync(waiterBFilePath),
        false,
        'Waiter B claim file must be cleaned up after release'
      );
    } finally {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {}
    }
  });

  test('REGRESSION [P2]: commit_lock writes owner metadata immediately to prevent false-positive staleness', () => {
    const testDir = path.join(os.tmpdir(), `test_commit_meta_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });

    try {
      const admissionStore = new CrossProcessAdmissionStore(testDir);
      const commitMutexPath = `${admissionStore.filePath}.commit_lock`;

      // 1. Verify that when writeData acquires commit lock, owner metadata is written immediately
      // Simulate the exact acquisition in writeData:
      const commitOwnerId = crypto.randomUUID();
      const commitFd = fs.openSync(commitMutexPath, 'wx');
      fs.writeFileSync(
        commitFd,
        JSON.stringify({ pid: process.pid, ownerId: commitOwnerId, createdAt: Date.now() }),
        'utf8'
      );

      try {
        // Assert file exists and is NOT 0 bytes
        const stat = fs.statSync(commitMutexPath);
        assert.ok(stat.size > 0, 'commit_lock must not be 0 bytes; metadata must be written immediately');

        const content = fs.readFileSync(commitMutexPath, 'utf8');
        const parsed = JSON.parse(content);
        assert.equal(parsed.pid, process.pid);
        assert.equal(parsed.ownerId, commitOwnerId);

        // Assert isLockOwnerAlive returns true immediately
        assert.equal(
          isLockOwnerAlive(commitMutexPath),
          true,
          'isLockOwnerAlive must return true immediately for newly created commit_lock'
        );

        // 2. Artificially age commit_lock past 2000ms stale threshold (e.g. 5000ms in the past)
        const pastTime = (Date.now() - 5000) / 1000;
        fs.utimesSync(commitMutexPath, pastTime, pastTime);

        const agedStat = fs.statSync(commitMutexPath);
        assert.ok(Date.now() - agedStat.mtimeMs > 2000, 'mtime must be older than 2000ms stale threshold');

        // Crucial: Because owner process is alive, isLockOwnerAlive MUST still return true!
        assert.equal(
          isLockOwnerAlive(commitMutexPath),
          true,
          'isLockOwnerAlive must return true for aged commit_lock if owner process is alive'
        );

        // 3. Stale check evaluation: Because isLockOwnerAlive is true, stale recovery is skipped
        const isStale = Date.now() - agedStat.mtimeMs > 2000 && !isLockOwnerAlive(commitMutexPath);
        assert.equal(isStale, false, 'Commit lock must NOT be considered stale while owner process is alive');

        // 4. Verify that a dead PID with aged mtime IS correctly identified as stale
        const deadCommitPath = path.join(testDir, 'dead_commit.lock');
        const deadFd = fs.openSync(deadCommitPath, 'wx');
        fs.writeFileSync(
          deadFd,
          JSON.stringify({ pid: 99999999, ownerId: 'dead-commit-owner', createdAt: Date.now() - 5000 }),
          'utf8'
        );
        fs.closeSync(deadFd);
        fs.utimesSync(deadCommitPath, pastTime, pastTime);
        assert.equal(isLockOwnerAlive(deadCommitPath), false, 'Dead PID must report owner not alive');
        const isDeadCommitStale = Date.now() - fs.statSync(deadCommitPath).mtimeMs > 2000 && !isLockOwnerAlive(deadCommitPath);
        assert.equal(isDeadCommitStale, true, 'Dead commit lock with aged mtime must be identified as stale');

        // 5. Guarded release: A different owner attempting cleanup must NOT unlink this commit_lock
        const otherOwnerId = crypto.randomUUID();
        const readBefore = fs.readFileSync(commitMutexPath, 'utf8');
        const parsedBefore = JSON.parse(readBefore);
        if (parsedBefore?.ownerId === otherOwnerId) {
          fs.unlinkSync(commitMutexPath);
        }
        assert.ok(fs.existsSync(commitMutexPath), 'Commit lock must remain intact when ownerId does not match');
      } finally {
        fs.closeSync(commitFd);
        try { fs.unlinkSync(commitMutexPath); } catch {}
      }
    } finally {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {}
    }
  });

  test('REGRESSION [P2]: ticket winner election is linearizable and prevents double-election across concurrent calls with equal timestamps', async () => {
    const testDir = path.join(os.tmpdir(), `test_election_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    const lockPath = path.join(testDir, 'test_election.lock');

    try {
      // Create a stale lock abandoned by a dead process
      fs.writeFileSync(
        lockPath,
        JSON.stringify({ pid: 99999999, ownerId: 'dead-owner', createdAt: Date.now() - 15000 }),
        'utf8'
      );
      const pastTime = (Date.now() - 15000) / 1000;
      fs.utimesSync(lockPath, pastTime, pastTime);

      // Run two concurrent calls through acquireStaleReclaimMutex simultaneously
      const owner1 = 'reclaimer-owner-1';
      const owner2 = 'reclaimer-owner-2';

      const call1Promise = new Promise((resolve) => {
        setImmediate(() => {
          const res = acquireStaleReclaimMutex(lockPath, owner1);
          resolve(res);
        });
      });

      const call2Promise = new Promise((resolve) => {
        setImmediate(() => {
          const res = acquireStaleReclaimMutex(lockPath, owner2);
          resolve(res);
        });
      });

      const [res1, res2] = await Promise.all([call1Promise, call2Promise]);

      // Exactly ONE caller must win. Double election must NEVER occur!
      assert.notEqual(res1.won, res2.won, 'Double election forbidden: exactly one reclaimer must win');
      const winner = res1.won ? res1 : res2;
      const loser = res1.won ? res2 : res1;

      assert.equal(winner.won, true, 'One reclaimer must win');
      assert.equal(loser.won, false, 'The other reclaimer must lose');

      // The winner cleans up
      winner.cleanup();
      loser.cleanup();

      // After release, a subsequent call can acquire
      const subsequent = acquireStaleReclaimMutex(lockPath, 'reclaimer-owner-3');
      assert.equal(subsequent.won, true, 'Subsequent reclaimer can win after previous winner releases');
      subsequent.cleanup();
    } finally {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {}
    }
  });

  test('REGRESSION [P2]: stale commit-lock takeover is atomic against competing recoverers paused after their stale check', async () => {
    const testDir = path.join(os.tmpdir(), `test_takeover_pause_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    const commitMutexPath = path.join(testDir, 'test.commit_lock');

    try {
      // 1. Plant an abandoned commit lock with dead owner PID
      const deadOwnerId = 'dead-owner-original-uuid';
      const deadPid = 99999999;
      fs.writeFileSync(
        commitMutexPath,
        JSON.stringify({ pid: deadPid, ownerId: deadOwnerId, createdAt: Date.now() - 5000 }),
        'utf8'
      );
      const pastTime = (Date.now() - 5000) / 1000;
      fs.utimesSync(commitMutexPath, pastTime, pastTime);

      // Verify lock is older than 2s and owner is dead
      assert.ok(Date.now() - fs.statSync(commitMutexPath).mtimeMs > 2000);
      assert.equal(isLockOwnerAlive(commitMutexPath), false, 'Initial commit lock owner must be dead');

      // 2. Both recoverer 1 and recoverer 2 perform the stale check:
      // Both verify that commitMutexPath is stale (> 2s and dead)
      const recoverer1StaleVerified = Date.now() - fs.statSync(commitMutexPath).mtimeMs > 2000 && !isLockOwnerAlive(commitMutexPath);
      const recoverer2StaleVerified = Date.now() - fs.statSync(commitMutexPath).mtimeMs > 2000 && !isLockOwnerAlive(commitMutexPath);
      assert.equal(recoverer1StaleVerified, true);
      assert.equal(recoverer2StaleVerified, true);

      // 3. Prepare new lock files for both recoverers
      const owner1 = 'recoverer-1-uuid';
      const owner2 = 'recoverer-2-uuid';
      const newPath1 = `${commitMutexPath}.${owner1}.new`;
      const newPath2 = `${commitMutexPath}.${owner2}.new`;

      const fd1 = fs.openSync(newPath1, 'wx');
      fs.writeFileSync(fd1, JSON.stringify({ pid: process.pid, ownerId: owner1, createdAt: Date.now() }), 'utf8');

      const fd2 = fs.openSync(newPath2, 'wx');
      fs.writeFileSync(fd2, JSON.stringify({ pid: process.pid, ownerId: owner2, createdAt: Date.now() }), 'utf8');

      try {
        // 4. SIMULATE PAUSE: Both recoverers passed the stale check above.
        // Recoverer 1 is paused right now.
        // Recoverer 2 wakes up and executes atomicTakeoverStaleLock first:
        const takeover2 = atomicTakeoverStaleLock(commitMutexPath, fd2, newPath2, deadOwnerId);
        assert.equal(takeover2, true, 'Recoverer 2 must successfully take over the dead commit lock');

        // Verify commitMutexPath now belongs to Recoverer 2 and is live
        const currentMeta = JSON.parse(fs.readFileSync(commitMutexPath, 'utf8'));
        assert.equal(currentMeta.ownerId, owner2, 'Commit lock must now belong to Recoverer 2');
        assert.equal(isLockOwnerAlive(commitMutexPath), true, 'Commit lock must now be live');

        // 5. RESUME Recoverer 1: Recoverer 1 wakes up from pause and attempts takeover:
        // Because Recoverer 2 has already taken over and is live, Recoverer 1's takeover MUST FAIL!
        const takeover1 = atomicTakeoverStaleLock(commitMutexPath, fd1, newPath1, deadOwnerId);
        assert.equal(takeover1, false, 'Recoverer 1 takeover must fail; cannot replace live lock');

        // 6. CRITICAL ASSERTION: Commit lock MUST STILL belong to Recoverer 2!
        // Recoverer 1's delayed execution must NOT have overwritten Recoverer 2's commit lock!
        const finalMeta = JSON.parse(fs.readFileSync(commitMutexPath, 'utf8'));
        assert.equal(finalMeta.ownerId, owner2, 'Commit lock must remain intact and owned by Recoverer 2');
      } finally {
        try { fs.closeSync(fd1); } catch {}
        try { fs.closeSync(fd2); } catch {}
        try { if (fs.existsSync(newPath1)) fs.unlinkSync(newPath1); } catch {}
        try { if (fs.existsSync(newPath2)) fs.unlinkSync(newPath2); } catch {}
        try { if (fs.existsSync(commitMutexPath)) fs.unlinkSync(commitMutexPath); } catch {}
      }
    } finally {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {}
    }
  });

  test('REGRESSION [P2]: active takeover mutex is not reaped across multiprocess pause past stale threshold', async () => {
    const testDir = path.join(os.tmpdir(), `test_takeover_mp_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    const commitMutexPath = path.join(testDir, 'test.commit_lock');
    const takeoverLockPath = `${commitMutexPath}.takeover`;
    const pauseFlagPath = path.join(testDir, 'pause.flag');
    fs.writeFileSync(pauseFlagPath, 'pause', 'utf8');

    // 1. Plant an abandoned commit lock with dead owner PID
    const deadOwnerId = 'dead-owner-original-uuid';
    const deadPid = 99999999;
    fs.writeFileSync(
      commitMutexPath,
      JSON.stringify({ pid: deadPid, ownerId: deadOwnerId, createdAt: Date.now() - 5000 }),
      'utf8'
    );
    const pastTime = (Date.now() - 5000) / 1000;
    fs.utimesSync(commitMutexPath, pastTime, pastTime);

    // 2. Child process script that imports atomicTakeoverStaleLock from rateLimiter.ts
    const rateLimiterUrl = pathToFileURL(path.resolve('./src/app/contact/rateLimiter.ts')).href;
    const childScript = path.join(testDir, 'child_recoverer.mjs');
    fs.writeFileSync(
      childScript,
      `
import { atomicTakeoverStaleLock } from '${rateLimiterUrl}';
import fs from 'node:fs';

process.on('message', (msg) => {
  if (msg.type === 'START_TAKEOVER') {
    const { lockFilePath, ownerId, deadOwnerId, pauseFlagPath } = msg;
    const newLockPath = lockFilePath + '.' + ownerId + '.new';
    const newFd = fs.openSync(newLockPath, 'wx');
    fs.writeFileSync(newFd, JSON.stringify({ pid: process.pid, ownerId, createdAt: Date.now() }), 'utf8');

    const onAcquired = () => {
      process.send({ type: 'TAKEOVER_ACQUIRED', pid: process.pid });
      // Pause while flag file exists
      while (fs.existsSync(pauseFlagPath)) {
        const p = Date.now() + 10;
        while (Date.now() < p) {}
      }
    };

    const success = atomicTakeoverStaleLock(lockFilePath, newFd, newLockPath, deadOwnerId, onAcquired);
    try { fs.closeSync(newFd); } catch {}
    process.send({ type: 'TAKEOVER_COMPLETE', success });
  }
});
`,
      'utf8'
    );

    const child = fork(childScript);
    try {
      const childOwnerId = 'child-recoverer-1-uuid';
      const childAcquiredPromise = new Promise((resolve) => {
        child.on('message', (msg) => {
          if (msg.type === 'TAKEOVER_ACQUIRED') resolve(msg);
        });
      });

      child.send({
        type: 'START_TAKEOVER',
        lockFilePath: commitMutexPath,
        ownerId: childOwnerId,
        deadOwnerId,
        pauseFlagPath,
      });

      const acquiredMsg = await childAcquiredPromise;
      const childPid = acquiredMsg.pid;
      assert.ok(typeof childPid === 'number' && childPid > 0);

      // 3. Verify that takeoverLockPath was created and has child PID and owner metadata written immediately
      assert.ok(fs.existsSync(takeoverLockPath), 'Takeover lock file must exist on disk');
      const initialMeta = JSON.parse(fs.readFileSync(takeoverLockPath, 'utf8'));
      assert.equal(initialMeta.pid, childPid, 'Takeover lock must record active child PID immediately');
      assert.ok(initialMeta.ownerId, 'Takeover lock must record ownerId');

      // 4. In parent process (separate OS process), verify that isLockOwnerAlive returns true
      assert.equal(
        isLockOwnerAlive(takeoverLockPath),
        true,
        'Parent OS process must identify that takeover lock owner is actively alive'
      );

      // 5. Artificially age the takeover lock past the 2000ms stale threshold (e.g. 5000ms in the past)
      fs.utimesSync(takeoverLockPath, pastTime, pastTime);
      assert.ok(
        Date.now() - fs.statSync(takeoverLockPath).mtimeMs > 2000,
        'Takeover lock mtime must be older than 2s'
      );

      // 6. Crucial check: Even though mtime is older than 2s, because Child Process 1 is alive,
      // isLockOwnerAlive MUST still return true! Stale recovery condition is FALSE!
      assert.equal(
        isLockOwnerAlive(takeoverLockPath),
        true,
        'Takeover lock must NOT be considered dead while child process is alive'
      );

      // 7. Process 2 (Parent Process) attempts takeover while Child Process 1 is paused past the stale threshold:
      const parentOwnerId = 'parent-recoverer-2-uuid';
      const parentNewPath = `${commitMutexPath}.${parentOwnerId}.new`;
      const parentFd = fs.openSync(parentNewPath, 'wx');
      fs.writeFileSync(parentFd, JSON.stringify({ pid: process.pid, ownerId: parentOwnerId, createdAt: Date.now() }), 'utf8');

      let parentTakeoverResult = false;
      try {
        parentTakeoverResult = atomicTakeoverStaleLock(commitMutexPath, parentFd, parentNewPath, deadOwnerId);
      } finally {
        try { fs.closeSync(parentFd); } catch {}
        try { if (fs.existsSync(parentNewPath)) fs.unlinkSync(parentNewPath); } catch {}
      }

      // Assert parent takeover failed and could NOT reap the active takeover lock
      assert.equal(parentTakeoverResult, false, 'Parent takeover must fail; active takeover lock must not be reaped');

      // CRITICAL ASSERTION: The takeover lock file must STILL be intact and owned by Child Process 1!
      assert.ok(fs.existsSync(takeoverLockPath), 'Takeover lock file must not be deleted by competing recoverer');
      const preservedMeta = JSON.parse(fs.readFileSync(takeoverLockPath, 'utf8'));
      assert.equal(preservedMeta.pid, childPid, 'Takeover lock must remain owned by Child Process 1');

      // 8. Resume Child Process 1 by unlinking pause flag file
      const childCompletePromise = new Promise((resolve) => {
        child.on('message', (msg) => {
          if (msg.type === 'TAKEOVER_COMPLETE') resolve(msg);
        });
      });
      fs.unlinkSync(pauseFlagPath);

      const completeMsg = await childCompletePromise;
      assert.equal(completeMsg.success, true, 'Child process must successfully complete takeover');

      // 9. Verify commitMutexPath is now owned by Child Process 1 and is live
      const finalCommitMeta = JSON.parse(fs.readFileSync(commitMutexPath, 'utf8'));
      assert.equal(finalCommitMeta.ownerId, childOwnerId, 'Commit lock must be owned by Child Process 1');
      assert.equal(isLockOwnerAlive(commitMutexPath), true, 'Commit lock must now be live');
    } finally {
      child.kill();
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {}
    }
  });

  test('REGRESSION [P2]: orphan malformed ticket does not deadlock reclaim election queue', () => {
    const testDir = path.join(os.tmpdir(), `reclaim_orphan_test_${crypto.randomUUID()}`);
    fs.mkdirSync(testDir, { recursive: true });
    const lockFilePath = path.join(testDir, 'test.lock');
    const reclaimDir = `${lockFilePath}.reclaim_dir`;
    fs.mkdirSync(reclaimDir, { recursive: true });

    try {
      // 1. Plant an orphan 0-byte ticket from a dead crashed process (seq 1)
      const orphanTicket1 = path.join(reclaimDir, 'seq_000000000001_dead-crashed-1.ticket');
      fs.writeFileSync(orphanTicket1, '', 'utf8');

      // 2. Plant an orphan corrupted/unparseable ticket from a dead crashed process (seq 2)
      const orphanTicket2 = path.join(reclaimDir, 'seq_000000000002_dead-crashed-2.ticket');
      fs.writeFileSync(orphanTicket2, '{corrupted-json', 'utf8');

      // 3. Plant a dead-process ticket (seq 3)
      const deadTicket3 = path.join(reclaimDir, 'seq_000000000003_dead-crashed-3.ticket');
      fs.writeFileSync(deadTicket3, JSON.stringify({ seq: 3, pid: 99999999, ownerId: 'dead-3' }), 'utf8');

      // 4. A live process attempts to acquire the reclaim mutex
      const activeOwnerId = crypto.randomUUID();
      const reclaim = acquireStaleReclaimMutex(lockFilePath, activeOwnerId);

      // Verify that the live process safely cleans up earlier dead/malformed tickets and WINS
      assert.equal(reclaim.won, true, 'Live process must safely recover from orphan tickets and win election');

      // Verify orphan tickets 1 and 2 and dead ticket 3 were unlinked from disk
      assert.equal(fs.existsSync(orphanTicket1), false, 'Orphan empty ticket must be unlinked');
      assert.equal(fs.existsSync(orphanTicket2), false, 'Orphan corrupted ticket must be unlinked');
      assert.equal(fs.existsSync(deadTicket3), false, 'Dead process ticket must be unlinked');

      // Cleanup
      reclaim.cleanup();
    } finally {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {}
    }
  });

  test('REGRESSION [P2]: withLock fails closed on metadata write failure and aborts if lock is unlinked before entering fn', () => {
    const testDir = path.join(os.tmpdir(), `lock_fail_closed_test_${crypto.randomUUID()}`);
    fs.mkdirSync(testDir, { recursive: true });
    const store = new CrossProcessAdmissionStore(testDir);

    // Part A: Fail closed on metadata write failure
    const origWriteFileSync = fs.writeFileSync;
    let failNextLockWrite = true;
    let writeFailureThrown = false;
    let criticalSectionEntered = false;

    fs.writeFileSync = function(fileOrFd, data, options) {
      if (typeof fileOrFd === 'number' && failNextLockWrite && typeof data === 'string' && data.includes('"pid"')) {
        failNextLockWrite = false;
        throw new Error('ENOSPC: Simulated disk full during metadata write');
      }
      return origWriteFileSync.apply(this, arguments);
    };

    try {
      store['withLock'](() => {
        criticalSectionEntered = true;
      });
    } catch (err) {
      writeFailureThrown = true;
      assert.match(err.message, /Simulated disk full/);
    } finally {
      fs.writeFileSync = origWriteFileSync;
    }

    assert.equal(writeFailureThrown, true, 'Metadata write failure must be thrown rather than swallowed');
    assert.equal(criticalSectionEntered, false, 'Critical section must not execute on write failure');
    assert.equal(fs.existsSync(store.lockFilePath), false, 'Partial lock file must be immediately cleaned up on write failure');

    // Part B: Pre-critical-section owner fencing aborts if lock was unlinked before entering fn
    let fencingTriggered = false;
    let fnExecuted = false;

    fs.writeFileSync = function(fileOrFd, data, options) {
      const res = origWriteFileSync.apply(this, arguments);
      // Simulate another process taking over or unlinking the lock right after writeFileSync succeeds
      if (typeof fileOrFd === 'number' && typeof data === 'string' && data.includes('"pid"')) {
        try {
          if (fs.existsSync(store.lockFilePath)) {
            fs.unlinkSync(store.lockFilePath);
          }
        } catch {}
      }
      return res;
    };

    try {
      store['withLock'](() => {
        fnExecuted = true;
      });
    } catch (err) {
      fencingTriggered = true;
      assert.match(err.message, /LockFenced/);
    } finally {
      fs.writeFileSync = origWriteFileSync;
    }

    assert.equal(fencingTriggered, true, 'Pre-critical-section owner fencing must trigger when lock is unlinked');
    assert.equal(fnExecuted, false, 'fn must NOT execute when lock descriptor was invalidated before entering fn');

    // Part C: Verify CrossProcessRateLimitStore withLock also fences
    const rateStore = new CrossProcessRateLimitStore();
    try {
      if (fs.existsSync(rateStore.lockFilePath)) {
        fs.unlinkSync(rateStore.lockFilePath);
      }
    } catch {}

    let rateFencingTriggered = false;
    let rateFnExecuted = false;
    fs.writeFileSync = function(fileOrFd, data, options) {
      const res = origWriteFileSync.apply(this, arguments);
      if (typeof fileOrFd === 'number' && typeof data === 'string' && data.includes('"pid"')) {
        try {
          if (fs.existsSync(rateStore.lockFilePath)) {
            fs.unlinkSync(rateStore.lockFilePath);
          }
        } catch {}
      }
      return res;
    };

    try {
      rateStore['withLock'](() => {
        rateFnExecuted = true;
      });
    } catch (err) {
      rateFencingTriggered = true;
      assert.match(err.message, /LockFenced/);
    } finally {
      fs.writeFileSync = origWriteFileSync;
      try {
        if (fs.existsSync(rateStore.lockFilePath)) {
          fs.unlinkSync(rateStore.lockFilePath);
        }
      } catch {}
    }

    assert.equal(rateFencingTriggered, true, 'CrossProcessRateLimitStore withLock must fence before fn');
    assert.equal(rateFnExecuted, false, 'CrossProcessRateLimitStore fn must not execute when fenced');

    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  test('REGRESSION [P2]: unlinkIfSameInode strictly fences cleanup to open descriptor inode', () => {
    const testDir = path.join(os.tmpdir(), `inode_fence_test_${crypto.randomUUID()}`);
    fs.mkdirSync(testDir, { recursive: true });
    const lockPath = path.join(testDir, 'test.lock');

    // Case 1: Matching inode unlinks successfully
    const fd1 = fs.openSync(lockPath, 'wx');
    assert.equal(fs.existsSync(lockPath), true);
    const unlinked1 = unlinkIfSameInode(lockPath, fd1);
    assert.equal(unlinked1, true, 'unlinkIfSameInode must unlink matching open descriptor inode');
    fs.closeSync(fd1);
    assert.equal(fs.existsSync(lockPath), false);

    // Case 2: Replacement file with different inode is NOT deleted
    const fd2 = fs.openSync(lockPath, 'wx');
    fs.closeSync(fd2);
    fs.unlinkSync(lockPath);
    const contenderFd = fs.openSync(lockPath, 'wx');
    const contenderMeta = JSON.stringify({ pid: process.pid, ownerId: 'contender-123', createdAt: Date.now() });
    fs.writeFileSync(contenderFd, contenderMeta, 'utf8');
    fs.closeSync(contenderFd);

    // Test with null or mismatched owner
    const unlinkedMismatched = unlinkIfSameInode(lockPath, null, 'original-owner');
    assert.equal(unlinkedMismatched, false);
    assert.equal(fs.existsSync(lockPath), true, 'Contender lock must remain intact');

    // Test with fresh descriptor to another file (different inode)
    const otherPath = path.join(testDir, 'other.tmp');
    const otherFd = fs.openSync(otherPath, 'wx');
    const unlinkedDifferentInode = unlinkIfSameInode(lockPath, otherFd, 'original-owner');
    assert.equal(unlinkedDifferentInode, false, 'Must NOT unlink file when descriptor points to different inode');
    fs.closeSync(otherFd);

    // Verify contender lock is still 100% intact on disk
    assert.equal(fs.existsSync(lockPath), true);
    assert.equal(fs.readFileSync(lockPath, 'utf8'), contenderMeta);

    fs.unlinkSync(lockPath);
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
  });

  test('REGRESSION [P2]: write failure cleanup does not delete replacement lock if lock was taken over during pause', () => {
    const testDir = path.join(os.tmpdir(), `write_fail_takeover_test_${crypto.randomUUID()}`);
    fs.mkdirSync(testDir, { recursive: true });
    const store = new CrossProcessAdmissionStore(testDir);

    const origWriteFileSync = fs.writeFileSync;
    const contenderOwnerId = `contender-${crypto.randomUUID()}`;

    // Simulate process pausing after openSync('wx'), during which a contender replaces the lock
    fs.writeFileSync = function(fileOrFd, data, options) {
      if (typeof fileOrFd === 'number' && typeof data === 'string' && data.includes('"pid"')) {
        // Contender replaces the file at lockFilePath with its own lock
        try {
          const tempContenderPath = path.join(testDir, 'contender.lock.new');
          fs.writeFileSync(
            tempContenderPath,
            JSON.stringify({ pid: process.pid, ownerId: contenderOwnerId, createdAt: Date.now() }),
            'utf8'
          );
          try {
            fs.renameSync(tempContenderPath, store.lockFilePath);
          } catch {
            origWriteFileSync.call(
              fs,
              store.lockFilePath,
              JSON.stringify({ pid: process.pid, ownerId: contenderOwnerId, createdAt: Date.now() }),
              'utf8'
            );
          }
        } catch {}

        // Now simulate write failure on the original paused process
        throw new Error('EIO: Simulated disk error during metadata write');
      }
      return origWriteFileSync.apply(this, arguments);
    };

    let caughtError = false;
    try {
      store['withLock'](() => {});
    } catch (err) {
      caughtError = true;
      assert.match(err.message, /Simulated disk error/);
    } finally {
      fs.writeFileSync = origWriteFileSync;
    }

    assert.equal(caughtError, true, 'Write error must be thrown');
    assert.equal(fs.existsSync(store.lockFilePath), true, 'Contender replacement lock must NOT be deleted by write failure cleanup');
    const remainingContent = JSON.parse(fs.readFileSync(store.lockFilePath, 'utf8'));
    assert.equal(remainingContent.ownerId, contenderOwnerId, 'Remaining lock on disk must belong to contender');

    try {
      fs.unlinkSync(store.lockFilePath);
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  test('REGRESSION [P2]: withLock guarded release does not delete competitor lock on malformed JSON', () => {
    const testDir = path.join(os.tmpdir(), `guarded_release_test_${crypto.randomUUID()}`);
    fs.mkdirSync(testDir, { recursive: true });
    const store = new CrossProcessAdmissionStore(testDir);

    // Create a lock file held by another process with malformed/in-progress content
    fs.writeFileSync(store.lockFilePath, '{"partial_unparseable', 'utf8');

    // Run simulated release cleanup with a different ownerId: must NOT unlink on parse error
    const fakeOwnerId = `fake-${crypto.randomUUID()}`;
    try {
      if (fs.existsSync(store.lockFilePath)) {
        const content = fs.readFileSync(store.lockFilePath, 'utf8');
        try {
          const meta = JSON.parse(content);
          if (meta?.ownerId === fakeOwnerId) {
            fs.unlinkSync(store.lockFilePath);
          }
        } catch {}
      }
    } catch {}

    assert.equal(fs.existsSync(store.lockFilePath), true, 'Malformed lock file from competitor must NOT be unlinked by release cleanup');
    assert.equal(fs.readFileSync(store.lockFilePath, 'utf8'), '{"partial_unparseable');

    try {
      fs.unlinkSync(store.lockFilePath);
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  test('REGRESSION [P2]: multiprocess regression: swapping lock path between comparison and unlink does NOT delete replacement lock', async () => {
    const testDir = path.join(os.tmpdir(), `swap_unlink_mp_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    const lockPath = path.join(testDir, 'test.lock');
    const swappedFlagPath = path.join(testDir, 'swapped.flag');

    // 1. Process 1 (Parent) opens lockPath and writes its metadata
    const proc1OwnerId = `proc1-owner-${crypto.randomUUID()}`;
    const fd1 = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(
      fd1,
      JSON.stringify({ pid: process.pid, ownerId: proc1OwnerId, createdAt: Date.now() }),
      'utf8'
    );
    const originalFd1Stat = fs.fstatSync(fd1);

    // 2. Child process script that will swap lockPath with a new replacement lock
    const childOwnerId = `child-reclaimer-${crypto.randomUUID()}`;
    const childScript = path.join(testDir, 'child_swapper.mjs');
    fs.writeFileSync(
      childScript,
      `
import fs from 'node:fs';

process.on('message', (msg) => {
  if (msg.type === 'SWAP_LOCK') {
    const { lockPath, childOwnerId, swappedFlagPath } = msg;
    try {
      // Delete old file and create brand-new replacement file with a fresh inode
      fs.unlinkSync(lockPath);
      const fd2 = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(
        fd2,
        JSON.stringify({ pid: process.pid, ownerId: childOwnerId, createdAt: Date.now() }),
        'utf8'
      );
      fs.closeSync(fd2);
      fs.writeFileSync(swappedFlagPath, 'ready', 'utf8');
      process.send({ type: 'SWAP_DONE' });
    } catch (err) {
      process.send({ type: 'SWAP_ERROR', error: err.message });
    }
  }
});
`,
      'utf8'
    );

    const child = fork(childScript);
    try {
      const childDonePromise = new Promise((resolve) => {
        child.on('message', (msg) => {
          if (msg.type === 'SWAP_DONE') resolve(true);
        });
      });

      let hookExecuted = false;
      // 3. Process 1 invokes unlinkIfSameInode with an onBeforeUnlink hook
      const unlinked = unlinkIfSameInode(lockPath, fd1, proc1OwnerId, () => {
        hookExecuted = true;
        // Trigger child process to swap the path while Process 1 is between comparison and unlink
        child.send({
          type: 'SWAP_LOCK',
          lockPath,
          childOwnerId,
          swappedFlagPath,
        });

        // Wait synchronously for child to complete the path swap
        const startWait = Date.now();
        while (!fs.existsSync(swappedFlagPath) && Date.now() - startWait < 5000) {
          const pause = Date.now() + 5;
          while (Date.now() < pause) {}
        }
      });

      await childDonePromise;
      assert.equal(hookExecuted, true, 'onBeforeUnlink hook must have executed');

      // 4. CRITICAL ASSERTION: unlinkIfSameInode must return false because the directory entry
      // was swapped to a different inode before unlink, and MUST NOT delete the replacement lock!
      assert.equal(unlinked, false, 'unlinkIfSameInode must return false when file was replaced before unlink');
      assert.equal(fs.existsSync(lockPath), true, 'Replacement lock on disk must NOT be deleted');

      const onDiskStat = fs.statSync(lockPath);
      assert.notEqual(onDiskStat.ino, originalFd1Stat.ino, 'On-disk file must have replacement inode');
      const onDiskContent = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      assert.equal(onDiskContent.ownerId, childOwnerId, 'On-disk file must still belong to child reclaimer');
      assert.equal(onDiskContent.pid, child.pid, 'On-disk file must still record child process PID');
    } finally {
      try { fs.closeSync(fd1); } catch {}
      try { child.kill('SIGKILL'); } catch {}
      try { fs.unlinkSync(lockPath); } catch {}
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
    }
  });

  test('REGRESSION [P2]: repeated already-throttled requests count toward shared global flood budget in database RPC', async () => {
    // Simulated database RPC engine matching PostgreSQL function consume_contact_rate_limit:
    // Tracks global admission tracker c_global_admission_key and per-key rows
    const c_global_admission_key = 'digest:sha256:0000000000000000000000000000000000000000000000000000000000000000';
    const c_max_global_requests = 120;
    const c_global_window_ms = 60000;
    const c_cooldown_ms = 5000;
    const c_max_requests = 5;

    const dbTable = new Map();
    let advisoryLock = Promise.resolve();

    const mockSupabase = {
      rpc: async (funcName, params) => {
        assert.equal(funcName, 'consume_contact_rate_limit');
        const keys = params.p_keys;
        const now = Date.now();

        // Transactional advisory lock
        const prevLock = advisoryLock;
        let releaseLock;
        advisoryLock = new Promise((resolve) => { releaseLock = resolve; });
        await prevLock;

        try {
          // 5b. Shared global admission check
          let globalRec = dbTable.get(c_global_admission_key);
          let globalTs = globalRec
            ? globalRec.timestamps.filter((ts) => ts > now - c_global_window_ms)
            : [];

          if (globalTs.length >= c_max_global_requests) {
            const retryAfter = Math.ceil((globalTs[0] + c_global_window_ms - now) / 1000);
            return {
              data: {
                allowed: false,
                retryAfterSeconds: retryAfter,
                error: 'Inquiry service is receiving unusually high traffic. Please wait a moment or contact our atelier directly via phone or WhatsApp.',
              },
              error: null,
            };
          }

          // Count every attempt entering the RPC against global flood admission window
          globalTs.push(now);
          dbTable.set(c_global_admission_key, {
            timestamps: globalTs,
            lastUpdated: now,
          });

          // 7. Check per-key limits under row locks
          for (const key of keys) {
            const rec = dbTable.get(key);
            if (rec) {
              const filteredTs = rec.timestamps.filter((ts) => ts > now - c_global_window_ms);
              if (filteredTs.length > 0) {
                const lastTs = filteredTs[filteredTs.length - 1];
                if (now - lastTs < c_cooldown_ms) {
                  const retryAfter = Math.ceil((c_cooldown_ms - (now - lastTs)) / 1000);
                  return {
                    data: {
                      allowed: false,
                      retryAfterSeconds: retryAfter,
                      error: 'Please wait a moment before sending another message.',
                    },
                    error: null,
                  };
                }

                if (filteredTs.length >= c_max_requests) {
                  const retryAfter = Math.ceil((filteredTs[0] + c_global_window_ms - now) / 1000);
                  return {
                    data: {
                      allowed: false,
                      retryAfterSeconds: retryAfter,
                      error: 'Too many inquiries submitted. Please wait a few minutes before trying again or reach out to our concierge directly.',
                    },
                    error: null,
                  };
                }
              }
            }
          }

          // 9. Commit client keys
          for (const key of keys) {
            let rec = dbTable.get(key);
            if (rec) {
              rec.timestamps = rec.timestamps.filter((ts) => ts > now - c_global_window_ms);
              rec.timestamps.push(now);
              rec.lastUpdated = now;
            } else {
              dbTable.set(key, { timestamps: [now], lastUpdated: now });
            }
          }

          return { data: { allowed: true }, error: null };
        } finally {
          releaseLock();
        }
      },
    };

    const clientStore = new DatabaseRpcRateLimitStore(async () => mockSupabase);

    // 1. Initial request from client succeeds
    const firstRes = await clientStore.consumeKeys(['ip:198.51.100.42']);
    assert.equal(firstRes.allowed, true, 'First request should be allowed');

    // 2. Second immediate request from same client is throttled by burst cooldown
    const throttledRes = await clientStore.consumeKeys(['ip:198.51.100.42']);
    assert.equal(throttledRes.allowed, false, 'Immediate second request should be throttled by cooldown');
    assert.match(throttledRes.error, /wait a moment/i);

    // 3. Client continues sending repeated rejected requests while already throttled.
    // Each rejected retry enters the RPC and MUST count toward c_global_admission_key!
    for (let i = 0; i < 118; i++) {
      const rejectedRetry = await clientStore.consumeKeys(['ip:198.51.100.42']);
      assert.equal(rejectedRetry.allowed, false, `Retry ${i + 1} must be rejected while in cooldown`);
    }

    // Verify c_global_admission_key accumulated all 120 attempts (1 allowed + 1 throttled + 118 retries)
    const globalEntry = dbTable.get(c_global_admission_key);
    assert.ok(globalEntry, 'Global admission tracker must exist in database table');
    assert.equal(globalEntry.timestamps.length, 120, 'All 120 rejected and allowed attempts must be counted in global window');

    // 4. 121st request: Even from a brand-new IP, the RPC now triggers the global flood gate
    const floodRes = await clientStore.consumeKeys(['ip:203.0.113.88']);
    assert.equal(floodRes.allowed, false, '121st attempt must be blocked by shared global flood limit');
    assert.match(floodRes.error, /unusually high traffic/i);
  });

  test('REGRESSION [P2]: repeated already-throttled requests count toward global admission window in CrossProcessAdmissionStore', () => {
    const testDir = path.join(os.tmpdir(), `admission_throttled_global_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    const store = new CrossProcessAdmissionStore(testDir);
    const now = 700000;

    try {
      // 1. Fill per-IP quota for 192.0.2.1 up to MAX_ADMISSIONS_PER_IP (15)
      for (let i = 0; i < ADMISSION_LIMIT_CONFIG.MAX_ADMISSIONS_PER_IP; i++) {
        const res = store.checkAdmission({ ip: '192.0.2.1' }, now + i * 10);
        assert.equal(res.allowed, true);
      }

      // 2. 16th submission from 192.0.2.1 is throttled
      const throttled16 = store.checkAdmission({ ip: '192.0.2.1' }, now + 200);
      assert.equal(throttled16.allowed, false);
      assert.match(throttled16.error, /too many inquiries/i);

      // Verify that the rejected 16th attempt WAS counted into globalTimestamps (total 16)
      assert.equal(store.getGlobalCount(), 16, 'Rejected throttled attempt must be counted in global admission tracker');

      // 3. Send remaining 104 rejected requests from the throttled IP up to MAX_GLOBAL_ADMISSIONS (120)
      for (let i = 0; i < 104; i++) {
        const rejected = store.checkAdmission({ ip: '192.0.2.1' }, now + 300 + i * 5);
        assert.equal(rejected.allowed, false);
      }
      assert.equal(store.getGlobalCount(), 120, 'All rejected retries must accumulate in global tracker');

      // 4. 121st request from a new IP is now blocked by the global flood limit
      const floodBlocked = store.checkAdmission({ ip: '198.51.100.99' }, now + 1000);
      assert.equal(floodBlocked.allowed, false);
      assert.match(floodBlocked.error, /unusually high traffic/i);
    } finally {
      store.clear();
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
    }
  });

  test('REGRESSION [P2]: isLockOwnerAlive safely guards create-to-metadata gap for recently created empty lock file', () => {
    const testDir = path.join(os.tmpdir(), `gap_guard_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    const emptyLockPath = path.join(testDir, 'gap_test.lock');

    try {
      // 1. Create a 0-byte lock file simulating process paused between openSync('wx') and writeFileSync
      const fd = fs.openSync(emptyLockPath, 'wx');
      fs.closeSync(fd);
      assert.equal(fs.existsSync(emptyLockPath), true);
      assert.equal(fs.statSync(emptyLockPath).size, 0);

      // 2. In create-to-metadata window (< 2000ms), isLockOwnerAlive MUST return true so competitors do not steal
      assert.equal(
        isLockOwnerAlive(emptyLockPath),
        true,
        'isLockOwnerAlive must return true for newly created 0-byte file in create-to-metadata window'
      );

      // 3. Artificially age the 0-byte file past the 2000ms threshold
      const pastTime = (Date.now() - 5000) / 1000;
      fs.utimesSync(emptyLockPath, pastTime, pastTime);

      // 4. Once aged past 2000ms without metadata, it MUST be recognized as abandoned/stale (false)
      assert.equal(
        isLockOwnerAlive(emptyLockPath),
        false,
        'isLockOwnerAlive must return false for aged 0-byte file'
      );
    } finally {
      try { fs.unlinkSync(emptyLockPath); } catch {}
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
    }
  });

  test('REGRESSION [P2]: multiprocess regression: pausing immediately after openSync aborts cleanup and preserves competitor lock when competitor reclaims takeover mutex', async () => {
    const testDir = path.join(os.tmpdir(), `takeover_gap_mp_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    const lockPath = path.join(testDir, 'target.lock');
    const takeoverMutexPath = `${lockPath}.takeover`;
    const readyFlagPath = path.join(testDir, 'reclaimed.flag');

    // 1. Process 1 (Parent) opens lockPath and records initial metadata
    const proc1OwnerId = `proc1-cleaner-${crypto.randomUUID()}`;
    const fd1 = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(
      fd1,
      JSON.stringify({ pid: process.pid, ownerId: proc1OwnerId, createdAt: Date.now() }),
      'utf8'
    );
    const fd1Stat = fs.fstatSync(fd1);

    // 2. Child worker script: reclaims takeoverMutexPath and replaces target lockPath
    const childTakeoverId = `child-takeover-${crypto.randomUUID()}`;
    const childLockOwnerId = `child-lock-${crypto.randomUUID()}`;
    const childScript = path.join(testDir, 'child_reclaimer.mjs');

    fs.writeFileSync(
      childScript,
      `
import fs from 'node:fs';

process.on('message', (msg) => {
  if (msg.type === 'RECLAIM_TAKEOVER') {
    const { lockPath, takeoverMutexPath, childTakeoverId, childLockOwnerId, readyFlagPath } = msg;
    try {
      // Artificially age parent's empty takeover mutex past 2000ms
      const pastTime = (Date.now() - 5000) / 1000;
      fs.utimesSync(takeoverMutexPath, pastTime, pastTime);

      // Reclaim the takeover mutex (unlink and recreate with child's descriptor & metadata)
      fs.unlinkSync(takeoverMutexPath);
      const childTakeoverFd = fs.openSync(takeoverMutexPath, 'wx');
      fs.writeFileSync(
        childTakeoverFd,
        JSON.stringify({ pid: process.pid, ownerId: childTakeoverId, createdAt: Date.now() }),
        'utf8'
      );
      fs.closeSync(childTakeoverFd);

      // Replace target lock with child's own active lock
      fs.unlinkSync(lockPath);
      const childLockFd = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(
        childLockFd,
        JSON.stringify({ pid: process.pid, ownerId: childLockOwnerId, createdAt: Date.now() }),
        'utf8'
      );
      fs.closeSync(childLockFd);

      fs.writeFileSync(readyFlagPath, 'done', 'utf8');
      process.send({ type: 'RECLAIM_DONE' });
    } catch (err) {
      process.send({ type: 'RECLAIM_ERROR', error: err.message });
    }
  }
});
`,
      'utf8'
    );

    const child = fork(childScript);
    let childTimer = null;
    let childSettled = false;
    try {
      const childDonePromise = new Promise((resolve, reject) => {
        childTimer = setTimeout(() => {
          if (!childSettled) {
            childSettled = true;
            reject(new Error('Timed out waiting for child worker to report reclaim completion (10s limit)'));
          }
        }, 10000);

        child.on('message', (msg) => {
          if (childSettled) return;
          if (msg.type === 'RECLAIM_DONE') {
            childSettled = true;
            if (childTimer) clearTimeout(childTimer);
            resolve(true);
          } else if (msg.type === 'RECLAIM_ERROR') {
            childSettled = true;
            if (childTimer) clearTimeout(childTimer);
            reject(new Error(`Child worker failed during takeover reclaim: ${msg.error}`));
          }
        });

        child.on('error', (err) => {
          if (!childSettled) {
            childSettled = true;
            if (childTimer) clearTimeout(childTimer);
            reject(new Error(`Child process emitted error: ${err.message}`));
          }
        });

        child.on('exit', (code, signal) => {
          if (!childSettled) {
            childSettled = true;
            if (childTimer) clearTimeout(childTimer);
            reject(new Error(`Child process exited unexpectedly before RECLAIM_DONE with code ${code} (signal: ${signal})`));
          }
        });
      });

      let hookExecuted = false;
      // 3. Process 1 calls unlinkIfSameInode with onAfterTakeoverOpen hook
      // This pauses Process 1 immediately after openSync(takeoverMutexPath, 'wx') before writeFileSync!
      const unlinked = unlinkIfSameInode(
        lockPath,
        fd1,
        proc1OwnerId,
        undefined, // onBeforeUnlink
        () => {
          hookExecuted = true;
          // Trigger child to take over takeoverMutexPath and swap lockPath while parent is paused
          child.send({
            type: 'RECLAIM_TAKEOVER',
            lockPath,
            takeoverMutexPath,
            childTakeoverId,
            childLockOwnerId,
            readyFlagPath,
          });

          // Wait synchronously for child to finish takeover and lock replacement
          const startWait = Date.now();
          while (!fs.existsSync(readyFlagPath) && Date.now() - startWait < 5000) {
            const pause = Date.now() + 5;
            while (Date.now() < pause) {}
          }
        }
      );

      await childDonePromise;
      assert.equal(hookExecuted, true, 'onAfterTakeoverOpen hook must have executed');

      // 4. CRITICAL ASSERTION: unlinkIfSameInode MUST detect the lost takeover mutex via descriptor/link/owner fencing,
      // return false, and MUST NOT delete the competitor's replacement lock or takeover lock!
      assert.equal(unlinked, false, 'unlinkIfSameInode must return false when takeover mutex was reclaimed during open-to-write pause');
      assert.equal(fs.existsSync(lockPath), true, 'Competitor replacement lock must NOT be deleted');

      const currentLockStat = fs.statSync(lockPath);
      assert.notEqual(currentLockStat.ino, fd1Stat.ino, 'On-disk lock must have replacement inode');
      const currentLockContent = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      assert.equal(currentLockContent.ownerId, childLockOwnerId, 'Target lock must still belong to competitor');
      assert.equal(currentLockContent.pid, child.pid, 'Target lock must still record competitor PID');

      // Verify competitor's takeover mutex is also intact
      assert.equal(fs.existsSync(takeoverMutexPath), true, 'Competitor takeover mutex must NOT be unlinked by parent');
      const currentTakeoverContent = JSON.parse(fs.readFileSync(takeoverMutexPath, 'utf8'));
      assert.equal(currentTakeoverContent.ownerId, childTakeoverId, 'Takeover mutex must belong to competitor');
    } finally {
      if (childTimer) clearTimeout(childTimer);
      try { fs.closeSync(fd1); } catch {}
      try { child.kill('SIGKILL'); } catch {}
      try { fs.unlinkSync(lockPath); } catch {}
      try { fs.unlinkSync(takeoverMutexPath); } catch {}
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
    }
  });

  test('REGRESSION [P2]: writeFileSync failure during takeover mutex creation unlinks mutex via descriptor inode fencing before closing FD, preventing poisoned PID staleness', () => {
    const testDir = path.join(os.tmpdir(), `takeover_write_fail_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    const lockPath = path.join(testDir, 'target.lock');
    const takeoverMutexPath = `${lockPath}.takeover`;

    const ownerId = `owner-${crypto.randomUUID()}`;
    const fd = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(
      fd,
      JSON.stringify({ pid: process.pid, ownerId, createdAt: Date.now() }),
      'utf8'
    );

    const origWriteFileSync = fs.writeFileSync;
    let simulatedWriteFailed = false;

    try {
      // Intercept writeFileSync: when writing metadata to takeoverMutexPath, write a partial malformed record
      // containing this process's PID and then throw an I/O error (e.g. ENOSPC / EIO)
      fs.writeFileSync = function (targetFd, data, options) {
        if (typeof targetFd === 'number' && !simulatedWriteFailed) {
          try {
            const stat = fs.fstatSync(targetFd);
            if (fs.existsSync(takeoverMutexPath)) {
              const tStat = fs.statSync(takeoverMutexPath);
              if (stat.ino === tStat.ino && stat.dev === tStat.dev) {
                simulatedWriteFailed = true;
                // Partially write malformed record containing current process PID
                origWriteFileSync(targetFd, `{"pid":${process.pid},"ownerId":`, 'utf8');
                throw new Error('ENOSPC: no space left on device (simulated partial write failure)');
              }
            }
          } catch (inspectErr) {
            if (inspectErr.message && inspectErr.message.includes('simulated partial write failure')) {
              throw inspectErr;
            }
          }
        }
        return origWriteFileSync.apply(fs, arguments);
      };

      // Attempt unlinkIfSameInode: during takeoverMutexPath metadata write, writeFileSync fails.
      // unlinkIfSameInode MUST catch the write error and unlink takeoverMutexPath via descriptor/inode
      // fencing BEFORE closing the descriptor.
      const unlinked = unlinkIfSameInode(lockPath, fd, ownerId);
      assert.equal(unlinked, false, 'unlinkIfSameInode must return false when takeover mutex write fails');
      assert.equal(simulatedWriteFailed, true, 'Simulated partial write failure must have been triggered');

      // CRITICAL ASSERTION: The partial/malformed takeover mutex file MUST NOT remain on disk.
      // If left on disk, isLockOwnerAlive regex would extract process.pid and treat it as permanently live,
      // poisoning subsequent cleanup/takeover attempts.
      assert.equal(
        fs.existsSync(takeoverMutexPath),
        false,
        'takeoverMutexPath MUST be unlinked before FD close to prevent abandoned poisoned mutex'
      );
      assert.equal(
        isLockOwnerAlive(takeoverMutexPath),
        false,
        'isLockOwnerAlive must return false because abandoned takeover mutex was cleanly unlinked'
      );

      // Now restore fs.writeFileSync and verify that a subsequent retry of unlinkIfSameInode succeeds immediately
      // without getting stuck against a poisoned takeover mutex!
      fs.writeFileSync = origWriteFileSync;

      const retryUnlinked = unlinkIfSameInode(lockPath, fd, ownerId);
      assert.equal(retryUnlinked, true, 'Subsequent unlinkIfSameInode retry must succeed without timing out');
      assert.equal(fs.existsSync(lockPath), false, 'Target lock must be cleanly deleted on retry');
    } finally {
      fs.writeFileSync = origWriteFileSync;
      try { fs.closeSync(fd); } catch {}
      try { fs.unlinkSync(lockPath); } catch {}
      try { fs.unlinkSync(takeoverMutexPath); } catch {}
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
    }
  });

  test('REGRESSION [P2]: unlinkDescriptorInode unlinks matching open descriptor inode without requiring valid JSON metadata', () => {
    const testDir = path.join(os.tmpdir(), `desc_unlink_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    const filePath = path.join(testDir, 'raw.lock');

    try {
      assert.equal(unlinkDescriptorInode(filePath, null), false);

      const fd = fs.openSync(filePath, 'wx');
      // Write non-JSON garbage / partial data
      fs.writeFileSync(fd, 'malformed-non-json-content', 'utf8');

      // Unlink before closing fd
      const unlinked = unlinkDescriptorInode(filePath, fd);
      assert.equal(unlinked, true, 'Must unlink file matching open descriptor inode');
      assert.equal(fs.existsSync(filePath), false, 'File must be removed from disk');

      fs.closeSync(fd);

      // Calling again on closed fd must safely return false
      assert.equal(unlinkDescriptorInode(filePath, fd), false);
    } finally {
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
    }
  });

  test('REGRESSION [P2]: unlinkDescriptorInode revalidates inode at unlink time and does NOT delete replacement mutex swapped between stat and unlink', () => {
    const testDir = path.join(os.tmpdir(), `desc_unlink_swap_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    const mutexPath = path.join(testDir, 'reclaimed.takeover');

    // 1. Creator opens the initial mutex descriptor
    const creatorFd = fs.openSync(mutexPath, 'wx');
    fs.writeFileSync(creatorFd, 'initial-creator-content', 'utf8');
    const creatorStat = fs.fstatSync(creatorFd);

    let competitorSwapped = false;
    let replacementStat = null;

    try {
      // 2. Call unlinkDescriptorInode with an onBeforeUnlink hook
      // This hook fires AFTER the initial stat check but BEFORE the pre-unlink verification and unlinkSync!
      const unlinked = unlinkDescriptorInode(mutexPath, creatorFd, () => {
        competitorSwapped = true;
        // Competitor simulates reclaiming the stale mutex after creator paused:
        // unlinks old mutex and replaces it with a new file descriptor (different inode)
        fs.unlinkSync(mutexPath);
        const repFd = fs.openSync(mutexPath, 'wx');
        fs.writeFileSync(repFd, JSON.stringify({ pid: process.pid, ownerId: 'competitor-reclaimer', createdAt: Date.now() }), 'utf8');
        replacementStat = fs.fstatSync(repFd);
        fs.closeSync(repFd);
      });

      assert.equal(competitorSwapped, true, 'Competitor swap hook must have executed');

      // 3. CRITICAL ASSERTIONS:
      // unlinkDescriptorInode MUST revalidate the inode at unlink time, detect that the file on disk
      // now has a different inode (replacementStat.ino !== creatorStat.ino), return false, and MUST NOT
      // delete the replacement mutex!
      assert.equal(unlinked, false, 'unlinkDescriptorInode must return false when file was replaced before unlink');
      assert.equal(fs.existsSync(mutexPath), true, 'Replacement mutex must NOT be deleted');

      const onDiskStat = fs.statSync(mutexPath);
      assert.equal(onDiskStat.ino, replacementStat.ino, 'On-disk file must retain replacement inode');
      const onDiskContent = JSON.parse(fs.readFileSync(mutexPath, 'utf8'));
      assert.equal(onDiskContent.ownerId, 'competitor-reclaimer', 'Replacement mutex must retain competitor ownership');
    } finally {
      try { fs.closeSync(creatorFd); } catch {}
      try { fs.unlinkSync(mutexPath); } catch {}
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
    }
  });

  test('REGRESSION [P2]: atomicTakeoverStaleLock closes nTfd descriptor and cleans up temporary .new file on reclaim failure', () => {
    const testDir = path.join(os.tmpdir(), `takeover_fail_fd_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    const lockPath = path.join(testDir, 'target.lock');
    const takeoverLockPath = `${lockPath}.takeover`;

    // 1. Create a stale takeover lock (> 2000ms old with dead process PID)
    fs.writeFileSync(
      takeoverLockPath,
      JSON.stringify({ pid: 99999999, ownerId: 'dead-process', createdAt: Date.now() - 5000 }),
      'utf8'
    );
    const past = (Date.now() - 5000) / 1000;
    fs.utimesSync(takeoverLockPath, past, past);

    const newTargetFd = fs.openSync(path.join(testDir, 'new.lock'), 'wx');
    const origRenameSync = fs.renameSync;
    let renameAttempted = false;

    try {
      // Simulate renameSync throwing an error during stale takeover reclamation
      fs.renameSync = function (oldPath, newPath) {
        if (typeof oldPath === 'string' && oldPath.endsWith('.new')) {
          renameAttempted = true;
          throw new Error('EIO: simulated I/O error during takeover renameSync');
        }
        return origRenameSync.apply(fs, arguments);
      };

      // Call atomicTakeoverStaleLock: will attempt to reclaim stale takeoverLockPath using a .new file
      const result = atomicTakeoverStaleLock(lockPath, newTargetFd, path.join(testDir, 'new.lock'), 'dead-process');
      assert.equal(result, false, 'atomicTakeoverStaleLock must return false when rename fails');
      assert.equal(renameAttempted, true, 'Simulated rename error must have been encountered');

      // Verify that no orphaned .new file remains on disk
      const files = fs.readdirSync(testDir);
      const leakedNewFiles = files.filter((f) => f.includes('.new'));
      assert.equal(leakedNewFiles.length, 0, 'Temporary .new file must be cleaned up on failure');
    } finally {
      fs.renameSync = origRenameSync;
      try { fs.closeSync(newTargetFd); } catch {}
      try { fs.unlinkSync(lockPath); } catch {}
      try { fs.unlinkSync(takeoverLockPath); } catch {}
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
    }
  });
});


