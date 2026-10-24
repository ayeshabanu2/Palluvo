import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECKOUT_FIELD_LIMITS,
  ORDER_RATE_LIMIT_CONFIG,
  validateCustomerDetails,
  validateCheckoutItems,
  validateCouponCode,
  computeOrderFingerprint,
  checkAndAcquireOrderSlot,
  finalizeOrderSlot,
  resetOrderRateLimiter,
} from '../src/app/checkout/orderRateLimiter.ts';

const mockCatalog = [
  {
    id: 'royal-banarasi-silk-saree',
    blouseOptions: [
      { id: 'unstitched-blouse' },
      { id: 'custom-stitched-blouse' },
    ],
  },
  {
    id: 'kanjivaram-heritage-silk-saree',
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
  beforeEach(() => {
    resetOrderRateLimiter();
  });

  test('enforces minimum cooldown interval between consecutive orders from the same IP', () => {
    const baseNow = Date.now();
    const testIp = '198.51.100.44';
    const testEmail = 'shopper1@example.com';

    // 1. First order succeeds
    const firstRes = checkAndAcquireOrderSlot({
      ip: testIp,
      email: testEmail,
      now: baseNow,
    });
    assert.equal(firstRes.allowed, true);

    // 2. Immediate second order within 5s cooldown fails
    const secondRes = checkAndAcquireOrderSlot({
      ip: testIp,
      email: 'another.email@example.com',
      now: baseNow + 1000, // 1s later
    });
    assert.equal(secondRes.allowed, false);
    assert.match(secondRes.error, /Please wait a few seconds before placing another order/);

    // 3. Order after cooldown (> 5s) passes
    const thirdRes = checkAndAcquireOrderSlot({
      ip: testIp,
      email: 'another.email@example.com',
      now: baseNow + ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100,
    });
    assert.equal(thirdRes.allowed, true);
  });

  test('enforces maximum orders per 10-minute sliding window per IP', () => {
    const baseNow = Date.now();
    const testIp = '198.51.100.55';

    for (let i = 0; i < ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_IP; i++) {
      const res = checkAndAcquireOrderSlot({
        ip: testIp,
        email: `distinct.user.${i}@example.com`,
        now: baseNow + i * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
      });
      assert.equal(res.allowed, true, `Order ${i + 1} should be allowed`);
    }

    // Sixth order exceeds IP window limit
    const exceededRes = checkAndAcquireOrderSlot({
      ip: testIp,
      email: 'exceeded.user@example.com',
      now: baseNow + ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_IP * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
    });
    assert.equal(exceededRes.allowed, false);
    assert.match(exceededRes.error, /Too many orders have been placed from your connection/);
  });

  test('enforces maximum orders per 10-minute sliding window per Email', () => {
    const baseNow = Date.now();
    const testEmail = 'shopper.family@example.com';

    for (let i = 0; i < ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_EMAIL; i++) {
      const res = checkAndAcquireOrderSlot({
        ip: `198.51.100.${10 + i}`,
        email: testEmail,
        now: baseNow + i * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
      });
      assert.equal(res.allowed, true, `Email order ${i + 1} should be allowed`);
    }

    // Fourth order exceeds Email window limit
    const exceededRes = checkAndAcquireOrderSlot({
      ip: '198.51.100.99',
      email: testEmail,
      now: baseNow + ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_EMAIL * (ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS + 100),
    });
    assert.equal(exceededRes.allowed, false);
    assert.match(exceededRes.error, /Maximum order placement attempts reached for this email/);
  });

  test('enforces global distributed burst throttle against automated flood attacks', () => {
    const baseNow = Date.now();

    for (let i = 0; i < ORDER_RATE_LIMIT_CONFIG.MAX_GLOBAL_ORDERS_PER_MINUTE; i++) {
      const res = checkAndAcquireOrderSlot({
        ip: `192.0.2.${i}`,
        email: `flood.${i}@domain.com`,
        now: baseNow + i * 50,
      });
      assert.equal(res.allowed, true);
    }

    // 31st order in same minute is throttled globally
    const floodRes = checkAndAcquireOrderSlot({
      ip: '192.0.2.250',
      email: 'flood.exceeded@domain.com',
      now: baseNow + 2000,
    });
    assert.equal(floodRes.allowed, false);
    assert.match(floodRes.error, /unusually high traffic/);
  });
});

describe('Checkout Idempotency & Duplicate-Request Protection [P1]', () => {
  beforeEach(() => {
    resetOrderRateLimiter();
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

  test('blocks concurrent in-flight duplicate requests', () => {
    const baseNow = Date.now();
    const fp = computeOrderFingerprint(validCustomer, validItems, 14999, 'cod');

    const first = checkAndAcquireOrderSlot({
      ip: '198.51.100.1',
      email: validCustomer.email,
      fingerprint: fp,
      now: baseNow,
    });
    assert.equal(first.allowed, true);

    // Second concurrent call with same fingerprint while in-flight
    const concurrent = checkAndAcquireOrderSlot({
      ip: '198.51.100.1',
      email: validCustomer.email,
      fingerprint: fp,
      now: baseNow + 100,
    });
    assert.equal(concurrent.allowed, false);
    assert.equal(concurrent.isDuplicate, true);
    assert.match(concurrent.error, /currently being processed/);
  });

  test('returns existing order on repeated identical request within deduplication window', () => {
    const baseNow = Date.now();
    const fp = computeOrderFingerprint(validCustomer, validItems, 14999, 'cod');

    // 1. Acquire slot
    checkAndAcquireOrderSlot({
      ip: '198.51.100.1',
      email: validCustomer.email,
      fingerprint: fp,
      now: baseNow,
    });

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
    finalizeOrderSlot(fp, mockOrder, baseNow);

    // 3. Repeated call within deduplication window returns cached order
    const repeatCall = checkAndAcquireOrderSlot({
      ip: '198.51.100.1',
      email: validCustomer.email,
      fingerprint: fp,
      now: baseNow + 5000,
    });

    assert.equal(repeatCall.allowed, true);
    assert.equal(repeatCall.isDuplicate, true);
    assert.deepEqual(repeatCall.existingOrder, mockOrder);
  });
});
