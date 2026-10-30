import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import {
  CHECKOUT_FIELD_LIMITS,
  ORDER_RATE_LIMIT_CONFIG,
  validateCustomerDetails,
  validateCheckoutItems,
  validateCouponCode,
  computeOrderFingerprint,
  hashOrderRateIdentifier,
  DatabaseRpcOrderRateLimitStore,
  CrossProcessOrderRateLimitStore,
  MisconfiguredOrderRateLimitStore,
  createProductionOrderRateLimitStore,
  isCanonicalItemMultisetEqual,
  isMailboxVerified,
  getConfirmedUserEmail,
  resolveClientIp,
  ipMatchesProxyEntry,
  parseIpValues,
  checkAndAcquireOrderSlot,
  finalizeOrderSlot,
  resetOrderRateLimiter,
  setProductionOrderStore,
  isOrderOwnedByRequester,
  toPlacedOrder,
  findOwnedExistingOrder,
  ORDER_SELECT_FIELDS,
  escapePostgrestFilterValue,
} from '../src/app/checkout/orderRateLimiter.ts';
import {
  PAYMENT_SESSION_CONFIG,
  createServerPaymentSession,
  verifyPaymentProviderServer,
  claimPaymentSession,
  releasePaymentClaim,
  confirmPaymentSession,
  consumePaymentSession,
  CrossProcessPaymentStore,
  DatabasePaymentStore,
  MisconfiguredPaymentStore,
  createProductionPaymentStore,
  isSinglePersistentHostConfigured,
  isSharedPaymentStoreConfigured,
  getPaymentStore,
  setPaymentStore,
  pruneExpiredPaymentSessions,
  pruneStaleTrackedIps,
  recordProcessedTransaction,
  checkAndAcquirePaymentSessionSlot,
  resetPaymentProviderState,
  getPaymentProviderMetrics,
} from '../src/utils/payment/provider.ts';

const mockCatalog = [
  {
    id: 'royal-banarasi-silk-saree',
    color: 'Crimson Vermilion',
    swatches: [
      { name: 'Crimson Vermilion', inStock: true },
      { name: 'Deep Crimson', inStock: true },
      { name: 'Emerald Green', inStock: true },
      { name: 'Royal Purple', inStock: false },
    ],
    blouseOptions: [
      { id: 'unstitched-blouse' },
      { id: 'custom-stitched-blouse' },
    ],
  },
  {
    id: 'kanjivaram-heritage-silk-saree',
    color: 'Golden Mustard',
    swatches: [
      { name: 'Golden Mustard', inStock: true },
      { name: 'Ruby Red', inStock: true },
    ],
    blouseOptions: [
      { id: 'unstitched-blouse' },
    ],
  },
];

const validCustomer = {
  firstName: 'Priya',
  lastName: 'Sundaram',
  email: 'priya.sundaram@example.com',
  phone: '+91 98765 43210',
  address: '42 Heritage Villa, Banjara Hills',
  city: 'Hyderabad',
  state: 'Telangana',
  pincode: '500034',
};

const validItems = [
  {
    productId: 'royal-banarasi-silk-saree',
    qty: 1,
    selectedColor: 'Crimson Vermilion',
  },
];

describe('Checkout Payload Bounds & Validation [P2]', () => {
  test('rejects items list exceeding MAX_ITEMS limit', () => {
    const oversizedItems = Array.from({ length: CHECKOUT_FIELD_LIMITS.MAX_ITEMS + 1 }, () => ({
      productId: 'royal-banarasi-silk-saree',
      qty: 1,
    }));

    const result = validateCheckoutItems(oversizedItems, mockCatalog);
    assert.equal(result.valid, false);
    assert.match(result.error, /Shopping bag cannot exceed \d+ distinct items/);
  });

  test('rejects non-array items payload or empty shopping bag', () => {
    assert.equal(validateCheckoutItems(null).valid, false);
    assert.equal(validateCheckoutItems(undefined).valid, false);
    assert.equal(validateCheckoutItems('invalid').valid, false);
    assert.equal(validateCheckoutItems({}).valid, false);
    assert.match(validateCheckoutItems('invalid').error, /Shopping bag items must be provided as an array/);

    const emptyResult = validateCheckoutItems([]);
    assert.equal(emptyResult.valid, false);
    assert.match(emptyResult.error, /Your shopping bag is empty/);
  });

  test('rejects items with invalid, non-integer, or out-of-bounds quantities', () => {
    const invalidQuantities = [0, -1, 11, 2.5, NaN, Infinity, '1'];

    for (const qty of invalidQuantities) {
      const result = validateCheckoutItems(
        [{ productId: 'royal-banarasi-silk-saree', qty }],
        mockCatalog
      );
      assert.equal(result.valid, false);
      assert.match(result.error, /Quantity for item/);
    }

    // Valid quantities 1 through 10 succeed
    for (let qty = 1; qty <= CHECKOUT_FIELD_LIMITS.MAX_QTY_PER_ITEM; qty++) {
      const result = validateCheckoutItems(
        [{ productId: 'royal-banarasi-silk-saree', qty }],
        mockCatalog
      );
      assert.equal(result.valid, true);
      assert.equal(result.items[0].qty, qty);
    }
  });

  test('rejects unknown product IDs or invalid blouse options not in catalog', () => {
    const unknownProductResult = validateCheckoutItems(
      [{ productId: 'non-existent-saree-xyz', qty: 1 }],
      mockCatalog
    );
    assert.equal(unknownProductResult.valid, false);
    assert.match(unknownProductResult.error, /Invalid product reference/);

    const invalidBlouseResult = validateCheckoutItems(
      [{ productId: 'royal-banarasi-silk-saree', qty: 1, blouseOptionId: 'non-existent-blouse' }],
      mockCatalog
    );
    assert.equal(invalidBlouseResult.valid, false);
    assert.match(invalidBlouseResult.error, /Invalid blouse option/);
  });

  test('REGRESSION [P2]: rejects unknown color not in product swatches', () => {
    const unknownColorResult = validateCheckoutItems(
      [{ productId: 'royal-banarasi-silk-saree', qty: 1, selectedColor: 'Neon Bubblegum Pink' }],
      mockCatalog
    );
    assert.equal(unknownColorResult.valid, false);
    assert.match(unknownColorResult.error, /Invalid color "Neon Bubblegum Pink" for saree royal-banarasi-silk-saree/);
    assert.match(unknownColorResult.error, /Available colors:/);
  });

  test('REGRESSION [P2]: rejects out-of-stock color swatch', () => {
    const outOfStockResult = validateCheckoutItems(
      [{ productId: 'royal-banarasi-silk-saree', qty: 1, selectedColor: 'Royal Purple' }],
      mockCatalog
    );
    assert.equal(outOfStockResult.valid, false);
    assert.match(outOfStockResult.error, /Color "Royal Purple" is currently out of stock/);
  });

  test('REGRESSION [P2]: accepts valid in-stock color swatch and canonicalizes casing', () => {
    const validResult = validateCheckoutItems(
      [{ productId: 'royal-banarasi-silk-saree', qty: 1, selectedColor: '  emerald green  ' }],
      mockCatalog
    );
    assert.equal(validResult.valid, true);
    assert.equal(validResult.items[0].selectedColor, 'Emerald Green');
  });

  test('REGRESSION [P2]: assigns canonical in-stock default swatch when selectedColor is omitted', () => {
    const defaultResult = validateCheckoutItems(
      [{ productId: 'royal-banarasi-silk-saree', qty: 1 }],
      mockCatalog
    );
    assert.equal(defaultResult.valid, true);
    assert.equal(defaultResult.items[0].selectedColor, 'Crimson Vermilion');
  });

  test('rejects oversized product IDs, color options, and blouse options', () => {
    const oversizedProductId = validateCheckoutItems([
      { productId: 'A'.repeat(CHECKOUT_FIELD_LIMITS.PRODUCT_ID_MAX + 1), qty: 1 },
    ]);
    assert.equal(oversizedProductId.valid, false);
    assert.match(oversizedProductId.error, /Invalid product ID/);

    const oversizedColor = validateCheckoutItems([
      {
        productId: 'royal-banarasi-silk-saree',
        qty: 1,
        selectedColor: 'C'.repeat(CHECKOUT_FIELD_LIMITS.COLOR_MAX + 1),
      },
    ]);
    assert.equal(oversizedColor.valid, false);
    assert.match(oversizedColor.error, /Invalid color selection/);

    const oversizedBlouseId = validateCheckoutItems([
      {
        productId: 'royal-banarasi-silk-saree',
        qty: 1,
        blouseOptionId: 'B'.repeat(CHECKOUT_FIELD_LIMITS.BLOUSE_OPTION_ID_MAX + 1),
      },
    ]);
    assert.equal(oversizedBlouseId.valid, false);
    assert.match(oversizedBlouseId.error, /Invalid blouse option ID/);
  });

  test('enforces server-side length limits on all customer fields', () => {
    // 1. firstName validation (missing, whitespace, or exceeding max)
    const emptyFirst = validateCustomerDetails({ ...validCustomer, firstName: '   ' });
    assert.equal(emptyFirst.valid, false);
    assert.match(emptyFirst.error, /First name is required/);

    const oversizedFirst = validateCustomerDetails({
      ...validCustomer,
      firstName: 'A'.repeat(CHECKOUT_FIELD_LIMITS.FIRST_NAME_MAX + 1),
    });
    assert.equal(oversizedFirst.valid, false);
    assert.match(oversizedFirst.error, /First name is required/);

    // 2. lastName validation (exceeding max)
    const oversizedLast = validateCustomerDetails({
      ...validCustomer,
      lastName: 'B'.repeat(CHECKOUT_FIELD_LIMITS.LAST_NAME_MAX + 1),
    });
    assert.equal(oversizedLast.valid, false);
    assert.match(oversizedLast.error, /Last name cannot exceed/);

    // 3. email validation (format, min, and max)
    const malformedEmail = validateCustomerDetails({ ...validCustomer, email: 'not-an-email' });
    assert.equal(malformedEmail.valid, false);
    assert.match(malformedEmail.error, /valid customer email address is required/);

    const oversizedEmail = validateCustomerDetails({
      ...validCustomer,
      email: 'user@' + 'a'.repeat(260) + '.com',
    });
    assert.equal(oversizedEmail.valid, false);
    assert.match(oversizedEmail.error, /valid customer email address is required/);

    // 4. phone validation (too short or too long)
    const shortPhone = validateCustomerDetails({ ...validCustomer, phone: '123' });
    assert.equal(shortPhone.valid, false);
    assert.match(shortPhone.error, /Phone number must be between/);

    const longPhone = validateCustomerDetails({ ...validCustomer, phone: '9'.repeat(30) });
    assert.equal(longPhone.valid, false);
    assert.match(longPhone.error, /Phone number must be between/);

    // 5. address validation (too short or too long)
    const shortAddr = validateCustomerDetails({ ...validCustomer, address: 'ABC' });
    assert.equal(shortAddr.valid, false);
    assert.match(shortAddr.error, /Delivery address must be between/);

    const longAddr = validateCustomerDetails({
      ...validCustomer,
      address: 'X'.repeat(CHECKOUT_FIELD_LIMITS.ADDRESS_MAX + 1),
    });
    assert.equal(longAddr.valid, false);
    assert.match(longAddr.error, /Delivery address must be between/);

    // 6. city validation (too short or too long)
    const shortCity = validateCustomerDetails({ ...validCustomer, city: 'A' });
    assert.equal(shortCity.valid, false);
    assert.match(shortCity.error, /City must be between/);

    const longCity = validateCustomerDetails({
      ...validCustomer,
      city: 'C'.repeat(CHECKOUT_FIELD_LIMITS.CITY_MAX + 1),
    });
    assert.equal(longCity.valid, false);
    assert.match(longCity.error, /City must be between/);

    // 7. state validation
    const longState = validateCustomerDetails({
      ...validCustomer,
      state: 'S'.repeat(CHECKOUT_FIELD_LIMITS.STATE_MAX + 1),
    });
    assert.equal(longState.valid, false);
    assert.match(longState.error, /State cannot exceed/);

    // 8. pincode validation (too short or too long)
    const shortPin = validateCustomerDetails({ ...validCustomer, pincode: '12' });
    assert.equal(shortPin.valid, false);
    assert.match(shortPin.error, /Postal PIN code must be between/);

    const longPin = validateCustomerDetails({ ...validCustomer, pincode: '5'.repeat(15) });
    assert.equal(longPin.valid, false);
    assert.match(longPin.error, /Postal PIN code must be between/);

    // Valid customer passes and normalizes values
    const validResult = validateCustomerDetails(validCustomer);
    assert.equal(validResult.valid, true);
    assert.equal(validResult.customer.firstName, 'Priya');
    assert.equal(validResult.customer.email, 'priya.sundaram@example.com');
  });

  test('validates and bounds coupon code strings', () => {
    // Empty/undefined coupon is allowed (optional field)
    assert.equal(validateCouponCode(undefined).valid, true);
    assert.equal(validateCouponCode('').valid, true);

    // Non-string coupon is rejected
    assert.equal(validateCouponCode(12345).valid, false);

    // Oversized coupon code is rejected
    const oversizedResult = validateCouponCode('A'.repeat(CHECKOUT_FIELD_LIMITS.COUPON_MAX + 1));
    assert.equal(oversizedResult.valid, false);
    assert.match(oversizedResult.error, /Coupon code cannot exceed/);

    // Special characters / injection payloads are rejected
    const invalidCharResult = validateCouponCode('<script>alert(1)</script>');
    assert.equal(invalidCharResult.valid, false);
    assert.match(invalidCharResult.error, /Invalid coupon code format/);

    // Valid coupons are normalized to uppercase
    const validCouponResult = validateCouponCode('palluvo10');
    assert.equal(validCouponResult.valid, true);
    assert.equal(validCouponResult.couponCode, 'PALLUVO10');
  });
});

describe('Checkout Server-Side Distributed Throttling & Rate Limiting [P1]', () => {
  beforeEach(async () => {
    await resetOrderRateLimiter();
  });

  test('enforces minimum cooldown interval between consecutive orders from the same IP', async () => {
    const baseNow = Date.now();
    const testIp = '198.51.100.44';
    const testEmail = 'shopper1@example.com';

    // 1. First order succeeds
    const firstRes = await checkAndAcquireOrderSlot({
      ip: testIp,
      email: testEmail,
      now: baseNow,
    });
    assert.equal(firstRes.allowed, true);
    assert.equal(firstRes.slotAcquired, true);

    // 2. Immediate second order within 5s cooldown fails
    const secondRes = await checkAndAcquireOrderSlot({
      ip: testIp,
      email: 'another.email@example.com',
      now: baseNow + 1000, // 1s later
    });
    assert.equal(secondRes.allowed, false);
    assert.equal(secondRes.slotAcquired, false);
    assert.match(secondRes.error, /Please wait a few seconds before placing another order/);

    // 3. Order after cooldown (> 5s) passes
    const thirdRes = await checkAndAcquireOrderSlot({
      ip: testIp,
      email: 'another.email@example.com',
      now: baseNow + ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100,
    });
    assert.equal(thirdRes.allowed, true);
    assert.equal(thirdRes.slotAcquired, true);
  });

  test('enforces maximum orders per 10-minute sliding window per IP', async () => {
    const baseNow = Date.now();
    const testIp = '198.51.100.55';

    for (let i = 0; i < ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_IP; i++) {
      const res = await checkAndAcquireOrderSlot({
        ip: testIp,
        email: `distinct.user.${i}@example.com`,
        now: baseNow + i * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
      });
      assert.equal(res.allowed, true, `Order ${i + 1} should be allowed`);
    }

    // Sixth order exceeds IP window limit
    const exceededRes = await checkAndAcquireOrderSlot({
      ip: testIp,
      email: 'exceeded.user@example.com',
      now: baseNow + ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_IP * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
    });
    assert.equal(exceededRes.allowed, false);
    assert.equal(exceededRes.slotAcquired, false);
    assert.match(exceededRes.error, /Too many orders have been placed from your connection/);
  });

  test('enforces maximum orders per 10-minute sliding window per verified Email', async () => {
    const baseNow = Date.now();
    const testEmail = 'shopper.family@example.com';

    for (let i = 0; i < ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_EMAIL; i++) {
      const res = await checkAndAcquireOrderSlot({
        ip: `198.51.100.${10 + i}`,
        email: testEmail,
        isEmailVerified: true,
        now: baseNow + i * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
      });
      assert.equal(res.allowed, true, `Email order ${i + 1} should be allowed`);
    }

    // Fourth order exceeds Email window limit
    const exceededRes = await checkAndAcquireOrderSlot({
      ip: '198.51.100.99',
      email: testEmail,
      isEmailVerified: true,
      now: baseNow + ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_EMAIL * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
    });
    assert.equal(exceededRes.allowed, false);
    assert.equal(exceededRes.slotAcquired, false);
    assert.match(exceededRes.error, /Maximum order placement attempts reached for this email/);
  });

  test('REGRESSION [P2]: unverified guest email cannot poison or exhaust another customer quota across separate IPs', async () => {
    const baseNow = Date.now();
    const victimEmail = 'victim.shopper@example.com';

    // 1. Attacker submits 5 guest checkout attempts using victim's email across different IPs
    for (let i = 0; i < 5; i++) {
      const attackerRes = await checkAndAcquireOrderSlot({
        ip: `198.51.100.${20 + i}`,
        email: victimEmail,
        isEmailVerified: false, // guest checkout: unverified email
        now: baseNow + i * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
      });
      assert.equal(attackerRes.allowed, true, `Attacker guest attempt ${i + 1} succeeded on separate IP`);
    }

    // 2. Legitimate victim places an order from their own IP
    // Because unverified guest email is not used as a shared quota principal, victim is NOT locked out!
    const victimRes = await checkAndAcquireOrderSlot({
      ip: '203.0.113.88',
      email: victimEmail,
      isEmailVerified: true,
      now: baseNow + 6 * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
    });
    assert.equal(victimRes.allowed, true, 'Legitimate customer must not be blocked by prior unverified guest orders');
    assert.equal(victimRes.slotAcquired, true);
  });

  test('enforces global distributed burst throttle against automated flood attacks', async () => {
    const baseNow = Date.now();

    for (let i = 0; i < ORDER_RATE_LIMIT_CONFIG.MAX_GLOBAL_ORDERS_PER_MINUTE; i++) {
      const res = await checkAndAcquireOrderSlot({
        ip: `192.0.2.${i}`,
        email: `flood.${i}@domain.com`,
        now: baseNow + i * 50,
      });
      assert.equal(res.allowed, true);
    }

    // 31st order in same minute is throttled globally
    const floodRes = await checkAndAcquireOrderSlot({
      ip: '192.0.2.250',
      email: 'flood.exceeded@domain.com',
      now: baseNow + 2000,
    });
    assert.equal(floodRes.allowed, false);
    assert.equal(floodRes.slotAcquired, false);
    assert.match(floodRes.error, /unusually high traffic/);
  });
});

describe('Checkout Genuinely Shared Store & Database RPC Tests [P1]', () => {
  test('CrossProcessOrderRateLimitStore shares state across independent store instances via disk persistence', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'palluvo-cross-process-'));
    try {
      const store1 = new CrossProcessOrderRateLimitStore(tmpDir);
      const store2 = new CrossProcessOrderRateLimitStore(tmpDir);

      const baseNow = Date.now();
      const testIp = '203.0.113.10';
      const testEmail = 'shopper@shared.com';

      // Instance 1 reserves slot
      const res1 = await store1.checkAndAcquire({ ip: testIp, email: testEmail, now: baseNow });
      assert.equal(res1.allowed, true);
      assert.equal(res1.slotAcquired, true);

      // Instance 2 (completely separate memory) immediately sees IP cooldown from shared disk state!
      const res2 = await store2.checkAndAcquire({ ip: testIp, email: 'other@shared.com', now: baseNow + 1000 });
      assert.equal(res2.allowed, false);
      assert.match(res2.error, /Please wait a few seconds/);

      // Clean up
      await store1.clear();
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  });

  test('DatabaseRpcOrderRateLimitStore executes acquire_order_slot RPC with correct parameters', async () => {
    let capturedRpc = '';
    let capturedArgs = null;

    const mockSupabase = {
      rpc: async (name, args) => {
        capturedRpc = name;
        capturedArgs = args;
        return {
          data: {
            allowed: true,
            isDuplicate: false,
            slotAcquired: true,
          },
          error: null,
        };
      },
    };

    const dbStore = new DatabaseRpcOrderRateLimitStore(async () => mockSupabase);
    const result = await dbStore.checkAndAcquire({
      ip: '198.51.100.99',
      email: 'customer@example.com',
      fingerprint: 'test-fingerprint-abc',
    });

    assert.equal(result.allowed, true);
    assert.equal(result.slotAcquired, true);
    assert.equal(capturedRpc, 'acquire_order_slot');
    assert.equal(capturedArgs.p_fingerprint, 'test-fingerprint-abc');
    assert.equal(capturedArgs.p_max_ip, ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_IP);
    assert.equal(capturedArgs.p_max_email, ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_EMAIL);
    assert.equal(capturedArgs.p_cooldown_ms, ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS);
  });

  test('DatabaseRpcOrderRateLimitStore fails closed on RPC error', async () => {
    const errorSupabase = {
      rpc: async () => ({
        data: null,
        error: { message: 'relation "order_rate_limits" does not exist' },
      }),
    };

    const dbStore = new DatabaseRpcOrderRateLimitStore(async () => errorSupabase);
    const result = await dbStore.checkAndAcquire({
      ip: '198.51.100.99',
      email: 'customer@example.com',
    });

    assert.equal(result.allowed, false);
    assert.match(result.error, /Unable to verify order rate limits/);
  });

  test('DatabaseRpcOrderRateLimitStore fails closed when client is unconfigured', async () => {
    const dbStore = new DatabaseRpcOrderRateLimitStore(async () => null);
    const result = await dbStore.checkAndAcquire({
      ip: '198.51.100.99',
      email: 'customer@example.com',
    });

    assert.equal(result.allowed, false);
    assert.match(result.error, /Order processing service is currently unavailable/);
  });
});

describe('Checkout Reservation Ownership & Idempotency Protection [P1 & P2]', () => {
  beforeEach(async () => {
    setProductionOrderStore(null);
    await resetOrderRateLimiter();
  });

  test('computes deterministic order fingerprint across identical parameters', () => {
    const total = 14999;
    const fp1 = computeOrderFingerprint(validCustomer, validItems, total, 'cod');
    const fp2 = computeOrderFingerprint(
      { ...validCustomer, email: '  PRIYA.SUNDARAM@EXAMPLE.COM  ' },
      validItems,
      total,
      'cod'
    );

    assert.equal(fp1, fp2, 'Normalized email should produce identical deterministic fingerprint');

    const fpDifferentItem = computeOrderFingerprint(
      validCustomer,
      [{ ...validItems[0], qty: 2 }],
      total,
      'cod'
    );
    assert.notEqual(fp1, fpDifferentItem, 'Different item quantity must produce different fingerprint');
  });

  test('blocks concurrent in-flight duplicate requests with slotAcquired: false', async () => {
    const baseNow = Date.now();
    const fp = computeOrderFingerprint(validCustomer, validItems, 14999, 'cod');

    const first = await checkAndAcquireOrderSlot({
      ip: '198.51.100.1',
      email: validCustomer.email,
      fingerprint: fp,
      now: baseNow,
    });
    assert.equal(first.allowed, true);
    assert.equal(first.slotAcquired, true);

    // Second concurrent call with same fingerprint while in-flight
    const concurrent = await checkAndAcquireOrderSlot({
      ip: '198.51.100.1',
      email: validCustomer.email,
      fingerprint: fp,
      now: baseNow + 100,
    });
    assert.equal(concurrent.allowed, false);
    assert.equal(concurrent.isDuplicate, true);
    assert.equal(concurrent.slotAcquired, false);
    assert.match(concurrent.error, /currently being processed/);
  });

  test('[P2 REGRESSION]: rejected concurrent call must not delete the original request in-flight marker', async () => {
    const baseNow = Date.now();
    const fp = computeOrderFingerprint(validCustomer, validItems, 14999, 'cod');

    // 1. Initial request acquires slot
    const first = await checkAndAcquireOrderSlot({
      ip: '198.51.100.1',
      email: validCustomer.email,
      fingerprint: fp,
      now: baseNow,
    });
    assert.equal(first.allowed, true);
    assert.equal(first.slotAcquired, true);

    // 2. Second request is rejected
    const second = await checkAndAcquireOrderSlot({
      ip: '198.51.100.1',
      email: validCustomer.email,
      fingerprint: fp,
      now: baseNow + 100,
    });
    assert.equal(second.allowed, false);
    assert.equal(second.slotAcquired, false);

    // 3. Simulating the second caller's finally block:
    // With reservation ownership tracking, second caller DOES NOT call finalizeOrderSlot because slotAcquired is false.
    // Even if finalizeOrderSlot was erroneously called without reservation, in-flight marker remains intact.
    // Verify that subsequent call is STILL recognized as in-flight duplicate!
    const third = await checkAndAcquireOrderSlot({
      ip: '198.51.100.1',
      email: validCustomer.email,
      fingerprint: fp,
      now: baseNow + 200,
    });
    assert.equal(third.allowed, false);
    assert.equal(third.isDuplicate, true);
    assert.match(third.error, /currently being processed/);
  });

  test('returns existing order on repeated identical request within deduplication window', async () => {
    const baseNow = Date.now();
    const fp = computeOrderFingerprint(validCustomer, validItems, 14999, 'cod');

    // 1. Acquire slot
    const slot = await checkAndAcquireOrderSlot({
      ip: '198.51.100.1',
      email: validCustomer.email,
      fingerprint: fp,
      now: baseNow,
    });
    assert.equal(slot.allowed, true);
    assert.equal(slot.slotAcquired, true);

    // 2. Finalize with completed order
    const mockOrder = {
      id: 'PLV-999999',
      orderNumber: 'PLV-999999',
      date: '24 Oct 2026',
      status: 'Confirmed',
      items: [],
      subtotal: 14999,
      discountAmount: 0,
      shippingFee: 0,
      grandTotal: 14999,
      paymentMethod: 'cod',
      customer: validCustomer,
    };
    await finalizeOrderSlot(fp, mockOrder, baseNow);

    // 3. Repeated call within deduplication window returns cached order with slotAcquired: false
    const repeatCall = await checkAndAcquireOrderSlot({
      ip: '198.51.100.1',
      email: validCustomer.email,
      fingerprint: fp,
      now: baseNow + 5000,
    });

    assert.equal(repeatCall.allowed, true);
    assert.equal(repeatCall.isDuplicate, true);
    assert.equal(repeatCall.slotAcquired, false);
    assert.deepEqual(repeatCall.existingOrder, mockOrder);
  });

  test('[P2 REGRESSION]: cached duplicate replay must not evict the completed order cache', async () => {
    const baseNow = Date.now();
    const fp = computeOrderFingerprint(validCustomer, validItems, 14999, 'cod');

    // 1. First order completes and caches
    await checkAndAcquireOrderSlot({
      ip: '198.51.100.1',
      email: validCustomer.email,
      fingerprint: fp,
      now: baseNow,
    });
    const mockOrder = {
      id: 'PLV-777777',
      orderNumber: 'PLV-777777',
      date: '24 Oct 2026',
      status: 'Confirmed',
      items: [],
      subtotal: 14999,
      discountAmount: 0,
      shippingFee: 0,
      grandTotal: 14999,
      paymentMethod: 'cod',
      customer: validCustomer,
    };
    await finalizeOrderSlot(fp, mockOrder, baseNow);

    // 2. Replay request arrives
    const replay = await checkAndAcquireOrderSlot({
      ip: '198.51.100.1',
      email: validCustomer.email,
      fingerprint: fp,
      now: baseNow + 2000,
    });
    assert.equal(replay.allowed, true);
    assert.equal(replay.isDuplicate, true);
    assert.equal(replay.slotAcquired, false);

    // 3. Even if finalizeOrderSlot(fp, undefined) is called, finalize guard NEVER evicts a completed order!
    await finalizeOrderSlot(fp, undefined, baseNow + 2100);

    // 4. Third replay still successfully retrieves the cached order
    const thirdReplay = await checkAndAcquireOrderSlot({
      ip: '198.51.100.1',
      email: validCustomer.email,
      fingerprint: fp,
      now: baseNow + 3000,
    });
    assert.equal(thirdReplay.allowed, true);
    assert.equal(thirdReplay.isDuplicate, true);
    assert.deepEqual(thirdReplay.existingOrder, mockOrder);
  });
});

describe('Canonical Item Variant Multiset & Variant Deduplication Tests [P2]', () => {
  test('isCanonicalItemMultisetEqual matches identical single-item orders', () => {
    const itemsA = [{ productId: 'royal-banarasi', qty: 1, selectedColor: 'Crimson Red', blouseOptionId: 'unstitched' }];
    const itemsB = [{ productId: 'royal-banarasi', qty: 1, selectedColor: 'crimson red', blouseOptionId: 'unstitched' }];
    assert.equal(isCanonicalItemMultisetEqual(itemsA, itemsB), true);
  });

  test('isCanonicalItemMultisetEqual matches multi-item orders regardless of array ordering', () => {
    const itemsA = [
      { productId: 'royal-banarasi', qty: 1, selectedColor: 'Red', blouseOptionId: 'unstitched' },
      { productId: 'kanjivaram-silk', qty: 2, selectedColor: 'Gold', blouseOptionId: 'stitched' },
    ];
    const itemsB = [
      { productId: 'kanjivaram-silk', qty: 2, selectedColor: 'gold', blouseOptionId: 'stitched' },
      { productId: 'royal-banarasi', qty: 1, selectedColor: 'red', blouseOptionId: 'unstitched' },
    ];
    assert.equal(isCanonicalItemMultisetEqual(itemsA, itemsB), true);
  });

  test('isCanonicalItemMultisetEqual rejects orders with different saree colors', () => {
    const itemsA = [{ productId: 'royal-banarasi', qty: 1, selectedColor: 'Crimson Red', blouseOptionId: 'unstitched' }];
    const itemsB = [{ productId: 'royal-banarasi', qty: 1, selectedColor: 'Emerald Green', blouseOptionId: 'unstitched' }];
    assert.equal(isCanonicalItemMultisetEqual(itemsA, itemsB), false);
  });

  test('isCanonicalItemMultisetEqual rejects orders with different tailored blouse options', () => {
    const itemsA = [{ productId: 'royal-banarasi', qty: 1, selectedColor: 'Crimson Red', blouseOptionId: 'unstitched' }];
    const itemsB = [{ productId: 'royal-banarasi', qty: 1, selectedColor: 'Crimson Red', blouseOptionId: 'custom-tailored' }];
    assert.equal(isCanonicalItemMultisetEqual(itemsA, itemsB), false);
  });

  test('isCanonicalItemMultisetEqual consumes matches strictly to prevent false duplicate matching', () => {
    const itemsA = [
      { productId: 'royal-banarasi', qty: 1, selectedColor: 'Red', blouseOptionId: 'unstitched' },
      { productId: 'royal-banarasi', qty: 1, selectedColor: 'Red', blouseOptionId: 'unstitched' },
    ];
    const itemsB = [
      { productId: 'royal-banarasi', qty: 1, selectedColor: 'Red', blouseOptionId: 'unstitched' },
      { productId: 'royal-banarasi', qty: 1, selectedColor: 'Blue', blouseOptionId: 'unstitched' },
    ];
    assert.equal(isCanonicalItemMultisetEqual(itemsA, itemsB), false);
  });

  test('isCanonicalItemMultisetEqual safely handles non-array and mismatched-length inputs', () => {
    assert.equal(isCanonicalItemMultisetEqual(null, []), false);
    assert.equal(isCanonicalItemMultisetEqual([], undefined), false);
    assert.equal(isCanonicalItemMultisetEqual([{ productId: 'a', qty: 1 }], []), false);
  });

  test('computeOrderFingerprint differentiates orders with same product and price but different color or blouse option', () => {
    const customer = {
      firstName: 'Ananya',
      email: 'ananya@example.com',
      phone: '9876543210',
      address: '12 Temple Street',
      city: 'Chennai',
      pincode: '600001',
    };

    const orderUnstitched = [
      { productId: 'royal-banarasi', qty: 1, selectedColor: 'Ruby Red', blouseOptionId: 'unstitched' },
    ];
    const orderCustomTailored = [
      { productId: 'royal-banarasi', qty: 1, selectedColor: 'Ruby Red', blouseOptionId: 'custom-tailored' },
    ];
    const orderGreen = [
      { productId: 'royal-banarasi', qty: 1, selectedColor: 'Emerald Green', blouseOptionId: 'unstitched' },
    ];

    const fp1 = computeOrderFingerprint(customer, orderUnstitched, 9999, 'cod');
    const fp2 = computeOrderFingerprint(customer, orderCustomTailored, 9999, 'cod');
    const fp3 = computeOrderFingerprint(customer, orderGreen, 9999, 'cod');

    assert.notEqual(fp1, fp2, 'Different blouse option must have distinct fingerprint');
    assert.notEqual(fp1, fp3, 'Different color must have distinct fingerprint');
    assert.notEqual(fp2, fp3, 'Different variant combinations must have distinct fingerprints');
  });

  test('computeOrderFingerprint produces identical hash regardless of item input order', () => {
    const customer = {
      firstName: 'Ananya',
      email: 'ananya@example.com',
      phone: '9876543210',
      address: '12 Temple Street',
      city: 'Chennai',
      pincode: '600001',
    };

    const items1 = [
      { productId: 'royal-banarasi', qty: 1, selectedColor: 'Red', blouseOptionId: 'unstitched' },
      { productId: 'kanjivaram', qty: 1, selectedColor: 'Gold', blouseOptionId: 'stitched' },
    ];
    const items2 = [
      { productId: 'kanjivaram', qty: 1, selectedColor: 'Gold', blouseOptionId: 'stitched' },
      { productId: 'royal-banarasi', qty: 1, selectedColor: 'Red', blouseOptionId: 'unstitched' },
    ];

    const fp1 = computeOrderFingerprint(customer, items1, 15000, 'cod');
    const fp2 = computeOrderFingerprint(customer, items2, 15000, 'cod');
    assert.equal(fp1, fp2, 'Permuted item lists must produce identical canonical fingerprint');
  });

  test('REGRESSION [P2]: computeOrderFingerprint differentiates changes in recipient name (firstName, lastName)', () => {
    const baseCustomer = {
      firstName: 'Priya',
      lastName: 'Sundaram',
      email: 'priya@example.com',
      phone: '9876543210',
      address: '12 Temple Street',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
    };
    const correctedRecipient = { ...baseCustomer, firstName: 'Ananya' };
    const correctedLastName = { ...baseCustomer, lastName: 'Sharma' };
    const items = [{ productId: 'royal-banarasi', qty: 1 }];

    const fpBase = computeOrderFingerprint(baseCustomer, items, 9999, 'cod');
    const fpCorrectedFirst = computeOrderFingerprint(correctedRecipient, items, 9999, 'cod');
    const fpCorrectedLast = computeOrderFingerprint(correctedLastName, items, 9999, 'cod');

    assert.notEqual(fpBase, fpCorrectedFirst, 'Changed firstName must produce distinct fingerprint');
    assert.notEqual(fpBase, fpCorrectedLast, 'Changed lastName must produce distinct fingerprint');
  });

  test('REGRESSION [P2]: computeOrderFingerprint differentiates changes in locality (city, state)', () => {
    const baseCustomer = {
      firstName: 'Priya',
      lastName: 'Sundaram',
      email: 'priya@example.com',
      phone: '9876543210',
      address: '12 Temple Street',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
    };
    const correctedCity = { ...baseCustomer, city: 'Coimbatore' };
    const correctedState = { ...baseCustomer, state: 'Karnataka' };
    const items = [{ productId: 'royal-banarasi', qty: 1 }];

    const fpBase = computeOrderFingerprint(baseCustomer, items, 9999, 'cod');
    const fpCorrectedCity = computeOrderFingerprint(correctedCity, items, 9999, 'cod');
    const fpCorrectedState = computeOrderFingerprint(correctedState, items, 9999, 'cod');

    assert.notEqual(fpBase, fpCorrectedCity, 'Changed city must produce distinct fingerprint');
    assert.notEqual(fpBase, fpCorrectedState, 'Changed state must produce distinct fingerprint');
  });

  test('REGRESSION [P2]: correcting recipient/locality allows placing order without idempotency collision with earlier cached order', async () => {
    const baseNow = Date.now();
    const customerInitial = {
      firstName: 'Priya',
      lastName: 'Sundaram',
      email: 'priya@example.com',
      phone: '9876543210',
      address: '12 Temple Street',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
    };
    const items = [{ productId: 'royal-banarasi', qty: 1 }];
    const fpInitial = computeOrderFingerprint(customerInitial, items, 9999, 'cod');

    await resetOrderRateLimiter();
    const testIp = '198.51.100.123';

    // 1. Initial order placed and finalized
    const slot1 = await checkAndAcquireOrderSlot({
      ip: testIp,
      email: customerInitial.email,
      isEmailVerified: true,
      fingerprint: fpInitial,
      now: baseNow,
    });
    assert.equal(slot1.allowed, true, `Initial slot acquisition failed: ${slot1.error}`);
    await finalizeOrderSlot(fpInitial, { id: 'PLV-001', customer: customerInitial }, baseNow);

    // 2. Customer realizes city was wrong and corrects to Madurai within 60-second window
    const customerCorrected = { ...customerInitial, city: 'Madurai' };
    const fpCorrected = computeOrderFingerprint(customerCorrected, items, 9999, 'cod');

    assert.notEqual(fpInitial, fpCorrected);

    const slot2 = await checkAndAcquireOrderSlot({
      ip: testIp,
      email: customerCorrected.email,
      isEmailVerified: true,
      fingerprint: fpCorrected,
      now: baseNow + (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
    });

    // Must be allowed as a new order, NOT returned as duplicate of initial order!
    assert.equal(slot2.allowed, true);
    assert.equal(slot2.isDuplicate, false);
    assert.equal(slot2.slotAcquired, true);
  });

  test('REGRESSION [P2]: unambiguous fingerprint encoding prevents delimiter collision across customer fields', () => {
    const customer1 = {
      firstName: 'A|B',
      lastName: 'C',
      email: 'shopper@example.com',
      phone: '9876543210',
      address: '12 Temple Street',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
    };
    const customer2 = {
      firstName: 'A',
      lastName: 'B|C',
      email: 'shopper@example.com',
      phone: '9876543210',
      address: '12 Temple Street',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
    };
    const items = [{ productId: 'royal-banarasi', qty: 1, selectedColor: 'Red', blouseOptionId: 'unstitched' }];

    const fp1 = computeOrderFingerprint(customer1, items, 9999, 'cod');
    const fp2 = computeOrderFingerprint(customer2, items, 9999, 'cod');

    assert.notEqual(fp1, fp2, 'Unambiguous structured serialization must prevent delimiter-injection collisions');
  });
});

describe('Production Fail-Closed Store Security Tests [P1]', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  test('MisconfiguredOrderRateLimitStore fails closed and denies slot acquisition', async () => {
    const misconfigured = new MisconfiguredOrderRateLimitStore('Missing database credentials');
    const res = await misconfigured.checkAndAcquire();
    assert.equal(res.allowed, false);
    assert.equal(res.slotAcquired, false);
    assert.match(res.error, /temporarily unavailable due to a server configuration issue/);
  });

  test('createProductionOrderRateLimitStore fails closed in production when service role key is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://palluvo-test.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;

    const store = createProductionOrderRateLimitStore();
    assert.equal(store instanceof MisconfiguredOrderRateLimitStore, true);
    assert.equal(store instanceof CrossProcessOrderRateLimitStore, false);
  });

  test('createProductionOrderRateLimitStore fails closed in production when Supabase URL is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;

    const store = createProductionOrderRateLimitStore();
    assert.equal(store instanceof MisconfiguredOrderRateLimitStore, true);
    assert.equal(store instanceof CrossProcessOrderRateLimitStore, false);
  });

  test('createProductionOrderRateLimitStore allows CrossProcessOrderRateLimitStore only in non-production offline dev', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;

    const store = createProductionOrderRateLimitStore();
    assert.equal(store instanceof CrossProcessOrderRateLimitStore, true);
  });

  test('createProductionOrderRateLimitStore fails closed in dev if Supabase is configured but service role key is missing', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://palluvo-test.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;

    const store = createProductionOrderRateLimitStore();
    assert.equal(store instanceof MisconfiguredOrderRateLimitStore, true);
  });
});

describe('Production Fail-Closed Payment Store Security Tests [P2]', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    setPaymentStore(null);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setPaymentStore(null);
  });

  test('MisconfiguredPaymentStore fails closed and denies session save and payment consumption', async () => {
    const misconfigured = new MisconfiguredPaymentStore('Missing database credentials in production');
    const saveRes = await misconfigured.saveSession({
      sessionId: 'sess_test',
      amount: 1999,
      currency: 'INR',
      sessionToken: 'token',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
      consumed: false,
    });
    assert.equal(saveRes, false);

    const getRes = await misconfigured.getSession('sess_test');
    assert.equal(getRes, null);

    const isTx = await misconfigured.isTransactionProcessed('pay_test');
    assert.equal(isTx, false);

    const getTx = await misconfigured.getTransaction('pay_test');
    assert.equal(getTx, null);

    const consumeRes = await misconfigured.consumePayment({
      sessionId: 'sess_test',
      paymentId: 'pay_test',
      orderNumber: 'PLV-001',
      amount: 1999,
    });
    assert.equal(consumeRes.success, false);
    assert.match(consumeRes.error, /Missing database credentials in production/);

    const slotRes = await misconfigured.checkAndAcquireIpSlot('198.51.100.1');
    assert.equal(slotRes.allowed, false);
    assert.match(slotRes.error, /Missing database credentials in production/);
  });

  test('createProductionPaymentStore fails closed in production when service role key is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://palluvo-test.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SINGLE_PERSISTENT_HOST;
    delete process.env.PAYMENT_STORE_SINGLE_HOST;
    delete process.env.ALLOW_FILE_PAYMENT_STORE;

    const store = createProductionPaymentStore();
    assert.equal(store instanceof MisconfiguredPaymentStore, true);
    assert.equal(store instanceof CrossProcessPaymentStore, false);
    assert.equal(store instanceof DatabasePaymentStore, false);
  });

  test('createProductionPaymentStore fails closed in production when Supabase URL is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SINGLE_PERSISTENT_HOST;
    delete process.env.PAYMENT_STORE_SINGLE_HOST;
    delete process.env.ALLOW_FILE_PAYMENT_STORE;

    const store = createProductionPaymentStore();
    assert.equal(store instanceof MisconfiguredPaymentStore, true);
    assert.equal(store instanceof CrossProcessPaymentStore, false);
    assert.equal(store instanceof DatabasePaymentStore, false);
  });

  test('createProductionPaymentStore allows CrossProcessPaymentStore in production when SINGLE_PERSISTENT_HOST is configured', () => {
    process.env.NODE_ENV = 'production';
    process.env.SINGLE_PERSISTENT_HOST = 'true';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;

    const store = createProductionPaymentStore();
    assert.equal(store instanceof CrossProcessPaymentStore, true);
    assert.equal(store instanceof MisconfiguredPaymentStore, false);
  });

  test('createProductionPaymentStore allows CrossProcessPaymentStore in production when PAYMENT_STORE_SINGLE_HOST is configured', () => {
    process.env.NODE_ENV = 'production';
    process.env.PAYMENT_STORE_SINGLE_HOST = 'true';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;

    const store = createProductionPaymentStore();
    assert.equal(store instanceof CrossProcessPaymentStore, true);
  });

  test('createProductionPaymentStore allows CrossProcessPaymentStore in non-production offline dev', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SINGLE_PERSISTENT_HOST;
    delete process.env.PAYMENT_STORE_SINGLE_HOST;

    const store = createProductionPaymentStore();
    assert.equal(store instanceof CrossProcessPaymentStore, true);
  });

  test('createProductionPaymentStore fails closed in dev if Supabase is configured but service role key is missing', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://palluvo-test.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;

    const store = createProductionPaymentStore();
    assert.equal(store instanceof MisconfiguredPaymentStore, true);
  });

  test('createProductionPaymentStore creates DatabasePaymentStore when both Supabase URL and service role key are configured', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://palluvo-test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_secret_key_123';

    const store = createProductionPaymentStore();
    assert.equal(store instanceof DatabasePaymentStore, true);
  });

  test('createServerPaymentSession fails closed and returns null when store is MisconfiguredPaymentStore', () => {
    setPaymentStore(new MisconfiguredPaymentStore('Missing service role key in production'));
    process.env.PAYMENT_GATEWAY_SECRET = 'secret_1234567890abcdef';

    const session = createServerPaymentSession(1999, 'INR', '198.51.100.1');
    assert.equal(session, null);
  });

  test('verifyPaymentProviderServer fails closed when store is MisconfiguredPaymentStore', async () => {
    setPaymentStore(new MisconfiguredPaymentStore('Missing service role key in production'));
    process.env.PAYMENT_GATEWAY_SECRET = 'secret_1234567890abcdef';

    const res = await verifyPaymentProviderServer({
      paymentId: 'pay_fail_closed_1',
      sessionId: 'sess_fail_closed_1',
      signature: 'deadbeef',
      amount: 1999,
      currency: 'INR',
    });
    assert.equal(res.verified, false);
    assert.match(res.error, /Payment verification unavailable/);
  });

  test('consumePaymentSession fails closed when store is MisconfiguredPaymentStore', async () => {
    setPaymentStore(new MisconfiguredPaymentStore('Missing service role key in production'));

    const res = await consumePaymentSession({
      sessionId: 'sess_fail_closed_2',
      paymentId: 'pay_fail_closed_2',
      orderNumber: 'PLV-999000',
      amount: 1999,
      currency: 'INR',
    });
    assert.equal(res.success, false);
    assert.match(res.error, /Payment store configuration error/);
  });

  test('isSharedPaymentStoreConfigured returns false when store is MisconfiguredPaymentStore', () => {
    setPaymentStore(new MisconfiguredPaymentStore('Production requires Supabase'));
    assert.equal(isSharedPaymentStoreConfigured(), false);

    setPaymentStore(new CrossProcessPaymentStore());
    assert.equal(isSharedPaymentStoreConfigured(), true);
  });
});

describe('Trusted Client IP Derivation & Anti-Spoofing Tests [P2]', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  test('prioritizes ingress-overwritten cf-connecting-ip over attacker-supplied x-forwarded-for when configured', () => {
    process.env.TRUSTED_INGRESS_HEADER = 'cf-connecting-ip';
    const headers = new Map([
      ['x-forwarded-for', '10.0.0.99, 10.0.0.100'],
      ['cf-connecting-ip', '203.0.113.15'],
    ]);

    const resolved = resolveClientIp(headers);
    assert.equal(resolved, '203.0.113.15', 'cf-connecting-ip must take precedence over spoofed x-forwarded-for');
  });

  test('prioritizes ingress-overwritten x-real-ip over attacker-supplied x-forwarded-for when configured', () => {
    process.env.TRUSTED_INGRESS_HEADER = 'x-real-ip';
    const headers = new Map([
      ['x-forwarded-for', '192.168.1.50'],
      ['x-real-ip', '198.51.100.22'],
    ]);

    const resolved = resolveClientIp(headers);
    assert.equal(resolved, '198.51.100.22', 'x-real-ip must take precedence over spoofed x-forwarded-for');
  });

  test('prioritizes ingress-overwritten x-vercel-forwarded-for under verified platform', () => {
    const headersVercel = new Map([
      ['x-forwarded-for', '10.1.2.3'],
      ['x-vercel-forwarded-for', '198.51.100.33'],
    ]);
    assert.equal(resolveClientIp(headersVercel, { platform: 'vercel' }), '198.51.100.33');
  });

  test('REGRESSION [P2]: does not treat Akamai True-Client-IP as verified from platform flag alone', () => {
    // Akamai Property Manager permits pass-through of client-supplied True-Client-IP headers.
    // Setting TRUSTED_PLATFORM=akamai or { platform: 'akamai' } must NOT trust the header without explicit ingress header configuration.
    const headersAkamai = new Map([
      ['x-forwarded-for', '10.1.2.3'],
      ['true-client-ip', '198.51.100.44'],
    ]);
    assert.equal(
      resolveClientIp(headersAkamai, { platform: 'akamai' }),
      null,
      'True-Client-IP must NOT be trusted implicitly from platform flag alone'
    );

    // Caller rotating true-client-ip without explicit TRUSTED_INGRESS_HEADER cannot evade rate limit
    process.env.TRUSTED_PLATFORM = 'akamai';
    assert.equal(
      resolveClientIp(headersAkamai),
      null,
      'Environment TRUSTED_PLATFORM=akamai must not trust caller-supplied true-client-ip'
    );

    // But when TRUSTED_INGRESS_HEADER="true-client-ip" IS explicitly configured (after operator verified origin overwrite):
    process.env.TRUSTED_INGRESS_HEADER = 'true-client-ip';
    assert.equal(
      resolveClientIp(headersAkamai),
      '198.51.100.44',
      'Explicitly configured TRUSTED_INGRESS_HEADER must be respected'
    );
  });

  test('respects explicitly configured TRUSTED_INGRESS_HEADER', () => {
    process.env.TRUSTED_INGRESS_HEADER = 'x-custom-edge-ip';
    const headers = new Map([
      ['x-forwarded-for', '10.0.0.1'],
      ['x-custom-edge-ip', '203.0.113.88'],
    ]);

    assert.equal(resolveClientIp(headers), '203.0.113.88');
  });

  test('parses proxy chain from right to left avoiding attacker-controlled leftmost x-forwarded-for when proxy count is configured', () => {
    // Attacker sent "1.2.3.4" (leftmost spoof). Trusted reverse proxy appended "203.0.113.60".
    const headers = new Map([
      ['x-forwarded-for', '1.2.3.4, 203.0.113.60'],
    ]);

    const resolved = resolveClientIp(headers, { trustedProxyCount: 1 });
    assert.equal(resolved, '203.0.113.60', 'Configured trusted proxy count 1 must select authentic connecting client IP');
  });

  test('correctly traverses configured trusted proxy list in x-forwarded-for', () => {
    // Chain: Spoofed IP (1.2.3.4), Client IP (203.0.113.70), Intermediate Proxy (10.0.0.2), Ingress Proxy (10.0.0.1)
    const headers = new Map([
      ['x-forwarded-for', '1.2.3.4, 203.0.113.70, 10.0.0.2, 10.0.0.1'],
    ]);

    const resolved = resolveClientIp(headers, {
      trustedProxies: ['10.0.0.1', '10.0.0.2'],
    });
    assert.equal(resolved, '203.0.113.70', 'Must skip all trusted proxies from right to find authentic client IP');
  });

  test('REGRESSION [P2]: matches IPv4 and IPv6 CIDR subnets in TRUSTED_PROXIES without mistaking proxy as client', () => {
    // 1. IPv4 CIDR matching: 10.0.0.0/8 and 172.16.0.0/12
    // Chain: Spoofed/client (203.0.113.195), Internal proxy 1 (10.42.0.8), Internal proxy 2 (172.24.1.5)
    const headers = new Map([
      ['x-forwarded-for', '203.0.113.195, 10.42.0.8, 172.24.1.5'],
    ]);

    const resolved = resolveClientIp(headers, {
      trustedProxies: ['10.0.0.0/8', '172.16.0.0/12'],
    });
    assert.equal(
      resolved,
      '203.0.113.195',
      'Must match and skip all proxies covered by configured CIDR subnets (10.0.0.0/8 and 172.16.0.0/12)'
    );

    // 2. IPv6 CIDR matching: 2001:db8:ffff::/48
    const headersV6 = new Map([
      ['x-forwarded-for', '2001:db8:85a3::1, 2001:db8:ffff::10'],
    ]);
    const resolvedV6 = resolveClientIp(headersV6, {
      trustedProxies: ['2001:db8:ffff::/48'],
    });
    assert.equal(
      resolvedV6,
      '2001:db8:85a3::1',
      'Must match and skip IPv6 proxies covered by configured IPv6 CIDR subnet'
    );

    // 3. Named alias "private" matches RFC 1918 subnets
    const headersPrivate = new Map([
      ['x-forwarded-for', '198.51.100.80, 192.168.1.1'],
    ]);
    const resolvedPrivate = resolveClientIp(headersPrivate, {
      trustedProxies: ['192.168.1.0/24'],
    });
    assert.equal(
      resolvedPrivate,
      '198.51.100.80',
      'Must match and skip proxy in configured proxy subnet 192.168.1.0/24'
    );
  });

  test('REGRESSION [P2]: normalizes IPv4-mapped IPv6 before matching private alias and proxy CIDRs', () => {
    // 1. Upstream proxy emits its private IPv4 peer in mapped IPv6 form (::ffff:10.0.1.5).
    // Chain: authentic client (203.0.113.80), upstream proxy (::ffff:10.0.1.5).
    // When proxy subnet 10.0.1.0/24 (or private alias) is configured, the mapped IPv6 proxy MUST match and be skipped,
    // resolving the authentic client IP rather than mistaking the proxy for the client and exhausting its shared quota.
    const headersMappedProxy = new Map([
      ['x-forwarded-for', '203.0.113.80, ::ffff:10.0.1.5'],
    ]);
    const resolvedMappedSubnet = resolveClientIp(headersMappedProxy, {
      trustedProxies: ['10.0.1.0/24'],
    });
    assert.equal(
      resolvedMappedSubnet,
      '203.0.113.80',
      'Must match and skip IPv4-mapped IPv6 proxy within configured proxy subnet'
    );

    const resolvedMappedPrivate = resolveClientIp(headersMappedProxy, {
      trustedProxies: ['private'],
    });
    assert.equal(
      resolvedMappedPrivate,
      '203.0.113.80',
      'Must normalize IPv4-mapped IPv6 before matching private alias'
    );

    // 2. Direct unit validations for IPv4-mapped IPv6 normalization across RFC 1918 blocks
    assert.equal(ipMatchesProxyEntry('::ffff:10.1.2.3', 'private'), true, 'Mapped 10.0.0.0/8 must match private');
    assert.equal(ipMatchesProxyEntry('::ffff:172.16.5.1', 'private'), true, 'Mapped 172.16.0.0/12 must match private');
    assert.equal(ipMatchesProxyEntry('::ffff:192.168.1.100', 'private'), true, 'Mapped 192.168.0.0/16 must match private');
    assert.equal(ipMatchesProxyEntry('::ffff:8.8.8.8', 'private'), false, 'Mapped public IP must not match private');
    assert.equal(ipMatchesProxyEntry('fc00::1', 'private'), true, 'Pure IPv6 ULA must match private');

    // 3. Exact IP match with IPv4-mapped IPv6 normalization
    assert.equal(ipMatchesProxyEntry('::ffff:10.0.1.5', '10.0.1.5'), true, 'Mapped IPv6 must match exact IPv4');
    assert.equal(ipMatchesProxyEntry('10.0.1.5', '::ffff:10.0.1.5'), true, 'Exact IPv4 must match mapped IPv6');
  });

  test('REGRESSION [P2]: does not treat private client address as trusted proxy when proxy subnet is restricted', () => {
    // Threat Model:
    // An internal / VPN client with private IP 10.5.0.21 connects to an ingress load balancer (e.g. AWS ALB at 10.0.1.8).
    // ALB in default append mode appends the connecting client IP (10.5.0.21) to incoming XFF.
    // The attacker client sends a spoofed header 'X-Forwarded-For: 203.0.113.99' in an attempt to rotate identities.
    // Resulting XFF chain: '203.0.113.99, 10.5.0.21'
    const headers = new Map([
      ['x-forwarded-for', '203.0.113.99, 10.5.0.21'],
    ]);

    // 1. When configured with specific proxy subnet (10.0.1.0/24):
    // 10.5.0.21 is NOT in 10.0.1.0/24, so it is correctly identified as the authentic client IP and NOT skipped.
    const resolvedSecure = resolveClientIp(headers, {
      trustedProxies: ['10.0.1.0/24'],
    });
    assert.equal(
      resolvedSecure,
      '10.5.0.21',
      'Must identify 10.5.0.21 as client IP and not skip it to take spoofed public IP'
    );

    // 2. Attacker rotating spoofed prefix with distinct public IPs still resolves to authentic client IP
    const headersRotated = new Map([
      ['x-forwarded-for', '198.51.100.1, 10.5.0.21'],
    ]);
    const resolvedRotated = resolveClientIp(headersRotated, {
      trustedProxies: ['10.0.1.0/24'],
    });
    assert.equal(
      resolvedRotated,
      '10.5.0.21',
      'Rotated spoofed public IP must be ignored, pinning rate limits to authentic private client IP'
    );
  });

  test('REGRESSION [P2]: origin verification secret validates requests arrived through trusted proxy and rejects direct-to-origin spoofing', () => {
    process.env.TRUSTED_PROXY_COUNT = '1';
    process.env.TRUSTED_PROXY_SECRET = 'super-secret-origin-token-xyz';
    process.env.TRUSTED_PROXY_SECRET_HEADER = 'x-origin-verify';

    // 1. Attacker sends direct request to origin with spoofed X-Forwarded-For without the origin secret header
    const directSpoofedHeaders = new Map([
      ['x-forwarded-for', '203.0.113.10'],
    ]);
    assert.equal(
      resolveClientIp(directSpoofedHeaders),
      null,
      'Direct-to-origin connection without secret header must fail closed to null'
    );

    // 2. Attacker sends direct request with incorrect secret header
    const directTamperedHeaders = new Map([
      ['x-forwarded-for', '203.0.113.10'],
      ['x-origin-verify', 'invalid-token'],
    ]);
    assert.equal(
      resolveClientIp(directTamperedHeaders),
      null,
      'Direct connection with incorrect origin secret must fail closed to null'
    );

    // 3. Legitimate request forwarded through reverse proxy with genuine origin secret header
    const proxyVerifiedHeaders = new Map([
      ['x-forwarded-for', '203.0.113.10'],
      ['x-origin-verify', 'super-secret-origin-token-xyz'],
    ]);
    assert.equal(
      resolveClientIp(proxyVerifiedHeaders),
      '203.0.113.10',
      'Request carrying valid reverse proxy origin secret header must be accepted'
    );
  });

  test('REGRESSION [P2]: requires origin lockdown / verification for TRUSTED_PROXIES list mode too', () => {
    // 1. Direct connection to origin without origin secret under list mode fails closed
    delete process.env.TRUSTED_PROXY_COUNT;
    process.env.TRUSTED_PROXIES = '10.0.1.0/24';
    process.env.TRUSTED_PROXY_SECRET = 'origin-secret-token-456';
    process.env.TRUSTED_PROXY_SECRET_HEADER = 'x-origin-verify';

    const directHeaders = new Map([
      ['x-forwarded-for', '203.0.113.50'],
    ]);
    assert.equal(
      resolveClientIp(directHeaders),
      null,
      'Direct connection to origin under list mode without origin secret must fail closed to null'
    );

    // 2. Verified request with origin secret under list mode succeeds
    const verifiedHeaders = new Map([
      ['x-forwarded-for', '203.0.113.50, 10.0.1.2'],
      ['x-origin-verify', 'origin-secret-token-456'],
    ]);
    assert.equal(
      resolveClientIp(verifiedHeaders),
      '203.0.113.50',
      'Verified proxy request with origin secret under list mode must resolve authentic client IP'
    );

    // 3. Immediate peer validation via options.peerIp rejects direct connections from untrusted peers
    delete process.env.TRUSTED_PROXY_SECRET;
    const directUntrustedPeerHeaders = new Map([
      ['x-forwarded-for', '203.0.113.50'],
    ]);
    assert.equal(
      resolveClientIp(directUntrustedPeerHeaders, {
        trustedProxies: ['10.0.1.0/24'],
        peerIp: '198.51.100.99', // direct public internet caller
      }),
      null,
      'Direct connection from untrusted peerIp must fail closed to null under list mode'
    );

    // 4. Request arriving from immediate peer inside trusted proxy subnet succeeds
    const trustedPeerHeaders = new Map([
      ['x-forwarded-for', '203.0.113.50, 10.0.1.5'],
    ]);
    assert.equal(
      resolveClientIp(trustedPeerHeaders, {
        trustedProxies: ['10.0.1.0/24'],
        peerIp: '10.0.1.5',
      }),
      '203.0.113.50',
      'Request arriving from verified peerIp inside trusted proxy subnet must resolve client IP'
    );
  });

  test('REGRESSION [P2]: validates immediate peer in hop-count mode and fails closed if unconfigured or unverified', () => {
    // 1. Hop-count mode with peerIp passed, but trustedPeers / trustedProxies unconfigured: fails closed
    const headersHopCount = new Map([
      ['x-forwarded-for', '198.51.100.99, 203.0.113.50'],
    ]);
    assert.equal(
      resolveClientIp(headersHopCount, {
        trustedProxyCount: 1,
        peerIp: '10.0.1.5', // peerIp passed, but no trusted peer list
      }),
      null,
      'When peerIp is passed in hop-count mode without trustedPeers or trustedProxies, must fail closed to null'
    );

    // 2. Hop-count mode with trustedPeers configured, but peerIp is untrusted caller: fails closed
    assert.equal(
      resolveClientIp(headersHopCount, {
        trustedProxyCount: 1,
        trustedPeers: ['10.0.1.5'],
        peerIp: '198.51.100.99', // direct untrusted caller
      }),
      null,
      'When peerIp does not match trustedPeers in hop-count mode, must fail closed to null'
    );

    // 3. Hop-count mode with trustedPeers configured and matching peerIp: succeeds
    assert.equal(
      resolveClientIp(headersHopCount, {
        trustedProxyCount: 1,
        trustedPeers: ['10.0.1.5'],
        peerIp: '10.0.1.5',
      }),
      '203.0.113.50',
      'When peerIp matches trustedPeers in hop-count mode, resolves client IP via hop count'
    );

    // 4. Hop-count mode with process.env.TRUSTED_PEERS configured and matching peerIp: succeeds
    process.env.TRUSTED_PEERS = '10.0.1.0/24';
    assert.equal(
      resolveClientIp(headersHopCount, {
        trustedProxyCount: 1,
        peerIp: '10.0.1.5',
      }),
      '203.0.113.50',
      'When peerIp matches process.env.TRUSTED_PEERS in hop-count mode, resolves client IP'
    );
    delete process.env.TRUSTED_PEERS;

    // 5. Hop-count mode with options.trustedProxies fallback and matching peerIp: succeeds
    assert.equal(
      resolveClientIp(headersHopCount, {
        trustedProxyCount: 1,
        trustedProxies: ['10.0.1.0/24'],
        peerIp: '10.0.1.5',
      }),
      '203.0.113.50',
      'When peerIp matches trustedProxies fallback in hop-count mode, resolves client IP'
    );
  });

  test('REGRESSION [P2]: ingress in preserve mode fails to establish authentic client IP and requires append or dedicated overwritten ingress header', () => {
    // Scenario:
    // If a load balancer is in 'preserve' mode (such as AWS ALB preserve mode),
    // it forwards caller-supplied X-Forwarded-For headers through without appending the real client IP.
    // A caller supplying 'X-Forwarded-For: 203.0.113.99' reaches the origin unchanged.
    // To protect against this vulnerability, deployments must configure proxies to append/overwrite,
    // or use a dedicated guaranteed-overwritten header (e.g. TRUSTED_INGRESS_HEADER="x-real-ip").
    process.env.TRUSTED_INGRESS_HEADER = 'x-real-ip';
    const preserveModeHeaders = new Map([
      ['x-forwarded-for', '203.0.113.99'], // spoofed value preserved by proxy
      ['x-real-ip', '198.51.100.22'],     // strictly overwritten by proxy
    ]);

    const resolved = resolveClientIp(preserveModeHeaders);
    assert.equal(
      resolved,
      '198.51.100.22',
      'Dedicated overwritten ingress header must take precedence over preserved/unverified x-forwarded-for'
    );
  });

  test('ipMatchesProxyEntry helper accurately validates CIDR ranges, aliases, and exact IPs', () => {
    // parseIpValues helper
    const parsedV4 = parseIpValues('10.0.1.5');
    assert.notEqual(parsedV4.v4, null);
    const parsedMapped = parseIpValues('::ffff:10.0.1.5');
    assert.equal(parsedMapped.v4, parsedV4.v4, 'parseIpValues must extract matching 32-bit v4 for mapped IPv6');

    // IPv4 CIDRs
    assert.equal(ipMatchesProxyEntry('10.42.0.8', '10.0.0.0/8'), true);
    assert.equal(ipMatchesProxyEntry('11.0.0.1', '10.0.0.0/8'), false);
    assert.equal(ipMatchesProxyEntry('172.24.1.1', '172.16.0.0/12'), true);
    assert.equal(ipMatchesProxyEntry('172.33.0.1', '172.16.0.0/12'), false);
    assert.equal(ipMatchesProxyEntry('192.168.1.55', '192.168.1.0/24'), true);
    assert.equal(ipMatchesProxyEntry('192.168.2.55', '192.168.1.0/24'), false);

    // IPv6 CIDRs
    assert.equal(ipMatchesProxyEntry('2001:db8:1::1', '2001:db8::/32'), true);
    assert.equal(ipMatchesProxyEntry('2001:db9::1', '2001:db8::/32'), false);

    // Aliases
    assert.equal(ipMatchesProxyEntry('127.0.0.1', 'loopback'), true);
    assert.equal(ipMatchesProxyEntry('127.0.0.99', 'loopback'), true);
    assert.equal(ipMatchesProxyEntry('::1', 'loopback'), true);
    assert.equal(ipMatchesProxyEntry('::ffff:127.0.0.1', 'loopback'), true);
    assert.equal(ipMatchesProxyEntry('169.254.1.1', 'linklocal'), true);
    assert.equal(ipMatchesProxyEntry('::ffff:169.254.1.1', 'linklocal'), true);
    assert.equal(ipMatchesProxyEntry('10.1.2.3', 'private'), true);
    assert.equal(ipMatchesProxyEntry('::ffff:10.1.2.3', 'private'), true);
    assert.equal(ipMatchesProxyEntry('8.8.8.8', 'private'), false);
    assert.equal(ipMatchesProxyEntry('::ffff:8.8.8.8', 'private'), false);
  });

  test('rejects malformed, injected, or invalid IP addresses in headers', () => {
    process.env.TRUSTED_PROXY_COUNT = '1';
    const headersJunk = new Map([
      ['x-forwarded-for', '<script>alert(1)</script>, 999.999.999.999'],
    ]);
    assert.equal(resolveClientIp(headersJunk), null);
  });

  test('REGRESSION [P2]: rotating spoofed x-forwarded-for leftmost IP does NOT bypass per-IP rate limit when behind proxy', async () => {
    process.env.TRUSTED_PROXY_COUNT = '1';
    await resetOrderRateLimiter();
    const baseNow = Date.now();
    const authenticProxyIp = '203.0.113.95';

    // Attacker rotates leftmost IP on every request, attempting to bypass the 5-orders-per-IP limit
    for (let i = 0; i < ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_IP; i++) {
      // Simulate ingress header resolution with configured reverse proxy
      const headers = new Map([
        ['x-forwarded-for', `10.0.0.${i + 1}, ${authenticProxyIp}`],
      ]);
      const derivedIp = resolveClientIp(headers);
      assert.equal(derivedIp, authenticProxyIp, 'Derived IP must stably match the authentic client IP');

      const res = await checkAndAcquireOrderSlot({
        ip: derivedIp,
        email: `guest.${i}@example.com`,
        isEmailVerified: false,
        now: baseNow + i * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
      });
      assert.equal(res.allowed, true, `Attempt ${i + 1} succeeded`);
    }

    // 6th attempt with another rotated spoofed IP:
    const headersRotated = new Map([
      ['x-forwarded-for', `10.0.0.99, ${authenticProxyIp}`],
    ]);
    const derivedRotatedIp = resolveClientIp(headersRotated);
    assert.equal(derivedRotatedIp, authenticProxyIp);

    const blockedRes = await checkAndAcquireOrderSlot({
      ip: derivedRotatedIp,
      email: 'guest.blocked@example.com',
      isEmailVerified: false,
      now: baseNow + 6 * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
    });

    assert.equal(blockedRes.allowed, false, 'Attacker must be blocked despite rotating leftmost spoofed IP');
    assert.match(blockedRes.error, /Too many orders have been placed from your connection/);
  });

  test('REGRESSION [P2]: under default unconfigured deployment, fails closed without synthetic loopback bucket', async () => {
    // Under default configuration (no TRUSTED_INGRESS_HEADER, no TRUSTED_PROXY_COUNT, no TRUSTED_PROXIES, no platform env):
    delete process.env.TRUSTED_INGRESS_HEADER;
    delete process.env.TRUSTED_CLIENT_IP_HEADER;
    delete process.env.TRUSTED_PROXY_COUNT;
    delete process.env.TRUSTED_PROXIES;
    delete process.env.TRUSTED_PROXY_IPS;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.CF_PAGES;
    delete process.env.CLOUDFLARE;
    delete process.env.TRUSTED_PLATFORM;

    // 1. Unverified headers resolve to null rather than synthetic '127.0.0.1'
    const headersSingleXff = new Map([['x-forwarded-for', '203.0.113.195']]);
    assert.equal(
      resolveClientIp(headersSingleXff),
      null,
      'Untrusted single-value x-forwarded-for must resolve to null under unconfigured deployment'
    );

    const headersUnverifiedCf = new Map([['cf-connecting-ip', '203.0.113.195']]);
    assert.equal(
      resolveClientIp(headersUnverifiedCf),
      null,
      'Unconfigured cf-connecting-ip must resolve to null'
    );

    const headersUnverifiedRealIp = new Map([['x-real-ip', '203.0.113.195']]);
    assert.equal(
      resolveClientIp(headersUnverifiedRealIp),
      null,
      'Unconfigured x-real-ip must resolve to null'
    );

    const headersUnverifiedAkamai = new Map([['true-client-ip', '203.0.113.195']]);
    assert.equal(
      resolveClientIp(headersUnverifiedAkamai),
      null,
      'Unconfigured true-client-ip must resolve to null'
    );

    // 2. Order rate limiter rejects requests when client IP cannot be verified,
    // providing an actionable misconfiguration error rather than exhausting a shared synthetic loopback bucket
    await resetOrderRateLimiter();

    const res = await checkAndAcquireOrderSlot({
      ip: resolveClientIp(headersSingleXff),
      email: 'guest.unconfigured@example.com',
      isEmailVerified: false,
    });

    assert.equal(res.allowed, false, 'Must reject unconfigured order request');
    assert.match(
      res.error,
      /temporarily unavailable due to unconfigured network proxy settings/i,
      'Must return actionable proxy configuration error'
    );
  });

  test('supports opt-in local development loopback fallback', () => {
    const emptyHeaders = new Map();
    assert.equal(resolveClientIp(emptyHeaders, { allowLoopbackFallback: true }), '127.0.0.1');
    assert.equal(resolveClientIp(emptyHeaders, { platform: 'local' }), '127.0.0.1');
  });
});

describe('Authenticated Account Quota Protection with Alternate Contact Email [P2]', () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    process.env = { ...originalEnv };
    process.env.REQUIRE_EMAIL_CONFIRMATION = 'true';
    setProductionOrderStore(null);
    await resetOrderRateLimiter();
  });

  test('getConfirmedUserEmail correctly identifies confirmed account email', () => {
    assert.equal(getConfirmedUserEmail(null), null);
    assert.equal(getConfirmedUserEmail({ email: 'user@example.com' }), null);
    assert.equal(getConfirmedUserEmail({ email: 'user@example.com', email_confirmed_at: null }), null);
    assert.equal(getConfirmedUserEmail({ email: 'user@example.com', email_confirmed_at: '' }), null);
    assert.equal(
      getConfirmedUserEmail({ email: '  ALICE@EXAMPLE.COM  ', email_confirmed_at: '2026-01-01T00:00:00Z' }),
      'alice@example.com'
    );
  });

  test('REGRESSION [P2]: authenticated user cannot bypass account quota by rotating recipient/contact emails', async () => {
    const baseNow = Date.now();
    const authenticatedUser = {
      email: 'alice.shopper@example.com',
      email_confirmed_at: '2026-01-01T00:00:00Z',
    };
    const confirmedAccountEmail = getConfirmedUserEmail(authenticatedUser);
    assert.equal(confirmedAccountEmail, 'alice.shopper@example.com');

    // Alice places 3 orders with 3 different recipient/contact emails (e.g. shipping gifts)
    const recipientEmails = ['bob@example.com', 'carol@example.com', 'dave@example.com'];

    for (let i = 0; i < ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_EMAIL; i++) {
      const recipient = recipientEmails[i];
      // Recipient email does not match Alice's email, so isEmailVerified is false for recipient
      assert.equal(isMailboxVerified(authenticatedUser, recipient), false);

      const res = await checkAndAcquireOrderSlot({
        ip: `198.51.100.${10 + i}`, // distinct IPs
        email: recipient,
        isEmailVerified: false,
        accountEmail: confirmedAccountEmail,
        now: baseNow + i * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
      });

      assert.equal(res.allowed, true, `Alice's order ${i + 1} with alternate email ${recipient} should be allowed`);
      assert.equal(res.slotAcquired, true);
    }

    // 4th order: Alice attempts another order with a 4th recipient email
    const fourthRes = await checkAndAcquireOrderSlot({
      ip: '198.51.100.99',
      email: 'eve@example.com',
      isEmailVerified: false,
      accountEmail: confirmedAccountEmail,
      now: baseNow + 4 * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
    });

    assert.equal(fourthRes.allowed, false, '4th order must be blocked by account quota');
    assert.equal(fourthRes.slotAcquired, false);
    assert.match(fourthRes.error, /Maximum order placement attempts reached for this account/);

    // 5th order: Alice also cannot order using her own email
    const ownEmailRes = await checkAndAcquireOrderSlot({
      ip: '198.51.100.99',
      email: confirmedAccountEmail,
      isEmailVerified: true,
      accountEmail: confirmedAccountEmail,
      now: baseNow + 5 * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
    });

    assert.equal(ownEmailRes.allowed, false, 'Alice cannot place further orders under her own email either');
    assert.match(ownEmailRes.error, /Maximum order placement attempts reached for this account/);
  });

  test('REGRESSION [P2]: recipient emails used in alternate-contact orders are NOT quota-poisoned', async () => {
    const baseNow = Date.now();
    const aliceUser = {
      email: 'alice.shopper@example.com',
      email_confirmed_at: '2026-01-01T00:00:00Z',
    };
    const bobEmail = 'bob.recipient@example.com';

    // Alice sends orders addressing Bob
    for (let i = 0; i < 2; i++) {
      await checkAndAcquireOrderSlot({
        ip: `198.51.100.${50 + i}`,
        email: bobEmail,
        isEmailVerified: false, // unverified contact email
        accountEmail: getConfirmedUserEmail(aliceUser),
        now: baseNow + i * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
      });
    }

    // Now Bob logs in as his own authenticated account and places orders
    const bobUser = {
      email: bobEmail,
      email_confirmed_at: '2026-01-01T00:00:00Z',
    };
    assert.equal(isMailboxVerified(bobUser, bobEmail), true);

    const bobRes = await checkAndAcquireOrderSlot({
      ip: '203.0.113.88',
      email: bobEmail,
      isEmailVerified: true,
      accountEmail: getConfirmedUserEmail(bobUser),
      now: baseNow + 3 * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
    });

    assert.equal(bobRes.allowed, true, 'Bob must have his full quota available and not be poisoned by Alice');
    assert.equal(bobRes.slotAcquired, true);
  });

  test('REGRESSION [P2]: enforces account-level cooldown between rapid alternate contact email orders', async () => {
    const baseNow = Date.now();
    const user = {
      email: 'fast.shopper@example.com',
      email_confirmed_at: '2026-01-01T00:00:00Z',
    };
    const confirmedEmail = getConfirmedUserEmail(user);

    // Order 1
    const res1 = await checkAndAcquireOrderSlot({
      ip: '198.51.100.1',
      email: 'gift1@example.com',
      isEmailVerified: false,
      accountEmail: confirmedEmail,
      now: baseNow,
    });
    assert.equal(res1.allowed, true);

    // Order 2 placed 1 second later with different recipient from different IP
    const res2 = await checkAndAcquireOrderSlot({
      ip: '198.51.100.2',
      email: 'gift2@example.com',
      isEmailVerified: false,
      accountEmail: confirmedEmail,
      now: baseNow + 1000, // 1s < 5s cooldown
    });

    assert.equal(res2.allowed, false, 'Must enforce account cooldown even with alternate contact email and IP');
    assert.match(res2.error, /Please wait a few seconds before placing another order/);
  });

  test('DatabaseRpcOrderRateLimitStore derives p_account_key from authenticated accountEmail', async () => {
    let capturedArgs = null;
    const mockSupabase = {
      rpc: async (name, args) => {
        capturedArgs = args;
        return { data: { allowed: true, isDuplicate: false, slotAcquired: true }, error: null };
      },
    };

    const dbStore = new DatabaseRpcOrderRateLimitStore(async () => mockSupabase);
    await dbStore.checkAndAcquire({
      ip: '198.51.100.99',
      email: 'alternate.recipient@example.com',
      isEmailVerified: false,
      accountEmail: 'verified.user@example.com',
      fingerprint: 'test-fingerprint-account',
    });

    assert.equal(capturedArgs.p_email_key, '');
    assert.equal(capturedArgs.p_account_key, hashOrderRateIdentifier('account:verified.user@example.com'));
  });
});

describe('Payment Session Bounded Allocation & Admission Control Tests', () => {
  beforeEach(() => {
    resetPaymentProviderState();
    process.env.PAYMENT_GATEWAY_SECRET = 'test_secret_for_payment_provider_key_12345';
  });

  test('REGRESSION [P2]: createServerPaymentSession purges expired sessions during allocation', () => {
    const baseNow = 1700000000000;
    const session1 = createServerPaymentSession(1999, 'INR', undefined, baseNow);
    assert.ok(session1);
    assert.equal(getPaymentProviderMetrics().activeSessionsCount, 1);

    // Fast-forward past 15 min TTL and allocate a new session: must prune session1 during allocation
    const futureNow = baseNow + PAYMENT_SESSION_CONFIG.SESSION_TTL_MS + 1000;
    const session2 = createServerPaymentSession(2999, 'INR', undefined, futureNow);
    assert.ok(session2);
    assert.equal(
      getPaymentProviderMetrics().activeSessionsCount,
      1,
      'Expired session1 must be pruned during allocation of session2'
    );
  });

  test('REGRESSION [P2]: createServerPaymentSession preserves unexpired sessions at capacity and rejects new allocations', () => {
    const originalMax = PAYMENT_SESSION_CONFIG.MAX_ACTIVE_SESSIONS;
    try {
      PAYMENT_SESSION_CONFIG.MAX_ACTIVE_SESSIONS = 5;
      const baseNow = 1700000000000;
      const sessions = [];
      for (let i = 0; i < 5; i++) {
        const sess = createServerPaymentSession(1000 + i, 'INR', undefined, baseNow);
        assert.ok(sess);
        sessions.push(sess);
      }
      assert.equal(getPaymentProviderMetrics().activeSessionsCount, 5);

      // Allocating 6th session while all 5 are active and unexpired must reject new allocation and preserve live sessions
      const sess6 = createServerPaymentSession(6000, 'INR', undefined, baseNow + 1000);
      assert.equal(sess6, null, 'Must reject new session allocation when active unexpired sessions are at capacity');
      assert.equal(
        getPaymentProviderMetrics().activeSessionsCount,
        5,
        'activeSessions count must remain at capacity without evicting live sessions'
      );

      // Verify that the oldest session (session 0) was NOT evicted and remains valid for payment verification
      const verifySession0 = verifyPaymentProviderServer(
        {
          paymentId: 'pay_tx_0',
          sessionId: sessions[0].sessionId,
          signature: crypto
            .createHmac('sha256', process.env.PAYMENT_GATEWAY_SECRET)
            .update(`${sessions[0].sessionId}:pay_tx_0:${sessions[0].amount}:INR`)
            .digest('hex'),
          amount: sessions[0].amount,
          currency: 'INR',
        },
        baseNow + 1500
      );
      assert.equal(verifySession0.verified, true, 'Oldest unexpired session must remain valid and verifiable');

      // Now session 0 is consumed. Allocating a new session reclaims session 0's slot
      const sess7 = createServerPaymentSession(7000, 'INR', undefined, baseNow + 2000);
      assert.ok(sess7, 'Should allocate new session after an expired/consumed session is swept');
      assert.equal(getPaymentProviderMetrics().activeSessionsCount, 5);
    } finally {
      PAYMENT_SESSION_CONFIG.MAX_ACTIVE_SESSIONS = originalMax;
    }
  });

  test('REGRESSION [P2]: recordProcessedTransaction enforces hard capacity bound on processedTransactions', () => {
    const originalMax = PAYMENT_SESSION_CONFIG.MAX_PROCESSED_TRANSACTIONS;
    try {
      PAYMENT_SESSION_CONFIG.MAX_PROCESSED_TRANSACTIONS = 5;
      for (let i = 0; i < 5; i++) {
        recordProcessedTransaction(`pay_tx_${i}`);
      }
      assert.equal(getPaymentProviderMetrics().processedTransactionsCount, 5);

      recordProcessedTransaction('pay_tx_overflow');
      assert.equal(
        getPaymentProviderMetrics().processedTransactionsCount,
        5,
        'processedTransactions must not exceed MAX_PROCESSED_TRANSACTIONS'
      );
    } finally {
      PAYMENT_SESSION_CONFIG.MAX_PROCESSED_TRANSACTIONS = originalMax;
    }
  });

  test('REGRESSION [P2]: checkAndAcquirePaymentSessionSlot enforces per-IP admission limits within window', () => {
    const testIp = '198.51.100.42';
    const baseNow = Date.now();

    for (let i = 0; i < PAYMENT_SESSION_CONFIG.MAX_SESSIONS_PER_IP; i++) {
      const result = checkAndAcquirePaymentSessionSlot(testIp, baseNow);
      assert.equal(result.allowed, true, `Slot ${i + 1} should be admitted`);
    }

    // Next request within window must be rejected
    const blocked = checkAndAcquirePaymentSessionSlot(testIp, baseNow);
    assert.equal(blocked.allowed, false);
    assert.match(blocked.error, /Too many payment sessions initiated/);
    assert.ok(blocked.retryAfter > 0);

    // After window expires, admission is restored
    const futureNow = baseNow + PAYMENT_SESSION_CONFIG.IP_WINDOW_MS + 1000;
    const restored = checkAndAcquirePaymentSessionSlot(testIp, futureNow);
    assert.equal(restored.allowed, true, 'Slot should be admitted after window expires');
  });

  test('REGRESSION [P2]: checkAndAcquirePaymentSessionSlot strictly enforces tracked-IP cap when all entries are active', () => {
    const originalMax = PAYMENT_SESSION_CONFIG.MAX_TRACKED_IPS;
    try {
      PAYMENT_SESSION_CONFIG.MAX_TRACKED_IPS = 5;
      const baseNow = Date.now();

      // Admit 5 unique IPs up to MAX_TRACKED_IPS
      for (let i = 0; i < 5; i++) {
        const res = checkAndAcquirePaymentSessionSlot(`198.51.100.${i}`, baseNow);
        assert.equal(res.allowed, true, `Slot for IP 198.51.100.${i} must be admitted`);
      }
      assert.equal(
        getPaymentProviderMetrics().trackedIpsCount,
        PAYMENT_SESSION_CONFIG.MAX_TRACKED_IPS,
        'Tracked IPs count must equal configured maximum (5)'
      );

      // Attempting 6th unique IP while all 5 are active in-window must be rejected
      const overflowRes = checkAndAcquirePaymentSessionSlot('198.51.100.99', baseNow);
      assert.equal(overflowRes.allowed, false, 'New IP must be rejected when all entries are active at cap');
      assert.match(overflowRes.error, /Payment session capacity reached/);
      assert.equal(
        getPaymentProviderMetrics().trackedIpsCount,
        PAYMENT_SESSION_CONFIG.MAX_TRACKED_IPS,
        'Tracked IPs count must strictly assert the configured maximum (5)'
      );

      // Churn 50 more unique IPs: all must be rejected and map size must remain exactly MAX_TRACKED_IPS
      for (let i = 100; i < 150; i++) {
        const res = checkAndAcquirePaymentSessionSlot(`203.0.113.${i}`, baseNow);
        assert.equal(res.allowed, false);
      }
      assert.equal(
        getPaymentProviderMetrics().trackedIpsCount,
        PAYMENT_SESSION_CONFIG.MAX_TRACKED_IPS,
        'Tracked IPs must strictly assert configured maximum even under rapid unique-IP churn'
      );

      // An existing tracked IP can still acquire within its per-IP quota without increasing map size
      const existingRes = checkAndAcquirePaymentSessionSlot('198.51.100.0', baseNow + 500);
      assert.equal(existingRes.allowed, true, 'Existing tracked IP can still acquire within per-IP quota');
      assert.equal(
        getPaymentProviderMetrics().trackedIpsCount,
        PAYMENT_SESSION_CONFIG.MAX_TRACKED_IPS,
        'Existing IP acquisition must not grow the map'
      );

      // After IP window expires, stale IPs can be pruned and a new IP can be admitted
      const futureNow = baseNow + PAYMENT_SESSION_CONFIG.IP_WINDOW_MS + 1000;
      const futureRes = checkAndAcquirePaymentSessionSlot('198.51.100.99', futureNow);
      assert.equal(futureRes.allowed, true, 'New IP admitted after window expires and stale IPs are reclaimed');
      assert.ok(
        getPaymentProviderMetrics().trackedIpsCount <= PAYMENT_SESSION_CONFIG.MAX_TRACKED_IPS,
        'Tracked IPs must not exceed configured maximum'
      );
    } finally {
      PAYMENT_SESSION_CONFIG.MAX_TRACKED_IPS = originalMax;
    }
  });
});

describe('Cross-Instance Payment Persistence & Order Commit Protection Tests [P2]', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'palluvo-payment-test-'));
    setPaymentStore(new CrossProcessPaymentStore(tmpDir));
    resetPaymentProviderState();
    process.env.PAYMENT_GATEWAY_SECRET = 'test_secret_for_payment_provider_key_12345';
  });

  afterEach(() => {
    setPaymentStore(null);
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch {}
  });

  test('REGRESSION [P2]: payment sessions persist across serverless instances sharing durable store', async () => {
    const baseNow = 1700000000000;
    // Instance A allocates a payment session
    const instanceAStore = new CrossProcessPaymentStore(tmpDir);
    setPaymentStore(instanceAStore);

    const sessionA = await createServerPaymentSession(3999, 'INR', '198.51.100.10', baseNow);
    assert.ok(sessionA);
    assert.ok(sessionA.sessionId);

    // Simulate Instance B in a separate process/worker with clean in-memory state
    const instanceBStore = new CrossProcessPaymentStore(tmpDir);
    setPaymentStore(instanceBStore);

    // Instance B receives the payment verification payload from customer
    const signature = crypto
      .createHmac('sha256', process.env.PAYMENT_GATEWAY_SECRET)
      .update(`${sessionA.sessionId}:pay_instance_b_123:3999:INR`)
      .digest('hex');

    const verifyResult = await verifyPaymentProviderServer(
      {
        paymentId: 'pay_instance_b_123',
        sessionId: sessionA.sessionId,
        signature,
        amount: 3999,
        currency: 'INR',
        autoConsume: false, // verify without burning session
      },
      baseNow + 5000
    );

    assert.equal(verifyResult.verified, true, 'Instance B must discover session from shared durable store');
    assert.equal(verifyResult.paymentId, 'pay_instance_b_123');
  });

  test('REGRESSION [P2]: payment session survives simulated process restart', async () => {
    const baseNow = 1700000000000;
    const session = await createServerPaymentSession(4999, 'INR', '198.51.100.20', baseNow);
    assert.ok(session);

    // Simulate process termination and restart: reinstantiate store from disk
    const restartedStore = new CrossProcessPaymentStore(tmpDir);
    setPaymentStore(restartedStore);

    const signature = crypto
      .createHmac('sha256', process.env.PAYMENT_GATEWAY_SECRET)
      .update(`${session.sessionId}:pay_restart_999:4999:INR`)
      .digest('hex');

    const verifyResult = await verifyPaymentProviderServer(
      {
        paymentId: 'pay_restart_999',
        sessionId: session.sessionId,
        signature,
        amount: 4999,
        currency: 'INR',
        autoConsume: false,
      },
      baseNow + 3000
    );

    assert.equal(verifyResult.verified, true, 'Payment session must survive process restart');
  });

  test('REGRESSION [P2]: atomic consumePaymentSession prevents double-consumption and replay attacks', async () => {
    const baseNow = 1700000000000;
    const session = await createServerPaymentSession(5999, 'INR', '198.51.100.30', baseNow);
    assert.ok(session);

    // First consumption succeeds and records orderNumber
    const firstConsume = await consumePaymentSession({
      sessionId: session.sessionId,
      paymentId: 'pay_atomic_001',
      orderNumber: 'PLV-100001',
      amount: 5999,
      currency: 'INR',
      now: baseNow + 1000,
    });

    assert.equal(firstConsume.success, true);
    assert.equal(firstConsume.orderNumber, 'PLV-100001');

    // Duplicate attempt to consume the same payment transaction must be rejected
    const duplicateTx = await consumePaymentSession({
      sessionId: session.sessionId,
      paymentId: 'pay_atomic_001',
      orderNumber: 'PLV-100002',
      amount: 5999,
      currency: 'INR',
      now: baseNow + 2000,
    });

    assert.equal(duplicateTx.success, false);
    assert.equal(duplicateTx.duplicate, true);
    assert.equal(duplicateTx.orderNumber, 'PLV-100001');
    assert.match(duplicateTx.error, /Duplicate transaction detected/);

    // Attempt to consume the same session with a new paymentId must also be rejected as already consumed
    const duplicateSession = await consumePaymentSession({
      sessionId: session.sessionId,
      paymentId: 'pay_atomic_002',
      orderNumber: 'PLV-100003',
      amount: 5999,
      currency: 'INR',
      now: baseNow + 3000,
    });

    assert.equal(duplicateSession.success, false);
    assert.equal(duplicateSession.duplicate, true);
    assert.match(duplicateSession.error, /Payment session has already been consumed/);
  });

  test('REGRESSION [P2]: payment session is preserved when order placement fails and can be recovered', async () => {
    const baseNow = 1700000000000;
    const session = await createServerPaymentSession(2999, 'INR', '198.51.100.40', baseNow);
    assert.ok(session);

    const signature = crypto
      .createHmac('sha256', process.env.PAYMENT_GATEWAY_SECRET)
      .update(`${session.sessionId}:pay_failed_db_777:2999:INR`)
      .digest('hex');

    // 1. Initial verification with autoConsume: false succeeds without consuming session
    const preVerify = await verifyPaymentProviderServer(
      {
        paymentId: 'pay_failed_db_777',
        sessionId: session.sessionId,
        signature,
        amount: 2999,
        currency: 'INR',
        autoConsume: false,
      },
      baseNow + 500
    );
    assert.equal(preVerify.verified, true);

    // Simulate: Database insert fails (e.g. constraint error or DB unavailable).
    // In actions.ts, consumePaymentSession is NOT called when insert fails.
    // The session remains unconsumed in the durable store.
    const store = getPaymentStore();
    const storedSession = await store.getSession(session.sessionId);
    assert.equal(storedSession.consumed, false, 'Session must not be consumed if database insert fails');

    // 2. Customer retries after transient failure: re-verification must succeed (NOT duplicate error)
    const retryVerify = await verifyPaymentProviderServer(
      {
        paymentId: 'pay_failed_db_777',
        sessionId: session.sessionId,
        signature,
        amount: 2999,
        currency: 'INR',
        autoConsume: false,
      },
      baseNow + 2000
    );
    assert.equal(retryVerify.verified, true, 'Retry must succeed and not be locked out by previous failed attempt');

    // 3. Database insert now succeeds: consumePaymentSession commits session and transaction
    const finalCommit = await consumePaymentSession({
      sessionId: session.sessionId,
      paymentId: 'pay_failed_db_777',
      orderNumber: 'PLV-888888',
      amount: 2999,
      currency: 'INR',
      now: baseNow + 2500,
    });
    assert.equal(finalCommit.success, true);

    // 4. Repeated retry after order committed returns duplicate flag and existing orderNumber for idempotent recovery
    const repeatVerify = await verifyPaymentProviderServer(
      {
        paymentId: 'pay_failed_db_777',
        sessionId: session.sessionId,
        signature,
        amount: 2999,
        currency: 'INR',
        autoConsume: false,
      },
      baseNow + 3000
    );
    assert.equal(repeatVerify.verified, false);
    assert.equal(repeatVerify.duplicate, true);
    assert.equal(repeatVerify.orderNumber, 'PLV-888888', 'Must return associated orderNumber for idempotent recovery');
  });

  test('REGRESSION [P2]: DatabasePaymentStore executes RPCs with service_role privilege', async () => {
    let rpcCalled = '';
    let rpcArgs = null;

    const mockSupabase = {
      rpc: async (fn, args) => {
        rpcCalled = fn;
        rpcArgs = args;
        if (fn === 'save_payment_session') {
          return { data: { success: true, session_id: args.p_session_id }, error: null };
        }
        if (fn === 'consume_payment_session') {
          return {
            data: {
              success: true,
              session_id: args.p_session_id,
              payment_id: args.p_payment_id,
              order_number: args.p_order_number,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    };

    const dbStore = new DatabasePaymentStore(async () => mockSupabase);

    // Test saveSession via RPC
    const saved = await dbStore.saveSession({
      sessionId: 'sess_rpc_test',
      amount: 1999,
      currency: 'INR',
      sessionToken: 'token_rpc',
      createdAt: 1700000000000,
      expiresAt: 1700000900000,
      consumed: false,
      clientIp: '198.51.100.50',
    });

    assert.equal(saved, true);
    assert.equal(rpcCalled, 'save_payment_session');
    assert.equal(rpcArgs.p_session_id, 'sess_rpc_test');
    assert.equal(rpcArgs.p_amount, 1999);

    // Test consumePayment via RPC
    const consumed = await dbStore.consumePayment({
      sessionId: 'sess_rpc_test',
      paymentId: 'pay_rpc_test',
      orderNumber: 'PLV-999999',
      amount: 1999,
      currency: 'INR',
    });

    assert.equal(consumed.success, true);
    assert.equal(rpcCalled, 'consume_payment_session');
    assert.equal(rpcArgs.p_payment_id, 'pay_rpc_test');
    assert.equal(rpcArgs.p_order_number, 'PLV-999999');
  });

  test('REGRESSION [P2]: SQL migration file sets up payment_sessions, payment_transactions, and service_role RLS', () => {
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20261028_payment_sessions.sql');
    assert.ok(fs.existsSync(migrationPath), '20261028_payment_sessions.sql migration file must exist');

    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    assert.match(sqlContent, /CREATE TABLE IF NOT EXISTS public\.payment_sessions/);
    assert.match(sqlContent, /CREATE TABLE IF NOT EXISTS public\.payment_transactions/);
    assert.match(sqlContent, /status TEXT NOT NULL DEFAULT 'confirmed'/);
    assert.match(sqlContent, /CREATE OR REPLACE FUNCTION public\.save_payment_session/);
    assert.match(sqlContent, /CREATE OR REPLACE FUNCTION public\.claim_payment_session/);
    assert.match(sqlContent, /CREATE OR REPLACE FUNCTION public\.release_payment_claim/);
    assert.match(sqlContent, /CREATE OR REPLACE FUNCTION public\.consume_payment_session/);
    assert.match(sqlContent, /GRANT EXECUTE ON FUNCTION public\.claim_payment_session\(.*\) TO service_role/);
    assert.match(sqlContent, /GRANT EXECUTE ON FUNCTION public\.release_payment_claim\(.*\) TO service_role/);
    assert.match(sqlContent, /GRANT EXECUTE ON FUNCTION public\.consume_payment_session\(.*\) TO service_role/);
    assert.match(sqlContent, /ALTER TABLE public\.payment_sessions ENABLE ROW LEVEL SECURITY/);
    assert.match(sqlContent, /ALTER TABLE public\.payment_transactions ENABLE ROW LEVEL SECURITY/);
    assert.match(sqlContent, /ALTER TABLE IF EXISTS public\.orders ADD COLUMN IF NOT EXISTS payment_id TEXT/);
    assert.match(sqlContent, /CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON public\.orders \(payment_id\)/);
    assert.match(
      sqlContent,
      /SET payment_id = substring\(payment_status FROM '\\\(\[A-Za-z0-9_-\]\+:\\s\*\(\[\^\)\]\+\)\\\)'\)/,
      'Migration backfill pattern must use a single capture group capturing payment ID'
    );

    // Verify regex extracts gateway payment ID, not method (UPI/CARD)
    const backfillRegex = /\([A-Za-z0-9_-]+:\s*([^)]+)\)/;
    const upiMatch = 'Verified & Captured (UPI: pay_sample_upi_12345)'.match(backfillRegex);
    const cardMatch = 'Verified & Captured (CARD: pay_sample_card_67890)'.match(backfillRegex);
    assert.ok(upiMatch, 'Regex must match UPI payment_status pattern');
    assert.equal(upiMatch[1], 'pay_sample_upi_12345', 'Regex group 1 must extract the gateway payment ID, not method');
    assert.ok(cardMatch, 'Regex must match CARD payment_status pattern');
    assert.equal(cardMatch[1], 'pay_sample_card_67890', 'Regex group 1 must extract the gateway payment ID, not method');
  });

  test('REGRESSION [P2]: CrossProcessPaymentStore.withLock fails closed when lock cannot be acquired', async () => {
    const testDir = path.join(os.tmpdir(), `palluvo_lock_fail_test_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    try {
      const store = new CrossProcessPaymentStore(testDir);
      // Pre-create lock file so store cannot acquire lock
      fs.writeFileSync(store.lockFilePath, JSON.stringify({ pid: process.pid, time: Date.now() }));

      let callbackExecuted = false;
      assert.throws(
        () => {
          store['withLock'](() => {
            callbackExecuted = true;
            return 'should_not_run';
          });
        },
        /Failed to acquire lock/
      );
      assert.equal(callbackExecuted, false, 'Callback must strictly NOT execute if lock was not acquired');

      // Caller methods must fail closed gracefully
      const saveRes = await store.saveSession({
        sessionId: 'sess_lock_fail',
        amount: 1000,
        currency: 'INR',
        sessionToken: 'tok',
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
        consumed: false,
      });
      assert.equal(saveRes, false, 'saveSession must fail closed when lock cannot be acquired');

      const claimRes = await store.claimPayment({
        sessionId: 'sess_lock_fail',
        paymentId: 'pay_lock_fail',
        orderNumber: 'PLV-LOCK-1',
        amount: 1000,
      });
      assert.equal(claimRes.success, false, 'claimPayment must fail closed when lock cannot be acquired');
      assert.match(claimRes.error, /lock/i);
    } finally {
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
    }
  });

  test('REGRESSION [P1]: Atomic claim workflow prevents concurrent double order submissions for same payment', async () => {
    const baseNow = 1700000000000;
    const session = await createServerPaymentSession(4999, 'INR', '198.51.100.99', baseNow);
    assert.ok(session);

    // Concurrent request A claims the payment ID for order PLV-CONCURRENT-A
    const claimA = await claimPaymentSession({
      sessionId: session.sessionId,
      paymentId: 'pay_concurrent_123',
      orderNumber: 'PLV-CONCURRENT-A',
      amount: 4999,
      currency: 'INR',
      now: baseNow + 100,
    });
    assert.equal(claimA.success, true);
    assert.equal(claimA.orderNumber, 'PLV-CONCURRENT-A');

    // Concurrent request B attempts to claim the same payment ID for a different order PLV-CONCURRENT-B
    const claimB = await claimPaymentSession({
      sessionId: session.sessionId,
      paymentId: 'pay_concurrent_123',
      orderNumber: 'PLV-CONCURRENT-B',
      amount: 4999,
      currency: 'INR',
      now: baseNow + 150,
    });
    assert.equal(claimB.success, false, 'Second concurrent claim must fail');
    assert.equal(claimB.duplicate, true, 'Second concurrent claim must be flagged as duplicate');
    assert.equal(claimB.orderNumber, 'PLV-CONCURRENT-A', 'Must report winning orderNumber so concurrent request can recover existing order');
    assert.match(claimB.error, /Duplicate transaction detected/);

    // Idempotent retry by the SAME order PLV-CONCURRENT-A succeeds
    const retryA = await claimPaymentSession({
      sessionId: session.sessionId,
      paymentId: 'pay_concurrent_123',
      orderNumber: 'PLV-CONCURRENT-A',
      amount: 4999,
      currency: 'INR',
      now: baseNow + 200,
    });
    assert.equal(retryA.success, true, 'Idempotent retry for the same order must succeed');
  });

  test('REGRESSION [P1]: Releasing payment claim on insert failure permits customer retry without lockout', async () => {
    const baseNow = 1700000000000;
    const session = await createServerPaymentSession(3499, 'INR', '198.51.100.99', baseNow);
    assert.ok(session);

    // Step 1: Claim payment for order attempt 1
    const claim1 = await claimPaymentSession({
      sessionId: session.sessionId,
      paymentId: 'pay_retry_456',
      orderNumber: 'PLV-ATTEMPT-1',
      amount: 3499,
      currency: 'INR',
      now: baseNow + 100,
    });
    assert.equal(claim1.success, true);

    // Step 2: Database insert fails -> actions.ts invokes releasePaymentClaim
    const released = await releasePaymentClaim({
      sessionId: session.sessionId,
      paymentId: 'pay_retry_456',
      orderNumber: 'PLV-ATTEMPT-1',
    });
    assert.equal(released, true);

    // Step 3: Customer retries order placement -> claim succeeds for attempt 2
    const claim2 = await claimPaymentSession({
      sessionId: session.sessionId,
      paymentId: 'pay_retry_456',
      orderNumber: 'PLV-ATTEMPT-2',
      amount: 3499,
      currency: 'INR',
      now: baseNow + 500,
    });
    assert.equal(claim2.success, true, 'Customer retry must succeed after previous claim was released');
    assert.equal(claim2.orderNumber, 'PLV-ATTEMPT-2');

    // Step 4: Database insert succeeds -> confirmPaymentSession finalizes payment
    const confirmed = await confirmPaymentSession({
      sessionId: session.sessionId,
      paymentId: 'pay_retry_456',
      orderNumber: 'PLV-ATTEMPT-2',
      amount: 3499,
      currency: 'INR',
      now: baseNow + 600,
    });
    assert.equal(confirmed.success, true);

    // Step 5: After confirmation, releasePaymentClaim can no longer unseat the confirmed transaction
    const lateRelease = await releasePaymentClaim({
      sessionId: session.sessionId,
      paymentId: 'pay_retry_456',
      orderNumber: 'PLV-ATTEMPT-2',
    });
    assert.equal(lateRelease, true);

    const store = getPaymentStore();
    const tx = await store.getTransaction('pay_retry_456');
    assert.ok(tx, 'Confirmed transaction must remain persisted');
    assert.equal(tx.status, 'confirmed');
  });

  test('REGRESSION [P1]: DatabasePaymentStore executes claim and release RPCs with service_role privilege', async () => {
    const rpcLog = [];

    const mockSupabase = {
      rpc: async (fn, args) => {
        rpcLog.push({ fn, args });
        if (fn === 'claim_payment_session') {
          return {
            data: {
              success: true,
              session_id: args.p_session_id,
              payment_id: args.p_payment_id,
              order_number: args.p_order_number,
            },
            error: null,
          };
        }
        if (fn === 'release_payment_claim') {
          return { data: { success: true }, error: null };
        }
        return { data: null, error: null };
      },
    };

    const dbStore = new DatabasePaymentStore(async () => mockSupabase);

    const claimRes = await dbStore.claimPayment({
      sessionId: 'sess_db_claim',
      paymentId: 'pay_db_claim',
      orderNumber: 'PLV-DB-CLAIM-1',
      amount: 7999,
      currency: 'INR',
    });
    assert.equal(claimRes.success, true);
    assert.equal(claimRes.orderNumber, 'PLV-DB-CLAIM-1');
    assert.equal(rpcLog[0].fn, 'claim_payment_session');
    assert.equal(rpcLog[0].args.p_payment_id, 'pay_db_claim');

    const releaseRes = await dbStore.releaseClaim({
      sessionId: 'sess_db_claim',
      paymentId: 'pay_db_claim',
      orderNumber: 'PLV-DB-CLAIM-1',
    });
    assert.equal(releaseRes, true);
    assert.equal(rpcLog[1].fn, 'release_payment_claim');
    assert.equal(rpcLog[1].args.p_payment_id, 'pay_db_claim');
  });

  test('REGRESSION [P2]: isOrderOwnedByRequester enforces ownership and rejects cross-customer order recovery', () => {
    const authOrder = {
      id: 'PLV-AUTH-1',
      user_id: 'usr_authenticated_1',
      customer: { email: 'customer@example.com', firstName: 'Priya' },
    };
    const guestOrder = {
      id: 'PLV-GUEST-1',
      user_id: null,
      customer: { email: 'guest@example.com', firstName: 'Guest' },
    };

    // 1. Authenticated user matching user_id -> allowed
    assert.equal(
      isOrderOwnedByRequester(authOrder, { id: 'usr_authenticated_1' }, { email: 'customer@example.com' }),
      true,
      'Authenticated owner matching user_id must be allowed'
    );

    // 2. Different authenticated user -> rejected
    assert.equal(
      isOrderOwnedByRequester(authOrder, { id: 'usr_attacker_2' }, { email: 'customer@example.com' }),
      false,
      'Different authenticated user must be rejected even if customer email matches'
    );

    // 3. Guest caller attempting to claim order belonging to authenticated user -> rejected
    assert.equal(
      isOrderOwnedByRequester(authOrder, null, { email: 'customer@example.com' }),
      false,
      'Unauthenticated guest must NOT be permitted to claim an order owned by an authenticated account'
    );

    // 4. Guest caller matching guest order email -> allowed
    assert.equal(
      isOrderOwnedByRequester(guestOrder, null, { email: 'guest@example.com' }),
      true,
      'Guest caller with exact matching email must be allowed for guest order'
    );

    // 5. Normalization: untrimmed and mixed-case emails match safely
    assert.equal(
      isOrderOwnedByRequester(guestOrder, null, { email: '  GUEST@EXAMPLE.COM  ' }),
      true,
      'Email matching must be case-insensitive and whitespace-trimmed'
    );

    // 6. Cross-customer email mismatch -> rejected
    assert.equal(
      isOrderOwnedByRequester(guestOrder, null, { email: 'other@example.com' }),
      false,
      'Cross-customer lookup with different email must be rejected'
    );

    // 7. Null order -> rejected
    assert.equal(isOrderOwnedByRequester(null, { id: 'usr_1' }, { email: 'test@example.com' }), false);
  });

  test('REGRESSION [P2]: toPlacedOrder formats projected database record without leaking internal columns', () => {
    const rawDbRecord = {
      id: 'PLV-LEAK-TEST',
      order_number: 'PLV-LEAK-TEST',
      date: '30 Oct 2026',
      status: 'Confirmed',
      items: [{ productId: 'saree-1', qty: 1 }],
      subtotal: 5000,
      discount_amount: 500,
      shipping_fee: 100,
      grand_total: 4600,
      payment_method: 'upi',
      customer: { email: 'priya@example.com', firstName: 'Priya' },
      user_id: 'usr_123',
      // Internal or unmodeled database columns that must NOT leak
      internal_fraud_score: 0.02,
      raw_gateway_payload: { token: 'secret_gateway_token' },
      pg_lock_version: 4,
      sys_tenant_id: 'tenant_palluvo_prod',
    };

    const placedOrder = toPlacedOrder(
      rawDbRecord,
      rawDbRecord.customer,
      '30 Oct 2026',
      [],
      0,
      0,
      0,
      0,
      'upi'
    );

    // Standard properties exist
    assert.equal(placedOrder.id, 'PLV-LEAK-TEST');
    assert.equal(placedOrder.orderNumber, 'PLV-LEAK-TEST');
    assert.equal(placedOrder.grandTotal, 4600);
    assert.equal(placedOrder.paymentMethod, 'upi');

    // Sensitive internal columns must not be copied onto PlacedOrder
    assert.equal(placedOrder.internal_fraud_score, undefined);
    assert.equal(placedOrder.raw_gateway_payload, undefined);
    assert.equal(placedOrder.pg_lock_version, undefined);
    assert.equal(placedOrder.sys_tenant_id, undefined);
  });

  test('REGRESSION [P3]: Payment ID matching uses exact equality (.eq) and rejects wildcard injection with "%" and "_"', async () => {
    assert.ok(
      !ORDER_SELECT_FIELDS.includes('*'),
      'ORDER_SELECT_FIELDS must specify explicit safe columns and must not use "*"'
    );
    assert.ok(
      ORDER_SELECT_FIELDS.includes('payment_id'),
      'ORDER_SELECT_FIELDS must include indexed payment_id'
    );

    const calls = {
      select: [],
      eq: [],
      like: [],
      or: [],
    };

    const mockQueryBuilder = {
      select: (fields) => {
        calls.select.push(fields);
        return mockQueryBuilder;
      },
      eq: (col, val) => {
        calls.eq.push({ col, val });
        return mockQueryBuilder;
      },
      like: (col, val) => {
        calls.like.push({ col, val });
        return mockQueryBuilder;
      },
      or: (condition) => {
        calls.or.push(condition);
        return mockQueryBuilder;
      },
      limit: () => mockQueryBuilder,
      maybeSingle: async () => ({
        data: {
          id: 'PLV-WILDCARD-1',
          order_number: 'PLV-WILDCARD-1',
          payment_id: 'pay_test_%_special',
          user_id: null,
          customer: { email: 'priya@example.com' },
        },
        error: null,
      }),
    };

    const mockSupabase = {
      from: (table) => {
        assert.equal(table, 'orders');
        return mockQueryBuilder;
      },
    };

    // Client provides a payment ID containing SQL LIKE wildcards '%' and '_'
    const wildcardPaymentId = 'pay_test_%_special';
    const recovered = await findOwnedExistingOrder({
      supabase: mockSupabase,
      paymentId: wildcardPaymentId,
      user: null,
      validatedCustomer: { email: 'priya@example.com' },
    });

    // 1. Must use exact .eq('payment_id', val)
    assert.ok(
      calls.eq.some((c) => c.col === 'payment_id' && c.val === wildcardPaymentId),
      'Must match payment ID using exact equality .eq(payment_id, ...)'
    );

    // 2. Must NEVER use .like()
    assert.equal(
      calls.like.length,
      0,
      'Must NEVER invoke PostgREST .like() with client-supplied payment ID'
    );

    // 3. Must scope query with requester email predicate
    assert.ok(
      calls.eq.some((c) => c.col === 'customer->>email' && c.val === 'priya@example.com'),
      'Must scope query to requesting customer email'
    );

    // 4. Must return the order when ownership passes
    assert.ok(recovered !== null);
    assert.equal(recovered.id, 'PLV-WILDCARD-1');
  });

  test('REGRESSION [P2]: findOwnedExistingOrder scopes queries with own-order predicate and rejects unowned orders', async () => {
    // DB returns an order belonging to another customer
    const mockSupabaseOtherCustomer = {
      from: () => ({
        select: () => ({
          or: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'PLV-OTHER-1',
                    order_number: 'PLV-OTHER-1',
                    payment_id: 'pay_other_1',
                    user_id: null,
                    customer: { email: 'victim@example.com' },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    };

    // Attacker requests order with victim's payment ID
    const attackerResult = await findOwnedExistingOrder({
      supabase: mockSupabaseOtherCustomer,
      paymentId: 'pay_other_1',
      user: null,
      validatedCustomer: { email: 'attacker@evil.com' },
    });

    assert.equal(
      attackerResult,
      null,
      'findOwnedExistingOrder must strictly return null when order does not belong to requester'
    );
  });

  test('REGRESSION [P3]: escapePostgrestFilterValue properly double-quotes and escapes filter values', () => {
    // 1. Standard string
    assert.equal(escapePostgrestFilterValue('priya@example.com'), '"priya@example.com"');

    // 2. String containing commas (PostgREST list separator)
    assert.equal(
      escapePostgrestFilterValue('a,order_number.eq.PLV-123@x.com'),
      '"a,order_number.eq.PLV-123@x.com"'
    );

    // 3. String containing double quotes and backslashes
    assert.equal(escapePostgrestFilterValue('hello"world\\test'), '"hello\\"world\\\\test"');

    // 4. Non-string defensive fallback
    assert.equal(escapePostgrestFilterValue(null), '""');
  });

  test('REGRESSION [P3]: findOwnedExistingOrder double-quotes operands inside .or() to prevent grammar injection', async () => {
    const orCalls = [];
    const mockSupabase = {
      from: (table) => {
        assert.equal(table, 'orders');
        return {
          select: () => ({
            eq: () => ({
              or: (orFilter) => {
                orCalls.push(orFilter);
                return {
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: {
                        id: 'PLV-COMMAS-1',
                        order_number: 'PLV-COMMAS-1',
                        payment_id: 'pay_comma_test',
                        user_id: 'usr_authenticated_1',
                        customer: { email: 'a,order_number.eq.plv-123@x.com' },
                      },
                      error: null,
                    }),
                  }),
                };
              },
            }),
          }),
        };
      },
    };

    // Customer email containing a comma
    const trickyEmail = 'a,order_number.eq.PLV-123@x.com';
    const result = await findOwnedExistingOrder({
      supabase: mockSupabase,
      paymentId: 'pay_comma_test',
      user: { id: 'usr_authenticated_1' },
      validatedCustomer: { email: trickyEmail },
    });

    assert.ok(result !== null);
    assert.equal(result.id, 'PLV-COMMAS-1');

    // Ensure the .or() filter properly double-quotes the values
    assert.ok(orCalls.length > 0, '.or() must be invoked');
    assert.ok(
      orCalls[0].includes('customer->>email.eq."a,order_number.eq.plv-123@x.com"'),
      'Email with comma must be double-quoted in PostgREST .or() filter to prevent grammar injection'
    );
    assert.ok(
      orCalls[0].includes('user_id.eq."usr_authenticated_1"'),
      'user_id must be double-quoted in PostgREST .or() filter'
    );
  });

  test('REGRESSION [P3]: findOwnedExistingOrder surfaces and logs PostgREST query errors', async () => {
    const errorLog = [];
    const origError = console.error;
    console.error = (...args) => errorLog.push(args.join(' '));

    try {
      const mockSupabaseWithError = {
        from: () => ({
          select: () => ({
            or: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: null,
                    error: { code: 'PGRST100', message: 'Syntax error in filter expression' },
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      const result = await findOwnedExistingOrder({
        supabase: mockSupabaseWithError,
        orderNumber: 'PLV-ERR-1',
        user: null,
        validatedCustomer: { email: 'priya@example.com' },
      });

      assert.equal(result, null, 'Must fail closed to null when query errors');
      assert.ok(
        errorLog.some((log) => log.includes('PostgREST error querying owned existing order')),
        'Must log PostgREST query error to console.error'
      );
    } finally {
      console.error = origError;
    }
  });
});




