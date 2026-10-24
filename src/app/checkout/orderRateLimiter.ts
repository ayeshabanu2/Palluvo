import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const CHECKOUT_FIELD_LIMITS = {
  MAX_ITEMS: 20,
  MAX_QTY_PER_ITEM: 10,
  FIRST_NAME_MIN: 1,
  FIRST_NAME_MAX: 60,
  LAST_NAME_MAX: 60,
  EMAIL_MIN: 3,
  EMAIL_MAX: 254,
  PHONE_MIN: 7,
  PHONE_MAX: 25,
  ADDRESS_MIN: 5,
  ADDRESS_MAX: 300,
  CITY_MIN: 2,
  CITY_MAX: 100,
  STATE_MAX: 100,
  PINCODE_MIN: 4,
  PINCODE_MAX: 12,
  COUPON_MAX: 30,
  PRODUCT_ID_MAX: 50,
  COLOR_MAX: 50,
  BLOUSE_OPTION_ID_MAX: 50,
  BLOUSE_OPTION_NAME_MAX: 100,
} as const;

export const ORDER_RATE_LIMIT_CONFIG = {
  WINDOW_MS: 10 * 60 * 1000, // 10 minutes sliding window
  MAX_ORDERS_PER_IP: 5, // Max 5 orders per 10 minutes per IP
  MAX_ORDERS_PER_EMAIL: 3, // Max 3 orders per 10 minutes per email
  MIN_ORDER_INTERVAL_MS: 5 * 1000, // 5s minimum interval (cooldown) between consecutive orders
  GLOBAL_WINDOW_MS: 60 * 1000, // 1 minute
  MAX_GLOBAL_ORDERS_PER_MINUTE: 30, // Max 30 orders/minute globally (burst / WAF flood protection)
  MAX_TRACKED_ENTRIES: 1000, // Bounded capacity limit to prevent memory/storage exhaustion
  IDEMPOTENCY_WINDOW_MS: 60 * 1000, // 60s duplicate-request deduplication window
} as const;

export interface CheckoutItemRateLimitInput {
  productId: string;
  qty: number;
  selectedColor?: string;
  blouseOptionId?: string;
  blouseOptionName?: string;
}

export interface OrderCustomerRateLimitDetails {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state?: string;
  pincode: string;
}

export interface PlacedOrderRateLimitRecord {
  id: string;
  orderNumber: string;
  date: string;
  status: string;
  items: unknown[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  grandTotal: number;
  paymentMethod: string;
  customer: OrderCustomerRateLimitDetails;
}

interface RateRecord {
  timestamps: number[];
  lastUpdated: number;
}

interface IdempotencyRecord {
  inFlight: boolean;
  order?: any;
  timestamp: number;
}

// In-memory records for single-process fast path
let memoryGlobalTimestamps: number[] = [];
const memoryIpRecords = new Map<string, RateRecord>();
const memoryEmailRecords = new Map<string, RateRecord>();
const memoryIdempotencyRecords = new Map<string, IdempotencyRecord>();

/**
 * Validates customer details against strict length bounds and format requirements.
 */
export function validateCustomerDetails(
  customer: unknown
): { valid: true; customer: OrderCustomerRateLimitDetails } | { valid: false; error: string } {
  if (!customer || typeof customer !== 'object') {
    return { valid: false, error: 'Customer shipping details are required.' };
  }

  const c = customer as Partial<OrderCustomerRateLimitDetails>;

  const firstName = (c.firstName || '').trim();
  if (
    !firstName ||
    firstName.length < CHECKOUT_FIELD_LIMITS.FIRST_NAME_MIN ||
    firstName.length > CHECKOUT_FIELD_LIMITS.FIRST_NAME_MAX
  ) {
    return {
      valid: false,
      error: `First name is required (maximum ${CHECKOUT_FIELD_LIMITS.FIRST_NAME_MAX} characters).`,
    };
  }

  const lastName = (c.lastName || '').trim();
  if (lastName.length > CHECKOUT_FIELD_LIMITS.LAST_NAME_MAX) {
    return {
      valid: false,
      error: `Last name cannot exceed ${CHECKOUT_FIELD_LIMITS.LAST_NAME_MAX} characters.`,
    };
  }

  const email = (c.email || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (
    !email ||
    email.length < CHECKOUT_FIELD_LIMITS.EMAIL_MIN ||
    email.length > CHECKOUT_FIELD_LIMITS.EMAIL_MAX ||
    !emailRegex.test(email)
  ) {
    return {
      valid: false,
      error: `A valid customer email address is required (maximum ${CHECKOUT_FIELD_LIMITS.EMAIL_MAX} characters).`,
    };
  }

  const phone = (c.phone || '').trim();
  if (
    !phone ||
    phone.length < CHECKOUT_FIELD_LIMITS.PHONE_MIN ||
    phone.length > CHECKOUT_FIELD_LIMITS.PHONE_MAX
  ) {
    return {
      valid: false,
      error: `Phone number must be between ${CHECKOUT_FIELD_LIMITS.PHONE_MIN} and ${CHECKOUT_FIELD_LIMITS.PHONE_MAX} characters.`,
    };
  }

  const address = (c.address || '').trim();
  if (
    !address ||
    address.length < CHECKOUT_FIELD_LIMITS.ADDRESS_MIN ||
    address.length > CHECKOUT_FIELD_LIMITS.ADDRESS_MAX
  ) {
    return {
      valid: false,
      error: `Delivery address must be between ${CHECKOUT_FIELD_LIMITS.ADDRESS_MIN} and ${CHECKOUT_FIELD_LIMITS.ADDRESS_MAX} characters.`,
    };
  }

  const city = (c.city || '').trim();
  if (
    !city ||
    city.length < CHECKOUT_FIELD_LIMITS.CITY_MIN ||
    city.length > CHECKOUT_FIELD_LIMITS.CITY_MAX
  ) {
    return {
      valid: false,
      error: `City must be between ${CHECKOUT_FIELD_LIMITS.CITY_MIN} and ${CHECKOUT_FIELD_LIMITS.CITY_MAX} characters.`,
    };
  }

  const state = (c.state || '').trim();
  if (state.length > CHECKOUT_FIELD_LIMITS.STATE_MAX) {
    return {
      valid: false,
      error: `State cannot exceed ${CHECKOUT_FIELD_LIMITS.STATE_MAX} characters.`,
    };
  }

  const pincode = (c.pincode || '').trim();
  if (
    !pincode ||
    pincode.length < CHECKOUT_FIELD_LIMITS.PINCODE_MIN ||
    pincode.length > CHECKOUT_FIELD_LIMITS.PINCODE_MAX
  ) {
    return {
      valid: false,
      error: `Postal PIN code must be between ${CHECKOUT_FIELD_LIMITS.PINCODE_MIN} and ${CHECKOUT_FIELD_LIMITS.PINCODE_MAX} characters.`,
    };
  }

  return {
    valid: true,
    customer: {
      firstName,
      lastName: lastName || undefined,
      email,
      phone,
      address,
      city,
      state: state || undefined,
      pincode,
    },
  };
}

export type CatalogProductRef = {
  id: string;
  blouseOptions?: Array<{ id: string }>;
};

/**
 * Validates checkout items shape, bounds, integer quantities, and catalog references.
 */
export function validateCheckoutItems(
  items: unknown,
  catalog?: CatalogProductRef[] | Set<string> | string[]
): { valid: true; items: CheckoutItemRateLimitInput[] } | { valid: false; error: string } {
  if (!items || !Array.isArray(items)) {
    return { valid: false, error: 'Shopping bag items must be provided as an array.' };
  }
  if (items.length === 0) {
    return { valid: false, error: 'Your shopping bag is empty.' };
  }
  if (items.length > CHECKOUT_FIELD_LIMITS.MAX_ITEMS) {
    return { valid: false, error: `Shopping bag cannot exceed ${CHECKOUT_FIELD_LIMITS.MAX_ITEMS} distinct items.` };
  }

  const validatedItems: CheckoutItemRateLimitInput[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== 'object') {
      return { valid: false, error: `Invalid item format at index ${i}.` };
    }

    if (
      typeof item.productId !== 'string' ||
      !item.productId.trim() ||
      item.productId.length > CHECKOUT_FIELD_LIMITS.PRODUCT_ID_MAX
    ) {
      return { valid: false, error: `Invalid product ID at index ${i}.` };
    }

    if (
      typeof item.qty !== 'number' ||
      !Number.isFinite(item.qty) ||
      !Number.isInteger(item.qty) ||
      item.qty < 1 ||
      item.qty > CHECKOUT_FIELD_LIMITS.MAX_QTY_PER_ITEM
    ) {
      return {
        valid: false,
        error: `Quantity for item ${item.productId} must be an integer between 1 and ${CHECKOUT_FIELD_LIMITS.MAX_QTY_PER_ITEM}.`,
      };
    }
    const safeQty = item.qty;

    if (item.selectedColor !== undefined && item.selectedColor !== null) {
      if (typeof item.selectedColor !== 'string' || item.selectedColor.length > CHECKOUT_FIELD_LIMITS.COLOR_MAX) {
        return { valid: false, error: `Invalid color selection for item ${item.productId}.` };
      }
    }

    if (item.blouseOptionId !== undefined && item.blouseOptionId !== null) {
      if (typeof item.blouseOptionId !== 'string' || item.blouseOptionId.length > CHECKOUT_FIELD_LIMITS.BLOUSE_OPTION_ID_MAX) {
        return { valid: false, error: `Invalid blouse option ID for item ${item.productId}.` };
      }
    }

    if (item.blouseOptionName !== undefined && item.blouseOptionName !== null) {
      if (typeof item.blouseOptionName !== 'string' || item.blouseOptionName.length > CHECKOUT_FIELD_LIMITS.BLOUSE_OPTION_NAME_MAX) {
        return { valid: false, error: `Invalid blouse option name for item ${item.productId}.` };
      }
    }

    // Catalog verification if catalog provided
    if (catalog) {
      if (Array.isArray(catalog)) {
        if (catalog.length > 0 && typeof catalog[0] === 'string') {
          // String array of valid product IDs
          if (!(catalog as string[]).includes(item.productId)) {
            return { valid: false, error: `Invalid product reference: ${item.productId}` };
          }
        } else {
          // CatalogProductRef array
          const product = (catalog as CatalogProductRef[]).find((p) => p.id === item.productId);
          if (!product) {
            return { valid: false, error: `Invalid product reference: ${item.productId}` };
          }
          if (item.blouseOptionId && product.blouseOptions) {
            const option = product.blouseOptions.find((b) => b.id === item.blouseOptionId);
            if (!option) {
              return { valid: false, error: `Invalid blouse option ${item.blouseOptionId} for saree ${item.productId}` };
            }
          }
        }
      } else if (catalog instanceof Set) {
        if (!catalog.has(item.productId)) {
          return { valid: false, error: `Invalid product reference: ${item.productId}` };
        }
      }
    }

    validatedItems.push({
      productId: item.productId.trim(),
      qty: safeQty,
      selectedColor: item.selectedColor ? String(item.selectedColor).trim() : undefined,
      blouseOptionId: item.blouseOptionId ? String(item.blouseOptionId).trim() : undefined,
      blouseOptionName: item.blouseOptionName ? String(item.blouseOptionName).trim() : undefined,
    });
  }

  return { valid: true, items: validatedItems };
}

/**
 * Validates coupon code format and length bounds.
 */
export function validateCouponCode(
  couponCode?: string
): { valid: true; couponCode?: string } | { valid: false; error: string } {
  if (couponCode === undefined || couponCode === null || couponCode === '') {
    return { valid: true };
  }

  if (typeof couponCode !== 'string') {
    return { valid: false, error: 'Coupon code must be a string.' };
  }

  const cleanCoupon = couponCode.trim();
  if (cleanCoupon.length > CHECKOUT_FIELD_LIMITS.COUPON_MAX) {
    return { valid: false, error: `Coupon code cannot exceed ${CHECKOUT_FIELD_LIMITS.COUPON_MAX} characters.` };
  }

  const couponRegex = /^[A-Za-z0-9_-]{1,30}$/;
  if (!couponRegex.test(cleanCoupon)) {
    return { valid: false, error: 'Invalid coupon code format. Only letters, numbers, and hyphens are allowed.' };
  }

  return { valid: true, couponCode: cleanCoupon.toUpperCase() };
}

/**
 * Computes a deterministic SHA-256 fingerprint for an order.
 * Used for idempotency validation and duplicate-request deduplication.
 */
export function computeOrderFingerprint(
  customer: OrderCustomerRateLimitDetails,
  items: CheckoutItemRateLimitInput[],
  grandTotal: number,
  paymentMethod: string = 'cod'
): string {
  const canonicalEmail = (customer.email || '').toLowerCase().trim();
  const canonicalPhone = (customer.phone || '').trim();
  const canonicalAddress = (customer.address || '').trim().toLowerCase();
  const canonicalPincode = (customer.pincode || '').trim();

  const sortedItems = [...items].sort((a, b) => a.productId.localeCompare(b.productId));
  const itemsDigest = sortedItems
    .map((i) => `${i.productId}:${i.qty}:${i.selectedColor || ''}:${i.blouseOptionId || ''}`)
    .join(';');

  const raw = `${canonicalEmail}|${canonicalPhone}|${canonicalAddress}|${canonicalPincode}|${itemsDigest}|${grandTotal}|${paymentMethod}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Bounds the capacity of tracked records to prevent memory exhaustion from rotating identifiers.
 */
function boundCapacity<V extends { lastUpdated?: number; timestamp?: number }>(
  map: Map<string, V>,
  maxSize: number
): void {
  if (map.size <= maxSize) return;
  const entries = Array.from(map.entries());
  entries.sort((a, b) => {
    const timeA = a[1].lastUpdated ?? a[1].timestamp ?? 0;
    const timeB = b[1].lastUpdated ?? b[1].timestamp ?? 0;
    return timeA - timeB;
  });
  const toDelete = entries.slice(0, map.size - maxSize);
  for (const [key] of toDelete) {
    map.delete(key);
  }
}

export interface OrderThrottleResult {
  allowed: boolean;
  error?: string;
  isDuplicate?: boolean;
  existingOrder?: any;
}

/**
 * Synchronizes with a cross-process lock file in os.tmpdir() when accessible,
 * falling back gracefully to in-memory state in serverless / restricted environments.
 */
function withFileLock<T>(fn: () => T): T {
  const lockPath = path.join(os.tmpdir(), 'palluvo_order_throttle.lock');
  let fd: number | null = null;
  const start = Date.now();
  const maxWaitMs = 500;

  while (Date.now() - start < maxWaitMs) {
    try {
      fd = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, time: Date.now() }));
      break;
    } catch (err: any) {
      if (err && err.code === 'EEXIST') {
        try {
          const stat = fs.statSync(lockPath);
          if (Date.now() - stat.mtimeMs > 5000) {
            try { fs.unlinkSync(lockPath); } catch {}
          }
        } catch {}
      } else {
        break;
      }
    }
  }

  try {
    return fn();
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch {}
      try { fs.unlinkSync(lockPath); } catch {}
    }
  }
}

/**
 * Checks rate limits and acquires an in-flight order slot for a given IP, Email, and order fingerprint.
 * Enforces:
 * 1. Duplicate-request detection (returns existing order if placed within 60s or rejects concurrent duplicate).
 * 2. Global burst throttling across all callers.
 * 3. Per-IP sliding window and 5s cooldown.
 * 4. Per-Email sliding window and 5s cooldown.
 */
export function checkAndAcquireOrderSlot(
  {
    ip,
    email,
    fingerprint,
    now = Date.now(),
  }: {
    ip: string;
    email: string;
    fingerprint?: string;
    now?: number;
  }
): OrderThrottleResult {
  return withFileLock(() => {
    // 1. Idempotency Check
    if (fingerprint) {
      const existing = memoryIdempotencyRecords.get(fingerprint);
      if (existing && now - existing.timestamp < ORDER_RATE_LIMIT_CONFIG.IDEMPOTENCY_WINDOW_MS) {
        if (existing.inFlight) {
          return {
            allowed: false,
            isDuplicate: true,
            error: 'An order with identical items and delivery details is currently being processed. Please wait a moment.',
          };
        }
        if (existing.order) {
          return {
            allowed: true,
            isDuplicate: true,
            existingOrder: existing.order,
          };
        }
      }
    }

    // 2. Global Flood Check
    memoryGlobalTimestamps = memoryGlobalTimestamps.filter(
      (t) => now - t < ORDER_RATE_LIMIT_CONFIG.GLOBAL_WINDOW_MS
    );
    if (memoryGlobalTimestamps.length >= ORDER_RATE_LIMIT_CONFIG.MAX_GLOBAL_ORDERS_PER_MINUTE) {
      return {
        allowed: false,
        error: 'Order processing service is currently experiencing unusually high traffic. Please try again in one minute.',
      };
    }

    // 3. IP Rate Limit & Cooldown Check
    const cleanIp = (ip || '').trim();
    if (cleanIp && cleanIp !== 'unknown') {
      let ipRecord = memoryIpRecords.get(cleanIp);
      if (ipRecord) {
        ipRecord.timestamps = ipRecord.timestamps.filter(
          (t) => now - t < ORDER_RATE_LIMIT_CONFIG.WINDOW_MS
        );
        // Cooldown
        if (now - ipRecord.lastUpdated < ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS) {
          return {
            allowed: false,
            error: 'Please wait a few seconds before placing another order.',
          };
        }
        // Limit per window
        if (ipRecord.timestamps.length >= ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_IP) {
          return {
            allowed: false,
            error: 'Too many orders have been placed from your connection. Please wait 10 minutes before attempting another order.',
          };
        }
      }
    }

    // 4. Email Rate Limit & Cooldown Check
    const cleanEmail = (email || '').toLowerCase().trim();
    if (cleanEmail) {
      let emailRecord = memoryEmailRecords.get(cleanEmail);
      if (emailRecord) {
        emailRecord.timestamps = emailRecord.timestamps.filter(
          (t) => now - t < ORDER_RATE_LIMIT_CONFIG.WINDOW_MS
        );
        // Cooldown
        if (now - emailRecord.lastUpdated < ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS) {
          return {
            allowed: false,
            error: 'Please wait a few seconds before placing another order.',
          };
        }
        // Limit per window
        if (emailRecord.timestamps.length >= ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_EMAIL) {
          return {
            allowed: false,
            error: 'Maximum order placement attempts reached for this email address. Please try again in 10 minutes.',
          };
        }
      }
    }

    // 5. Reserve slot and mark in-flight
    memoryGlobalTimestamps.push(now);

    if (cleanIp && cleanIp !== 'unknown') {
      const rec = memoryIpRecords.get(cleanIp) || { timestamps: [], lastUpdated: 0 };
      rec.timestamps.push(now);
      rec.lastUpdated = now;
      memoryIpRecords.set(cleanIp, rec);
      boundCapacity(memoryIpRecords, ORDER_RATE_LIMIT_CONFIG.MAX_TRACKED_ENTRIES);
    }

    if (cleanEmail) {
      const rec = memoryEmailRecords.get(cleanEmail) || { timestamps: [], lastUpdated: 0 };
      rec.timestamps.push(now);
      rec.lastUpdated = now;
      memoryEmailRecords.set(cleanEmail, rec);
      boundCapacity(memoryEmailRecords, ORDER_RATE_LIMIT_CONFIG.MAX_TRACKED_ENTRIES);
    }

    if (fingerprint) {
      memoryIdempotencyRecords.set(fingerprint, {
        inFlight: true,
        timestamp: now,
      });
      boundCapacity(memoryIdempotencyRecords, ORDER_RATE_LIMIT_CONFIG.MAX_TRACKED_ENTRIES);
    }

    return { allowed: true };
  });
}

/**
 * Finalizes an order slot after order placement attempt completes.
 * If successful, caches the resulting order for the idempotency window.
 * If failed, deletes the fingerprint so the user can re-try after correcting form issues.
 */
export function finalizeOrderSlot(
  fingerprint: string,
  order?: any,
  now: number = Date.now()
): void {
  withFileLock(() => {
    if (order) {
      memoryIdempotencyRecords.set(fingerprint, {
        inFlight: false,
        order,
        timestamp: now,
      });
    } else {
      memoryIdempotencyRecords.delete(fingerprint);
    }
  });
}

/**
 * Testing & maintenance helper: completely resets tracked order throttles and idempotency caches.
 */
export function resetOrderRateLimiter(): void {
  withFileLock(() => {
    memoryGlobalTimestamps = [];
    memoryIpRecords.clear();
    memoryEmailRecords.clear();
    memoryIdempotencyRecords.clear();
  });
}
