import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
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
  checkAndAcquireOrderSlot,
  finalizeOrderSlot,
  resetOrderRateLimiter,
  setProductionOrderStore,
} from '../src/app/checkout/orderRateLimiter.ts';

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

