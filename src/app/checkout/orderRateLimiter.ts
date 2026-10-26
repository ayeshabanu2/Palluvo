import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';

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
 * Returns the normalized confirmed email address of the authenticated user if email confirmation is enforced
 * and the user has a valid confirmed email timestamp. Otherwise returns null.
 */
export function getConfirmedUserEmail(
  user: { email?: string; email_confirmed_at?: string | null } | null | undefined
): string | null {
  if (!isEmailConfirmationEnforced()) {
    return null;
  }
  if (!user || !user.email) {
    return null;
  }
  if (
    !user.email_confirmed_at ||
    typeof user.email_confirmed_at !== 'string' ||
    user.email_confirmed_at.trim().length === 0
  ) {
    return null;
  }
  return user.email.toLowerCase().trim();
}

/**
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
  const confirmed = getConfirmedUserEmail(user);
  if (!confirmed) {
    return false;
  }
  return confirmed === (submittedEmail || '').toLowerCase().trim();
}

export type HeaderSource =
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

function getHeaderValue(headers: HeaderSource, name: string): string | null {
  if (!headers) return null;
  if (typeof (headers as any).get === 'function') {
    return (headers as any).get(name) || (headers as any).get(name.toLowerCase()) || null;
  }
  const lowerName = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lowerName) {
      if (Array.isArray(v)) return v[0] || null;
      return typeof v === 'string' ? v : null;
    }
  }
  return null;
}

function cleanAndValidateIp(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let trimmed = raw.trim();
  if (trimmed.startsWith('[') && trimmed.includes(']')) {
    const end = trimmed.indexOf(']');
    trimmed = trimmed.substring(1, end);
  } else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(trimmed)) {
    trimmed = trimmed.split(':')[0];
  }
  if (net.isIP(trimmed) !== 0) {
    return trimmed;
  }
  return null;
}

export interface TrustedProxyOptions {
  trustedHeader?: string;
  trustedProxies?: string[];
  trustedProxyCount?: number;
  platform?: 'cloudflare' | 'vercel' | 'local';
  allowLoopbackFallback?: boolean;
}

/**
 * Derives the trusted client IP for rate limiting from ingress headers or proxy chains.
 *
 * Security Requirements:
 * 1. Requires deployment-verified trust configuration. Headers like cf-connecting-ip, x-real-ip,
 *    and x-vercel-forwarded-for are ONLY trusted when explicitly configured via TRUSTED_INGRESS_HEADER,
 *    TRUSTED_PLATFORM, or when running under a verified platform deployment (e.g. Vercel, Cloudflare Pages).
 * 2. Akamai Note: Akamai Property Manager permits an origin toggle ("Allow Client to set True-Client-IP")
 *    which can pass through client-provided values. Therefore, True-Client-IP is NOT trusted implicitly
 *    from TRUSTED_PLATFORM alone. It must be explicitly configured via TRUSTED_INGRESS_HEADER after verifying
 *    origin access restrictions and overwrite behavior.
 * 3. For x-forwarded-for, trust is ONLY established when an explicit proxy chain configuration is provided
 *    (TRUSTED_PROXY_COUNT > 0 or TRUSTED_PROXIES list).
 * 4. In unconfigured environments (no verified platform or trusted-IP setting), fails closed by returning null
 *    rather than lumping all visitors into a single shared loopback bucket (which would exhaust the 5-order
 *    quota across all visitors).
 */
export function resolveClientIp(
  headers: HeaderSource,
  options?: TrustedProxyOptions
): string | null {
  // 1. Explicit configured ingress header (e.g. TRUSTED_INGRESS_HEADER="cf-connecting-ip" or "x-real-ip" or "true-client-ip")
  const configuredHeader =
    options?.trustedHeader ||
    process.env.TRUSTED_INGRESS_HEADER ||
    process.env.TRUSTED_CLIENT_IP_HEADER;

  if (configuredHeader) {
    const raw = getHeaderValue(headers, configuredHeader);
    const valid = cleanAndValidateIp(raw);
    return valid || null;
  }

  // 2. Documented, guaranteed-overwritten platform headers when deployment platform is verified
  const platform =
    options?.platform ||
    (process.env.VERCEL === '1' || process.env.VERCEL_ENV ? 'vercel' : null) ||
    (process.env.CF_PAGES === '1' || process.env.CLOUDFLARE === '1' ? 'cloudflare' : null) ||
    (process.env.TRUSTED_PLATFORM ? (process.env.TRUSTED_PLATFORM.trim().toLowerCase() as any) : null);

  if (platform === 'vercel') {
    // Vercel edge infrastructure strictly overwrites x-vercel-forwarded-for and x-real-ip
    const vercelIp =
      cleanAndValidateIp(getHeaderValue(headers, 'x-vercel-forwarded-for')) ||
      cleanAndValidateIp(getHeaderValue(headers, 'x-real-ip'));
    return vercelIp || null;
  }

  if (platform === 'cloudflare') {
    // Cloudflare edge strictly overwrites cf-connecting-ip
    const cfIp = cleanAndValidateIp(getHeaderValue(headers, 'cf-connecting-ip'));
    return cfIp || null;
  }

  // 3. Trusted proxy chain parsing of x-forwarded-for (ONLY if proxy trust is explicitly configured)
  const trustedProxyList =
    options?.trustedProxies ||
    (process.env.TRUSTED_PROXIES || process.env.TRUSTED_PROXY_IPS)
      ?.split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

  const envProxyCount = process.env.TRUSTED_PROXY_COUNT;
  const configuredProxyCount =
    options?.trustedProxyCount !== undefined
      ? options.trustedProxyCount
      : envProxyCount !== undefined && envProxyCount.trim().length > 0
      ? parseInt(envProxyCount, 10)
      : undefined;

  const hasConfiguredProxyTrust =
    (trustedProxyList && trustedProxyList.length > 0) ||
    (configuredProxyCount !== undefined && !isNaN(configuredProxyCount) && configuredProxyCount > 0);

  if (hasConfiguredProxyTrust) {
    const xForwardedFor = getHeaderValue(headers, 'x-forwarded-for');
    if (xForwardedFor) {
      const rawTokens = xForwardedFor.split(',').map((s) => s.trim()).filter(Boolean);
      const validIps = rawTokens.map(cleanAndValidateIp).filter((ip): ip is string => ip !== null);

      if (validIps.length > 0) {
        // If trusted proxies list configured (e.g. 10.0.0.1, 10.0.0.2, loopback)
        if (trustedProxyList && trustedProxyList.length > 0) {
          const trustedSet = new Set(trustedProxyList);
          for (let i = validIps.length - 1; i >= 0; i--) {
            const ip = validIps[i];
            const isTrusted =
              trustedSet.has(ip.toLowerCase()) ||
              (trustedSet.has('loopback') && (ip === '127.0.0.1' || ip === '::1'));
            if (!isTrusted) {
              return ip;
            }
          }
          // All IPs in chain were trusted proxies: no authentic client IP found
          return null;
        }

        // If trusted proxy count configured
        if (configuredProxyCount !== undefined && configuredProxyCount > 0) {
          const targetIndex = validIps.length - configuredProxyCount;
          if (targetIndex >= 0 && targetIndex < validIps.length) {
            return validIps[targetIndex];
          }
          return null;
        }
      }
    }
  }

  // 4. Opt-in local development loopback fallback only when explicitly enabled
  if (platform === 'local' || options?.allowLoopbackFallback) {
    return '127.0.0.1';
  }

  // 5. Default configuration: no recognized platform or trusted-IP setting.
  // Fails closed to null so calling actions can reject requests with an actionable error
  // instead of lumping every customer into a shared loopback quota bucket.
  return null;
}


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
  color?: string;
  swatches?: Array<{ name: string; hex?: string; inStock?: boolean }>;
  blouseOptions?: Array<{ id: string; name?: string; price?: number }>;
};

/**
 * Validates checkout items shape, bounds, integer quantities, catalog references,
 * and ensures selectedColor is an available swatch from the canonical product catalog.
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

    const rawColor =
      item.selectedColor !== undefined && item.selectedColor !== null
        ? String(item.selectedColor).trim()
        : '';
    if (rawColor && rawColor.length > CHECKOUT_FIELD_LIMITS.COLOR_MAX) {
      return { valid: false, error: `Invalid color selection for item ${item.productId}.` };
    }

    const rawBlouseId =
      item.blouseOptionId !== undefined && item.blouseOptionId !== null
        ? String(item.blouseOptionId).trim()
        : '';
    if (rawBlouseId && rawBlouseId.length > CHECKOUT_FIELD_LIMITS.BLOUSE_OPTION_ID_MAX) {
      return { valid: false, error: `Invalid blouse option ID for item ${item.productId}.` };
    }

    const rawBlouseName =
      item.blouseOptionName !== undefined && item.blouseOptionName !== null
        ? String(item.blouseOptionName).trim()
        : '';
    if (rawBlouseName && rawBlouseName.length > CHECKOUT_FIELD_LIMITS.BLOUSE_OPTION_NAME_MAX) {
      return { valid: false, error: `Invalid blouse option name for item ${item.productId}.` };
    }

    let canonicalColor: string | undefined = undefined;
    let canonicalBlouseId: string | undefined = undefined;
    let canonicalBlouseName: string | undefined = undefined;

    // Catalog verification if catalog provided
    if (catalog) {
      if (Array.isArray(catalog)) {
        if (catalog.length > 0 && typeof catalog[0] === 'string') {
          if (!(catalog as string[]).includes(item.productId)) {
            return { valid: false, error: `Invalid product reference: ${item.productId}` };
          }
          canonicalColor = rawColor || undefined;
          canonicalBlouseId = rawBlouseId || undefined;
          canonicalBlouseName = rawBlouseName || undefined;
        } else {
          const product = (catalog as CatalogProductRef[]).find((p) => p.id === item.productId);
          if (!product) {
            return { valid: false, error: `Invalid product reference: ${item.productId}` };
          }

          // 1. Swatch & Color Validation
          const swatches =
            product.swatches && Array.isArray(product.swatches) && product.swatches.length > 0
              ? product.swatches
              : undefined;

          if (rawColor) {
            if (swatches) {
              const matchedSwatch = swatches.find(
                (s) => (s?.name || '').trim().toLowerCase() === rawColor.toLowerCase()
              );
              if (!matchedSwatch) {
                const availableNames = swatches.map((s) => s.name).join(', ');
                return {
                  valid: false,
                  error: `Invalid color "${rawColor}" for saree ${item.productId}. Available colors: ${availableNames}.`,
                };
              }
              if (matchedSwatch.inStock === false) {
                return {
                  valid: false,
                  error: `Color "${matchedSwatch.name}" is currently out of stock for saree ${item.productId}.`,
                };
              }
              canonicalColor = matchedSwatch.name;
            } else if (product.color) {
              if (rawColor.toLowerCase() !== product.color.trim().toLowerCase()) {
                return {
                  valid: false,
                  error: `Invalid color "${rawColor}" for saree ${item.productId}. Available color: ${product.color}.`,
                };
              }
              canonicalColor = product.color;
            } else {
              canonicalColor = rawColor;
            }
          } else {
            // Define canonical default when selectedColor is omitted
            if (swatches) {
              const availableSwatch = swatches.find((s) => s.inStock !== false);
              if (!availableSwatch) {
                return {
                  valid: false,
                  error: `All color options for saree ${item.productId} are currently out of stock.`,
                };
              }
              canonicalColor = availableSwatch.name;
            } else if (product.color) {
              canonicalColor = product.color;
            }
          }

          // 2. Blouse Option Validation
          if (rawBlouseId && product.blouseOptions) {
            const option = product.blouseOptions.find((b) => b.id === rawBlouseId);
            if (!option) {
              return { valid: false, error: `Invalid blouse option ${rawBlouseId} for saree ${item.productId}` };
            }
            canonicalBlouseId = option.id;
            canonicalBlouseName = option.name || rawBlouseName || undefined;
          } else {
            canonicalBlouseId = rawBlouseId || undefined;
            canonicalBlouseName = rawBlouseName || undefined;
          }
        }
      } else if (catalog instanceof Set) {
        if (!catalog.has(item.productId)) {
          return { valid: false, error: `Invalid product reference: ${item.productId}` };
        }
        canonicalColor = rawColor || undefined;
        canonicalBlouseId = rawBlouseId || undefined;
        canonicalBlouseName = rawBlouseName || undefined;
      }
    } else {
      canonicalColor = rawColor || undefined;
      canonicalBlouseId = rawBlouseId || undefined;
      canonicalBlouseName = rawBlouseName || undefined;
    }

    validatedItems.push({
      productId: item.productId.trim(),
      qty: safeQty,
      selectedColor: canonicalColor,
      blouseOptionId: canonicalBlouseId,
      blouseOptionName: canonicalBlouseName,
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
    JSON.stringify([
      (item?.productId || '').trim(),
      Number(item?.qty) || 0,
      (item?.selectedColor || '').trim().toLowerCase(),
      (item?.blouseOptionId || '').trim().toLowerCase(),
    ]);

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
 * Computes an unambiguous deterministic SHA-256 fingerprint for an order.
 * Used for idempotency validation and duplicate-request deduplication.
 * Canonicalizes customer fields and items into a fixed-shape structured JSON payload
 * to eliminate delimiter-injection collisions across caller-controlled fields.
 */
export function computeOrderFingerprint(
  customer: OrderCustomerRateLimitDetails,
  items: CheckoutItemRateLimitInput[],
  grandTotal: number,
  paymentMethod: string = 'cod'
): string {
  const canonicalCustomer = {
    firstName: (customer?.firstName || '').trim().toLowerCase(),
    lastName: (customer?.lastName || '').trim().toLowerCase(),
    email: (customer?.email || '').trim().toLowerCase(),
    phone: (customer?.phone || '').trim(),
    address: (customer?.address || '').trim().toLowerCase(),
    city: (customer?.city || '').trim().toLowerCase(),
    state: (customer?.state || '').trim().toLowerCase(),
    pincode: (customer?.pincode || '').trim(),
  };

  const canonicalItems = [...items]
    .map((item) => ({
      productId: (item?.productId || '').trim(),
      qty: Number(item?.qty) || 0,
      selectedColor: (item?.selectedColor || '').trim().toLowerCase(),
      blouseOptionId: (item?.blouseOptionId || '').trim().toLowerCase(),
    }))
    .sort((a, b) => {
      const keyA = JSON.stringify([a.productId, a.selectedColor, a.blouseOptionId, a.qty]);
      const keyB = JSON.stringify([b.productId, b.selectedColor, b.blouseOptionId, b.qty]);
      return keyA.localeCompare(keyB);
    });

  const canonicalPayload = {
    customer: canonicalCustomer,
    items: canonicalItems,
    grandTotal: Number(grandTotal) || 0,
    paymentMethod: (paymentMethod || 'cod').trim().toLowerCase(),
  };

  const raw = JSON.stringify(canonicalPayload);
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
    ip?: string | null;
    email?: string;
    isEmailVerified?: boolean;
    accountEmail?: string;
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
    ip?: string | null;
    email?: string;
    isEmailVerified?: boolean;
    accountEmail?: string;
    fingerprint?: string;
    now?: number;
  }): Promise<OrderThrottleResult> {
    try {
      if (!params.ip || params.ip === 'unknown' || !cleanAndValidateIp(params.ip)) {
        return {
          allowed: false,
          slotAcquired: false,
          error:
            'Order processing is temporarily unavailable due to unconfigured network proxy settings. Please configure trusted proxy headers (e.g. TRUSTED_PLATFORM, TRUSTED_INGRESS_HEADER, or TRUSTED_PROXY_COUNT).',
        };
      }

      const supabase = await this.getClient();
      if (!supabase) {
        return {
          allowed: false,
          error: 'Order processing service is currently unavailable. Please contact customer support.',
        };
      }

      const ipKey = hashOrderRateIdentifier(`ip:${params.ip}`);
      // Only enforce shared hard rate-limiting on email if ownership is verified.
      // Prevents unverified public/guest submissions from poisoning a victim's email quota.
      const emailKey =
        params.email && params.isEmailVerified ? hashOrderRateIdentifier(`email:${params.email}`) : '';
      // Separate quota key based on authenticated user's confirmed email principal
      const accountKey =
        params.accountEmail ? hashOrderRateIdentifier(`account:${params.accountEmail}`) : '';

      const { data, error } = await supabase.rpc('acquire_order_slot', {
        p_ip_key: ipKey,
        p_email_key: emailKey,
        p_account_key: accountKey,
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
  accountRecords: Record<string, StoredRateRecord>;
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
          accountRecords: parsed?.accountRecords && typeof parsed.accountRecords === 'object' ? parsed.accountRecords : {},
          idempotencyRecords:
            parsed?.idempotencyRecords && typeof parsed.idempotencyRecords === 'object' ? parsed.idempotencyRecords : {},
        };
      }
    } catch {}
    return {
      globalTimestamps: [],
      ipRecords: {},
      emailRecords: {},
      accountRecords: {},
      idempotencyRecords: {},
    };
  }

  private writeState(state: PersistentSharedState): void {
    const tmpPath = `${this.storeFilePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(state), 'utf8');
    fs.renameSync(tmpPath, this.storeFilePath);
  }

  async checkAndAcquire(params: {
    ip?: string | null;
    email?: string;
    isEmailVerified?: boolean;
    accountEmail?: string;
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
      if (!cleanIp || cleanIp === 'unknown' || !cleanAndValidateIp(cleanIp)) {
        return {
          allowed: false,
          slotAcquired: false,
          error:
            'Order processing is temporarily unavailable due to unconfigured network proxy settings. Please configure trusted proxy headers (e.g. TRUSTED_PLATFORM, TRUSTED_INGRESS_HEADER, or TRUSTED_PROXY_COUNT).',
        };
      }

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

      // 4. Authenticated Account Quota & Cooldown Check
      // Applies a separate quota key based on the authenticated user's confirmed email principal,
      // preventing authenticated users from bypassing the quota by varying guest contact emails.
      const cleanAccountEmail = params.accountEmail ? params.accountEmail.toLowerCase().trim() : '';
      if (cleanAccountEmail) {
        const accountRecord = state.accountRecords[cleanAccountEmail];
        if (accountRecord) {
          accountRecord.timestamps = accountRecord.timestamps.filter(
            (t) => now - t < ORDER_RATE_LIMIT_CONFIG.WINDOW_MS
          );
          if (now - accountRecord.lastUpdated < ORDER_RATE_LIMIT_CONFIG.MIN_ORDER_INTERVAL_MS) {
            return {
              allowed: false,
              slotAcquired: false,
              error: 'Please wait a few seconds before placing another order.',
            };
          }
          if (accountRecord.timestamps.length >= ORDER_RATE_LIMIT_CONFIG.MAX_ORDERS_PER_EMAIL) {
            return {
              allowed: false,
              slotAcquired: false,
              error: 'Maximum order placement attempts reached for this account. Please try again in 10 minutes.',
            };
          }
        }
      }

      // 5. Contact Email Rate Limit & Cooldown Check
      // Only enforce shared hard rate-limiting on email if ownership is verified.
      // Prevents unverified public/guest submissions from poisoning a victim's email quota.
      const cleanEmail =
        params.email && params.isEmailVerified ? params.email.toLowerCase().trim() : '';
      if (cleanEmail && cleanEmail !== cleanAccountEmail) {
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

      // 6. Reserve slot atomically
      state.globalTimestamps.push(now);

      if (cleanIp && cleanIp !== 'unknown') {
        const rec = state.ipRecords[cleanIp] || { timestamps: [], lastUpdated: 0 };
        rec.timestamps = (rec.timestamps || []).filter((t) => now - t < ORDER_RATE_LIMIT_CONFIG.WINDOW_MS);
        rec.timestamps.push(now);
        rec.lastUpdated = now;
        state.ipRecords[cleanIp] = rec;
      }

      if (cleanAccountEmail) {
        const rec = state.accountRecords[cleanAccountEmail] || { timestamps: [], lastUpdated: 0 };
        rec.timestamps = (rec.timestamps || []).filter((t) => now - t < ORDER_RATE_LIMIT_CONFIG.WINDOW_MS);
        rec.timestamps.push(now);
        rec.lastUpdated = now;
        state.accountRecords[cleanAccountEmail] = rec;
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
  ip?: string | null;
  email?: string;
  isEmailVerified?: boolean;
  accountEmail?: string;
  fingerprint?: string;
  now?: number;
}): Promise<OrderThrottleResult> {
  if (!params.ip || typeof params.ip !== 'string' || !cleanAndValidateIp(params.ip)) {
    return {
      allowed: false,
      slotAcquired: false,
      error:
        'Order processing is temporarily unavailable due to unconfigured network proxy settings. Please configure trusted proxy headers (e.g. TRUSTED_PLATFORM, TRUSTED_INGRESS_HEADER, or TRUSTED_PROXY_COUNT).',
    };
  }
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
