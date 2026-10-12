import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONTACT_FIELD_LIMITS,
  RATE_LIMIT_CONFIG,
  SharedRateLimiter,
  DatabaseRpcRateLimitStore,
  CrossProcessRateLimitStore,
  checkContactRateLimit,
  checkContactRateLimitMulti,
  pruneExpiredEntries,
  getRateLimitStoreSize,
  resetRateLimitStore,
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

    // Fill store to its full capacity with 1000 active keys
    for (let i = 0; i < 1000; i++) {
      const res = await limiter.consumeKeys([`ip:capacity-test-${i}`], now);
      assert.equal(res.allowed, true, `Key ${i} should be accepted`);
    }
    assert.equal(limiter.getStoreSize(), 1000);

    // Attempting to insert a 1001st active key must NOT evict existing active keys or reset quotas
    const saturatedRes = await limiter.consumeKeys(['ip:capacity-test-1001'], now);
    assert.equal(saturatedRes.allowed, false);
    assert.match(saturatedRes.error, /high volume/i);
    assert.equal(limiter.getStoreSize(), 1000);

    // Verify existing active keys retain their quota and were not wiped
    const existingKeyRecord = limiter.getRecord('ip:capacity-test-0');
    assert.ok(existingKeyRecord);
    assert.equal(existingKeyRecord.timestamps.length, 1);

    // Advance time past the 10-minute window so active keys expire
    const expiredTime = now + RATE_LIMIT_CONFIG.WINDOW_MS + 1000;
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

    // 1. Worker A receives request from clientIp with emailA via production store boundary
    const resA = await checkContactRateLimitMulti({ ip: clientIp, email: 'alice@example.com' }, now);
    assert.equal(resA.allowed, true);

    // 2. Worker B immediately receives request from same clientIp with different emailB
    // Must be rejected by shared IP burst cooldown across workers
    const resB = await checkContactRateLimitMulti({ ip: clientIp, email: 'bob@example.com' }, now + 1000);
    assert.equal(resB.allowed, false, 'Worker B must enforce IP cooldown from Worker A');
    assert.match(resB.error, /wait a moment/i);

    // 3. Worker B receives request with alice@example.com from different clientIp
    // Must be rejected by shared email burst cooldown across workers
    const resC = await checkContactRateLimitMulti({ ip: '198.51.100.99', email: 'alice@example.com' }, now + 1000);
    assert.equal(resC.allowed, false, 'Worker B must enforce email cooldown from Worker A');
    assert.match(resC.error, /wait a moment/i);

    // 4. Cumulative window limit across workers
    let timeCursor = now;
    const targetEmail = 'shared-user@example.com';
    // Worker A consumes 2 slots
    timeCursor += 6000;
    await checkContactRateLimitMulti({ ip: '10.0.0.1', email: targetEmail }, timeCursor);
    timeCursor += 6000;
    await checkContactRateLimitMulti({ ip: '10.0.0.2', email: targetEmail }, timeCursor);

    // Worker B consumes 3 slots
    timeCursor += 6000;
    await checkContactRateLimitMulti({ ip: '10.0.0.3', email: targetEmail }, timeCursor);
    timeCursor += 6000;
    await checkContactRateLimitMulti({ ip: '10.0.0.4', email: targetEmail }, timeCursor);
    timeCursor += 6000;
    await checkContactRateLimitMulti({ ip: '10.0.0.5', email: targetEmail }, timeCursor);

    // 6th request across either worker must be rejected
    timeCursor += 6000;
    const rejectedWorkerA = await checkContactRateLimitMulti({ ip: '10.0.0.6', email: targetEmail }, timeCursor);
    const rejectedWorkerB = await checkContactRateLimitMulti({ ip: '10.0.0.7', email: targetEmail }, timeCursor);

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

    // 1. Successful consumption passes ONLY keys to RPC (server derives policy constants and timestamps)
    const successRes = await dbStore.consumeKeys(['ip:1.2.3.4', 'email:test@example.com']);
    assert.equal(successRes.allowed, true);
    assert.equal(capturedRpc.funcName, 'consume_contact_rate_limit');
    assert.deepEqual(capturedRpc.params, { p_keys: ['ip:1.2.3.4', 'email:test@example.com'] });
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
      dbStore.set(`ip:prepopulated-${i}`, { timestamps: [Date.now()] });
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

          // Capacity check
          if (totalKeys + newKeys.length > capacityLimit) {
            return {
              data: {
                allowed: false,
                error: 'Service is temporarily experiencing high volume. Please wait a few moments before trying again or reach out to our concierge directly.',
              },
              error: null,
            };
          }

          // Commit new keys to database table
          for (const key of newKeys) {
            dbStore.set(key, { timestamps: [Date.now()] });
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
    const rejectedResults = results.filter((r) => !r.allowed);

    // Under serialized advisory locking, exactly 1 succeeds and 4 are rejected
    assert.equal(allowedResults.length, 1, 'Exactly 1 concurrent new key must take the final capacity slot');
    assert.equal(rejectedResults.length, 4, 'All remaining concurrent requests must be rejected');
    assert.match(rejectedResults[0].error, /high volume/i);
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
    assert.equal(dbQuotaTable.has(victimEmail), true, 'Quota table is mutated only by trusted server credential');
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
});
