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
  MAX_GLOBAL_ORDERS_PER_MINUTE: 30, // Max 30 orders/minute globally (burst / flood protection)
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

export interface OrderThrottleResult {
  allowed: boolean;
  error?: string;
  isDuplicate?: boolean;
  slotAcquired?: boolean;
  existingOrder?: any;
}

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
          if (!(catalog as string[]).includes(item.productId)) {
            return { valid: false, error: `Invalid product reference: ${item.productId}` };
          }
        } else {
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
 * Compares two lists of cart/order items as multisets of normalized variant tuples.
 * Compares productId, qty, selectedColor, and blouseOptionId, strictly consuming matches.
 */
export function isCanonicalItemMultisetEqual(
  itemsA: unknown,
  itemsB: unknown
): boolean {
  if (!Array.isArray(itemsA) || !Array.isArray(itemsB) || itemsA.length !== itemsB.length) {
    return false;
  }

  const formatItem = (item: any) =>
    `${(item?.productId || '').trim()}::${Number(item?.qty) || 0}::${(item?.selectedColor || '').trim().toLowerCase()}::${(item?.blouseOptionId || '').trim().toLowerCase()}`;

  const counts = new Map<string, number>();
  for (const item of itemsA) {
    const key = formatItem(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  for (const item of itemsB) {
    const key = formatItem(item);
    const count = counts.get(key);
    if (!count) return false;
    if (count === 1) {
      counts.delete(key);
    } else {
      counts.set(key, count - 1);
    }
  }

  return counts.size === 0;
}

/**
 * Computes a deterministic SHA-256 fingerprint for an order.
 * Used for idempotency validation and duplicate-request deduplication.
 * Canonicalizes customer fields and sorts items by full variant tuple (productId, color, blouse option, qty).
 */
export function computeOrderFingerprint(
  customer: OrderCustomerRateLimitDetails,
  items: CheckoutItemRateLimitInput[],
  grandTotal: number,
  paymentMethod: string = 'cod'
): string {
  const canonicalEmail = (customer?.email || '').toLowerCase().trim();
  const canonicalPhone = (customer?.phone || '').trim();
  const canonicalAddress = (customer?.address || '').trim().toLowerCase();
  const canonicalPincode = (customer?.pincode || '').trim();

  const sortedItems = [...items].sort((a, b) => {
    const keyA = `${a.productId}::${(a.selectedColor || '').toLowerCase()}::${(a.blouseOptionId || '').toLowerCase()}::${a.qty}`;
    const keyB = `${b.productId}::${(b.selectedColor || '').toLowerCase()}::${(b.blouseOptionId || '').toLowerCase()}::${b.qty}`;
    return keyA.localeCompare(keyB);
  });
  const itemsDigest = sortedItems
    .map((i) => `${i.productId}:${i.qty}:${(i.selectedColor || '').toLowerCase()}:${(i.blouseOptionId || '').toLowerCase()}`)
    .join(';');

  const raw = `${canonicalEmail}|${canonicalPhone}|${canonicalAddress}|${canonicalPincode}|${itemsDigest}|${grandTotal}|${paymentMethod}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Secure identifier hashing for rate limit keys.
 */
export function hashOrderRateIdentifier(identifier: string): string {
  const pepper =
    process.env.RATE_LIMIT_PEPPER ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    'palluvo-order-rate-limiter-secret';
  return 'digest:sha256:' + crypto.createHmac('sha256', pepper).update(identifier.trim().toLowerCase()).digest('hex');
}

export interface OrderRateLimitStore {
  checkAndAcquire(params: {
    ip: string;
    email: string;
    fingerprint?: string;
    now?: number;
  }): Promise<OrderThrottleResult>;
  finalize(fingerprint: string, order?: any, now?: number): Promise<void>;
  clear?(): Promise<void> | void;
  pruneExpiredEntries?(now?: number): Promise<number>;
}

/**
 * Production Database RPC Order Rate Limit Store.
 * Calls Supabase PostgreSQL functions `acquire_order_slot` and `finalize_order_slot`
 * using trusted service_role privilege.
 * Enforces atomic multi-key row locking, sliding windows, burst cooldown,
 * idempotency reservations, and fails closed on query failure.
 */
export class DatabaseRpcOrderRateLimitStore implements OrderRateLimitStore {
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

  async checkAndAcquire(params: {
    ip: string;
    email: string;
    fingerprint?: string;
    now?: number;
  }): Promise<OrderThrottleResult> {
    try {
      const supabase = await this.getClient();
      if (!supabase) {
        return {
          allowed: false,
          error: 'Order processing service is currently unavailable. Please contact customer support.',
        };
      }

      const ipKey = params.ip && params.ip !== 'unknown' ? hashOrderRateIdentifier(`ip:${params.ip}`) : '';
      const emailKey = params.email ? hashOrderRateIdentifier(`email:${params.email}`) : '';

      const { data, error } = await supabase.rpc('acquire_order_slot', {
        p_ip_key: ipKey,
        p_email_key: emailKey,
        p_fingerprint: params.fingerprint || null,
        p_window_ms: ORDER_RATE_LIMIT_CONFIG.WINDOW_MS,
        p_max_ip: ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_IP,
        p_max_email: ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_EMAIL,
        p_cooldown_ms: ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS,
        p_global_window_ms: ORDER_RATE_LIMIT_CONFIG.GLOBAL_WINDOW_MS,
        p_max_global: ORDER_RATE_LIMIT_CONFIG.MAX_GLOBAL_ORDERS_PER_MINUTE,
        p_idempotency_window_ms: ORDER_RATE_LIMIT_CONFIG.IDEMPOTENCY_WINDOW_MS,
        p_max_store_size: ORDER_RATE_LIMIT_CONFIG.MAX_TRACKED_ENTRIES,
      });

      if (error) {
        console.error('[DatabaseRpcOrderRateLimitStore] RPC error:', error);
        return {
          allowed: false,
          error: 'Unable to verify order rate limits. Please try again in a few moments.',
        };
      }

      if (data && typeof data === 'object') {
        return {
          allowed: Boolean(data.allowed),
          error: data.error,
          isDuplicate: Boolean(data.isDuplicate),
          slotAcquired: Boolean(data.slotAcquired),
          existingOrder: data.existingOrder,
        };
      }

      return {
        allowed: false,
        error: 'Unable to process order slot check. Please try again.',
      };
    } catch (err) {
      console.error('[DatabaseRpcOrderRateLimitStore] Unexpected exception:', err);
      return {
        allowed: false,
        error: 'Order verification service encountered an unexpected error. Please try again shortly.',
      };
    }
  }

  async finalize(fingerprint: string, order?: any): Promise<void> {
    try {
      const supabase = await this.getClient();
      if (!supabase) return;

      await supabase.rpc('finalize_order_slot', {
        p_fingerprint: fingerprint,
        p_order_data: order || null,
        p_idempotency_window_ms: ORDER_RATE_LIMIT_CONFIG.IDEMPOTENCY_WINDOW_MS,
      });
    } catch (err) {
      console.error('[DatabaseRpcOrderRateLimitStore] finalize exception:', err);
    }
  }

  async pruneExpiredEntries(): Promise<number> {
    try {
      const supabase = await this.getClient();
      if (!supabase) return 0;
      const { data } = await supabase.rpc('prune_expired_order_rate_limits');
      return typeof data === 'number' ? data : 0;
    } catch {
      return 0;
    }
  }
}

interface StoredRateRecord {
  timestamps: number[];
  lastUpdated: number;
}

interface StoredIdempotencyRecord {
  inFlight: boolean;
  order?: any;
  timestamp: number;
}

interface PersistentSharedState {
  globalTimestamps: number[];
  ipRecords: Record<string, StoredRateRecord>;
  emailRecords: Record<string, StoredRateRecord>;
  idempotencyRecords: Record<string, StoredIdempotencyRecord>;
}

/**
 * Cross-Process File-Backed Atomic Rate Limit Store.
 * Backs order rate limits and idempotency across processes and worker threads
 * when database is unavailable (e.g. local dev, unit tests, offline).
 * Persists and reads state from disk under cross-process file locks.
 */
export class CrossProcessOrderRateLimitStore implements OrderRateLimitStore {
  readonly storeFilePath: string;
  readonly lockFilePath: string;

  constructor(baseDir?: string) {
    const dir = baseDir || os.tmpdir();
    this.storeFilePath = path.join(dir, 'palluvo_order_throttle_state.json');
    this.lockFilePath = path.join(dir, 'palluvo_order_throttle_state.lock');
  }

  private withLock<T>(fn: () => T): T {
    let fd: number | null = null;
    const start = Date.now();
    const maxWaitMs = 1500;

    while (Date.now() - start < maxWaitMs) {
      try {
        fd = fs.openSync(this.lockFilePath, 'wx');
        fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, time: Date.now() }));
        break;
      } catch (err: any) {
        if (err && err.code === 'EEXIST') {
          try {
            const stat = fs.statSync(this.lockFilePath);
            if (Date.now() - stat.mtimeMs > 5000) {
              try { fs.unlinkSync(this.lockFilePath); } catch {}
            }
          } catch {}
          // Pause briefly before retrying
          const pauseUntil = Date.now() + 5 + Math.floor(Math.random() * 5);
          while (Date.now() < pauseUntil) {}
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
        try { fs.unlinkSync(this.lockFilePath); } catch {}
      }
    }
  }

  private readState(): PersistentSharedState {
    try {
      if (fs.existsSync(this.storeFilePath)) {
        const raw = fs.readFileSync(this.storeFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          globalTimestamps: Array.isArray(parsed?.globalTimestamps) ? parsed.globalTimestamps : [],
          ipRecords: parsed?.ipRecords && typeof parsed.ipRecords === 'object' ? parsed.ipRecords : {},
          emailRecords: parsed?.emailRecords && typeof parsed.emailRecords === 'object' ? parsed.emailRecords : {},
          idempotencyRecords:
            parsed?.idempotencyRecords && typeof parsed.idempotencyRecords === 'object' ? parsed.idempotencyRecords : {},
        };
      }
    } catch {}
    return {
      globalTimestamps: [],
      ipRecords: {},
      emailRecords: {},
      idempotencyRecords: {},
    };
  }

  private writeState(state: PersistentSharedState): void {
    const tmpPath = `${this.storeFilePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(state), 'utf8');
    fs.renameSync(tmpPath, this.storeFilePath);
  }

  async checkAndAcquire(params: {
    ip: string;
    email: string;
    fingerprint?: string;
    now?: number;
  }): Promise<OrderThrottleResult> {
    const now = params.now || Date.now();

    return this.withLock(() => {
      const state = this.readState();

      // 1. Idempotency Check
      if (params.fingerprint) {
        const existing = state.idempotencyRecords[params.fingerprint];
        if (existing && now - existing.timestamp < ORDER_RATE_LIMIT_CONFIG.IDEMPOTENCY_WINDOW_MS) {
          if (existing.inFlight) {
            return {
              allowed: false,
              isDuplicate: true,
              slotAcquired: false,
              error: 'An order with identical items and delivery details is currently being processed. Please wait a moment.',
            };
          }
          if (existing.order) {
            return {
              allowed: true,
              isDuplicate: true,
              slotAcquired: false,
              existingOrder: existing.order,
            };
          }
        }
      }

      // 2. Global Flood Check
      state.globalTimestamps = state.globalTimestamps.filter(
        (t) => now - t < ORDER_RATE_LIMIT_CONFIG.GLOBAL_WINDOW_MS
      );
      if (state.globalTimestamps.length >= ORDER_RATE_LIMIT_CONFIG.MAX_GLOBAL_ORDERS_PER_MINUTE) {
        return {
          allowed: false,
          slotAcquired: false,
          error: 'Order processing service is currently experiencing unusually high traffic. Please try again in one minute.',
        };
      }

      // 3. IP Rate Limit & Cooldown Check
      const cleanIp = (params.ip || '').trim();
      if (cleanIp && cleanIp !== 'unknown') {
        const ipRecord = state.ipRecords[cleanIp];
        if (ipRecord) {
          ipRecord.timestamps = ipRecord.timestamps.filter(
            (t) => now - t < ORDER_RATE_LIMIT_CONFIG.WINDOW_MS
          );
          if (now - ipRecord.lastUpdated < ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS) {
            return {
              allowed: false,
              slotAcquired: false,
              error: 'Please wait a few seconds before placing another order.',
            };
          }
          if (ipRecord.timestamps.length >= ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_IP) {
            return {
              allowed: false,
              slotAcquired: false,
              error: 'Too many orders have been placed from your connection. Please wait 10 minutes before attempting another order.',
            };
          }
        }
      }

      // 4. Email Rate Limit & Cooldown Check
      const cleanEmail = (params.email || '').toLowerCase().trim();
      if (cleanEmail) {
        const emailRecord = state.emailRecords[cleanEmail];
        if (emailRecord) {
          emailRecord.timestamps = emailRecord.timestamps.filter(
            (t) => now - t < ORDER_RATE_LIMIT_CONFIG.WINDOW_MS
          );
          if (now - emailRecord.lastUpdated < ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS) {
            return {
              allowed: false,
              slotAcquired: false,
              error: 'Please wait a few seconds before placing another order.',
            };
          }
          if (emailRecord.timestamps.length >= ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_EMAIL) {
            return {
              allowed: false,
              slotAcquired: false,
              error: 'Maximum order placement attempts reached for this email address. Please try again in 10 minutes.',
            };
          }
        }
      }

      // 5. Reserve slot atomically
      state.globalTimestamps.push(now);

      if (cleanIp && cleanIp !== 'unknown') {
        const rec = state.ipRecords[cleanIp] || { timestamps: [], lastUpdated: 0 };
        rec.timestamps = (rec.timestamps || []).filter((t) => now - t < ORDER_RATE_LIMIT_CONFIG.WINDOW_MS);
        rec.timestamps.push(now);
        rec.lastUpdated = now;
        state.ipRecords[cleanIp] = rec;
      }

      if (cleanEmail) {
        const rec = state.emailRecords[cleanEmail] || { timestamps: [], lastUpdated: 0 };
        rec.timestamps = (rec.timestamps || []).filter((t) => now - t < ORDER_RATE_LIMIT_CONFIG.WINDOW_MS);
        rec.timestamps.push(now);
        rec.lastUpdated = now;
        state.emailRecords[cleanEmail] = rec;
      }

      if (params.fingerprint) {
        state.idempotencyRecords[params.fingerprint] = {
          inFlight: true,
          timestamp: now,
        };
      }

      this.writeState(state);
      return { allowed: true, isDuplicate: false, slotAcquired: true };
    });
  }

  async finalize(fingerprint: string, order?: any, now: number = Date.now()): Promise<void> {
    return this.withLock(() => {
      const state = this.readState();
      if (order) {
        state.idempotencyRecords[fingerprint] = {
          inFlight: false,
          order,
          timestamp: now,
        };
      } else {
        // Only delete if currently in_flight! Preserve any completed cached order!
        const existing = state.idempotencyRecords[fingerprint];
        if (existing && existing.inFlight) {
          delete state.idempotencyRecords[fingerprint];
        }
      }
      this.writeState(state);
    });
  }

  async clear(): Promise<void> {
    return this.withLock(() => {
      try {
        if (fs.existsSync(this.storeFilePath)) {
          fs.unlinkSync(this.storeFilePath);
        }
      } catch {}
    });
  }
}

/**
 * Fail-closed store used when production environment is misconfigured
 * (e.g., in production without Supabase service-role credentials, or when credentials are missing).
 * Strictly prevents instance-local file fallback in production serverless environments.
 */
export class MisconfiguredOrderRateLimitStore implements OrderRateLimitStore {
  readonly reason: string;

  constructor(reason: string = 'Service role credentials missing in production environment.') {
    this.reason = reason;
  }

  async checkAndAcquire(): Promise<OrderThrottleResult> {
    console.error(
      `[OrderRateLimiter] Configuration error: ${this.reason}. Failing closed to prevent distributed rate limit bypass.`
    );
    return {
      allowed: false,
      slotAcquired: false,
      error: 'Order processing service is temporarily unavailable due to a server configuration issue. Please contact customer support.',
    };
  }

  async finalize(): Promise<void> {}
  async clear(): Promise<void> {}
  async pruneExpiredEntries(): Promise<number> {
    return 0;
  }
}

export function checkSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  return Boolean(url && !url.includes('placeholder'));
}

export function checkSupabaseServiceRoleConfigured(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  return Boolean(key && !key.includes('placeholder'));
}

export function createProductionOrderRateLimitStore(): OrderRateLimitStore {
  const isSupabase = checkSupabaseConfigured();
  const hasServiceRole = checkSupabaseServiceRoleConfigured();
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!isSupabase || !hasServiceRole) {
      return new MisconfiguredOrderRateLimitStore(
        'Database RPC store is required in production environment, but Supabase credentials or service-role key are missing'
      );
    }
    return new DatabaseRpcOrderRateLimitStore();
  }

  // Non-production (development / test)
  if (isSupabase) {
    if (!hasServiceRole) {
      return new MisconfiguredOrderRateLimitStore(
        'Supabase is configured in test/dev but service-role key is missing'
      );
    }
    return new DatabaseRpcOrderRateLimitStore();
  }

  // Local development / test fallback only when Supabase is completely unconfigured
  return new CrossProcessOrderRateLimitStore();
}

let activeOrderStore: OrderRateLimitStore | null = null;

export function getProductionOrderStore(): OrderRateLimitStore {
  if (!activeOrderStore) {
    activeOrderStore = createProductionOrderRateLimitStore();
  }
  return activeOrderStore;
}

export function setProductionOrderStore(store: OrderRateLimitStore | null): void {
  activeOrderStore = store;
}

/**
 * Checks rate limits and acquires an in-flight order slot for a given IP, Email, and order fingerprint.
 * Returns slotAcquired = true ONLY when this call genuinely reserved the slot.
 */
export async function checkAndAcquireOrderSlot(params: {
  ip: string;
  email: string;
  fingerprint?: string;
  now?: number;
}): Promise<OrderThrottleResult> {
  return await getProductionOrderStore().checkAndAcquire(params);
}

/**
 * Finalizes an order slot after order placement attempt completes.
 * If successful, caches the resulting order for the idempotency window.
 * If failed, deletes the in-flight reservation so the user can re-try.
 * Safely preserves completed order cache if called without an order.
 */
export async function finalizeOrderSlot(
  fingerprint: string,
  order?: any,
  now: number = Date.now()
): Promise<void> {
  await getProductionOrderStore().finalize(fingerprint, order, now);
}

/**
 * Testing & maintenance helper: completely resets tracked order throttles and idempotency caches.
 */
export async function resetOrderRateLimiter(): Promise<void> {
  const store = getProductionOrderStore();
  if (store.clear) {
    await store.clear();
  }
}
