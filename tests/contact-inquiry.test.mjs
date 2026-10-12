import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTACT_FIELD_LIMITS,
  RATE_LIMIT_CONFIG,
  SharedRateLimiter,
  checkContactRateLimit,
  checkContactRateLimitMulti,
  pruneExpiredEntries,
  getRateLimitStoreSize,
  resetRateLimitStore,
} from '../src/app/contact/rateLimiter.ts';

describe('Contact Inquiry Server-Side Rate Limiting & Bounds Tests', () => {
  beforeEach(() => {
    resetRateLimitStore();
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
    assert.equal(getRateLimitStoreSize(), 2);

    // After window expires for both keys
    const tExpired = t0 + RATE_LIMIT_CONFIG.WINDOW_MS + 1000;
    pruneExpiredEntries(tExpired);
    assert.equal(getRateLimitStoreSize(), 0, 'Expired keys must be deleted from store');

    // Also verify individual key access auto-evicts expired record
    await checkContactRateLimit('ip:3.3.3.3', t0);
    assert.equal(getRateLimitStoreSize(), 1);
    await checkContactRateLimit('ip:3.3.3.3', tExpired);
    assert.equal(getRateLimitStoreSize(), 1);
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

  test('shares rate limit state across multiple workers for both IP and email keys', async () => {
    const sharedStore = new Map();
    const workerA = new SharedRateLimiter(RATE_LIMIT_CONFIG, sharedStore);
    const workerB = new SharedRateLimiter(RATE_LIMIT_CONFIG, sharedStore);

    const now = 800000;
    const clientIp = '203.0.113.55';

    // 1. Worker A receives request from clientIp with emailA
    const resA = await workerA.consumeKeys([`ip:${clientIp}`, 'email:alice@example.com'], now);
    assert.equal(resA.allowed, true);

    // 2. Worker B immediately receives request from same clientIp with different emailB
    // Must be rejected by shared IP burst cooldown across workers
    const resB = await workerB.consumeKeys([`ip:${clientIp}`, 'email:bob@example.com'], now + 1000);
    assert.equal(resB.allowed, false, 'Worker B must enforce IP cooldown from Worker A');
    assert.match(resB.error, /wait a moment/i);

    // 3. Worker B receives request with alice@example.com from different clientIp
    // Must be rejected by shared email burst cooldown across workers
    const resC = await workerB.consumeKeys(['ip:198.51.100.99', 'email:alice@example.com'], now + 1000);
    assert.equal(resC.allowed, false, 'Worker B must enforce email cooldown from Worker A');
    assert.match(resC.error, /wait a moment/i);

    // 4. Cumulative window limit across workers
    let timeCursor = now;
    const targetEmail = 'email:shared-user@example.com';
    // Worker A consumes 2 slots
    timeCursor += 6000;
    await workerA.consumeKeys(['ip:10.0.0.1', targetEmail], timeCursor);
    timeCursor += 6000;
    await workerA.consumeKeys(['ip:10.0.0.2', targetEmail], timeCursor);

    // Worker B consumes 3 slots
    timeCursor += 6000;
    await workerB.consumeKeys(['ip:10.0.0.3', targetEmail], timeCursor);
    timeCursor += 6000;
    await workerB.consumeKeys(['ip:10.0.0.4', targetEmail], timeCursor);
    timeCursor += 6000;
    await workerB.consumeKeys(['ip:10.0.0.5', targetEmail], timeCursor);

    // 6th request across either worker must be rejected
    timeCursor += 6000;
    const rejectedWorkerA = await workerA.consumeKeys(['ip:10.0.0.6', targetEmail], timeCursor);
    const rejectedWorkerB = await workerB.consumeKeys(['ip:10.0.0.7', targetEmail], timeCursor);

    assert.equal(rejectedWorkerA.allowed, false);
    assert.equal(rejectedWorkerB.allowed, false);
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
