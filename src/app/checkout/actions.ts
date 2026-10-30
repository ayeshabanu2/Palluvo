'use server';

import { SAREE_PRODUCTS } from '@/data/products';
import { createClient } from '@/utils/supabase/server';
import { CartItem, OrderCustomerDetails, PlacedOrder } from '@/types';
import {
  createServerPaymentSession,
  verifyPaymentProviderServer,
  claimPaymentSession,
  releasePaymentClaim,
  confirmPaymentSession,
  consumePaymentSession,
  isPaymentGatewayConfigured,
  checkAndAcquirePaymentSessionSlot,
  PaymentSession,
  getPaymentStore,
  MisconfiguredPaymentStore,
} from '@/utils/payment/provider';
import { normalizeEmail } from '@/utils/format';
import {
  CHECKOUT_FIELD_LIMITS,
  ORDER_RATE_LIMIT_CONFIG,
  computeOrderFingerprint,
  isCanonicalItemMultisetEqual,
  isMailboxVerified,
  getConfirmedUserEmail,
  resolveClientIp,
  checkAndAcquireOrderSlot,
  finalizeOrderSlot,
  validateCustomerDetails,
  validateCheckoutItems as validateCheckoutItemsBase,
  validateCouponCode,
  findOwnedExistingOrder,
  toPlacedOrder,
} from './orderRateLimiter';

export { CHECKOUT_FIELD_LIMITS };

export interface CheckoutItemInput {
  productId: string;
  qty: number;
  selectedColor?: string;
  blouseOptionId?: string;
  blouseOptionName?: string;
}

export interface PaymentVerificationData {
  paymentId: string;
  sessionId: string;
  signature: string;
}

export interface PlaceOrderServerInput {
  items: CheckoutItemInput[];
  couponCode?: string;
  paymentMethod: 'upi' | 'card' | 'cod';
  paymentVerification?: PaymentVerificationData;
  customer: OrderCustomerDetails;
}

export interface PlaceOrderServerResult {
  success: boolean;
  order?: PlacedOrder;
  error?: string;
}

export interface PaymentSessionResult {
  success: boolean;
  isGatewayConfigured: boolean;
  session?: PaymentSession;
  subtotal?: number;
  discountAmount?: number;
  shippingFee?: number;
  grandTotal?: number;
  error?: string;
}

async function getClientIp(): Promise<string | null> {
  try {
    const { headers } = await import('next/headers');
    const headerList = await headers();
    return resolveClientIp(headerList);
  } catch {
    // headers() might not be available in non-request contexts or mock tests
    return null;
  }
}

/**
 * Validates checkout items shape, bounds, and catalog existence before calculation.
 */
function validateCheckoutItems(items: unknown): { valid: true; items: CheckoutItemInput[] } | { valid: false; error: string } {
  return validateCheckoutItemsBase(items, SAREE_PRODUCTS) as
    | { valid: true; items: CheckoutItemInput[] }
    | { valid: false; error: string };
}

/**
 * Computes canonical, trusted financial amounts on the server directly from the catalog.
 */
function calculateTrustedOrderTotals(items: CheckoutItemInput[], couponCode?: string) {
  const canonicalItems: CartItem[] = [];
  let trustedSubtotal = 0;

  for (const item of items) {
    const product = SAREE_PRODUCTS.find((p) => p.id === item.productId);
    if (!product) {
      throw new Error(`Invalid product reference: ${item.productId}`);
    }

    let canonicalBlousePrice = 0;
    let canonicalBlouseName = 'Unstitched Blouse';

    if (item.blouseOptionId) {
      const option = product.blouseOptions?.find((b) => b.id === item.blouseOptionId);
      if (option) {
        canonicalBlousePrice = option.price;
        canonicalBlouseName = option.name;
      }
    }

    const safeQty = Math.max(1, Math.min(10, Math.floor(Number(item.qty) || 1)));
    const itemPrice = Number(product.price) || 0;
    const itemTotal = (itemPrice + canonicalBlousePrice) * safeQty;
    trustedSubtotal += itemTotal;

    canonicalItems.push({
      id: `${product.id}-${item.selectedColor || 'default'}-${item.blouseOptionId || 'none'}`,
      productId: product.id,
      name: product.name,
      price: itemPrice,
      image: product.images && product.images.length > 0 ? product.images[0] : 'images/hero_saree_art.jpg',
      sareeType: product.sareeType || 'Silk',
      qty: safeQty,
      selectedColor: item.selectedColor,
      blouseOptionId: item.blouseOptionId,
      blouseOptionName: canonicalBlouseName,
      blousePrice: canonicalBlousePrice,
    });
  }

  let trustedDiscount = 0;
  const cleanCoupon = (couponCode || '').trim().toUpperCase();
  if (cleanCoupon === 'PALLUVO10' || cleanCoupon === 'MAGIC10') {
    trustedDiscount = Math.round(trustedSubtotal * 0.10);
  } else if (cleanCoupon === 'FIRSTDRAPE') {
    trustedDiscount = Math.min(500, trustedSubtotal);
  }

  const trustedShipping = trustedSubtotal >= 999 ? 0 : 199;
  const trustedGrandTotal = Math.max(0, trustedSubtotal - trustedDiscount + trustedShipping);

  return {
    canonicalItems,
    trustedSubtotal,
    trustedDiscount,
    trustedShipping,
    trustedGrandTotal,
  };
}

/**
 * Initiates a secure payment session on the server for online payment flows.
 */
export async function initiatePaymentSession(
  items: CheckoutItemInput[],
  couponCode?: string
): Promise<PaymentSessionResult> {
  try {
    const itemsValidation = validateCheckoutItems(items);
    if (!itemsValidation.valid) {
      return { success: false, isGatewayConfigured: false, error: itemsValidation.error };
    }

    if (couponCode !== undefined) {
      if (typeof couponCode !== 'string' || couponCode.length > CHECKOUT_FIELD_LIMITS.COUPON_MAX) {
        return { success: false, isGatewayConfigured: false, error: 'Invalid coupon code format.' };
      }
    }

    // 1. IP resolution and deployment proxy trust check
    const clientIp = await getClientIp();
    if (!clientIp) {
      console.error(
        '[Checkout] Payment session initiation rejected: No trusted client IP could be derived. Deployment must configure trusted proxy settings (e.g. TRUSTED_PLATFORM, TRUSTED_INGRESS_HEADER, or TRUSTED_PROXY_COUNT).'
      );
      return {
        success: false,
        isGatewayConfigured: false,
        error:
          'Payment initiation is temporarily unavailable due to unconfigured network proxy settings.',
      };
    }

    // 2. Per-IP admission control to bound memory & prevent unauthenticated session flooding
    const admission = checkAndAcquirePaymentSessionSlot(clientIp);
    if (!admission.allowed) {
      return {
        success: false,
        isGatewayConfigured: false,
        error: admission.error || 'Too many payment sessions initiated. Please wait before retrying.',
      };
    }

    const { trustedSubtotal, trustedDiscount, trustedShipping, trustedGrandTotal } =
      calculateTrustedOrderTotals(itemsValidation.items, couponCode);

    const isConfigured = isPaymentGatewayConfigured();
    if (!isConfigured) {
      return {
        success: true,
        isGatewayConfigured: false,
        subtotal: trustedSubtotal,
        discountAmount: trustedDiscount,
        shippingFee: trustedShipping,
        grandTotal: trustedGrandTotal,
      };
    }

    // Fail closed if payment store is misconfigured (e.g. production serverless without shared durable store)
    const paymentStore = getPaymentStore();
    if (paymentStore instanceof MisconfiguredPaymentStore) {
      console.error(
        `[Checkout] Payment session initiation rejected: ${paymentStore.reason}`
      );
      return {
        success: false,
        isGatewayConfigured: true,
        error:
          'Payment processing is temporarily unavailable due to a server configuration issue. A shared durable payment store is required in production.',
      };
    }

    const session = await createServerPaymentSession(trustedGrandTotal, 'INR', clientIp);
    if (!session) {
      return {
        success: false,
        isGatewayConfigured: true,
        error:
          'Payment session capacity reached on server. Please wait a moment and try again.',
      };
    }

    return {
      success: true,
      isGatewayConfigured: true,
      session,
      subtotal: trustedSubtotal,
      discountAmount: trustedDiscount,
      shippingFee: trustedShipping,
      grandTotal: trustedGrandTotal,
    };
  } catch (err: unknown) {
    return {
      success: false,
      isGatewayConfigured: false,
      error: err instanceof Error ? err.message : 'Could not initiate payment session.',
    };
  }
}

/**
 * Server-side verified order placement action.
 * Computes canonical amounts from trusted catalog data and verifies database persistence.
 * Normalizes email casing for reliable guest-order claiming and retrieval.
 * Enforces server-side distributed rate limiting, duplicate request idempotency, and payload length limits.
 */
export async function placeVerifiedOrder(input: PlaceOrderServerInput): Promise<PlaceOrderServerResult> {
  let fingerprint: string | null = null;
  let orderCreated: PlacedOrder | undefined = undefined;
  let slotAcquired = false;

  try {
    if (!input || typeof input !== 'object') {
      return { success: false, error: 'Invalid order input data.' };
    }

    const { items, couponCode, paymentMethod, paymentVerification, customer } = input;

    // 1. Validate customer details with length bounds BEFORE calculating or persisting
    const customerValidation = validateCustomerDetails(customer);
    if (!customerValidation.valid) {
      return { success: false, error: customerValidation.error };
    }
    const validatedCustomer = customerValidation.customer;

    // 2. Validate items with count bounds and shape validation BEFORE calculating or persisting
    const itemsValidation = validateCheckoutItems(items);
    if (!itemsValidation.valid) {
      return { success: false, error: itemsValidation.error };
    }
    const validatedItems = itemsValidation.items;

    // 3. Validate coupon code
    const couponValidation = validateCouponCode(couponCode);
    if (!couponValidation.valid) {
      return { success: false, error: couponValidation.error };
    }

    // 4. Validate payment method
    if (paymentMethod !== 'cod' && paymentMethod !== 'upi' && paymentMethod !== 'card') {
      return { success: false, error: 'Unsupported payment method.' };
    }

    // 5. Compute trusted totals from canonical catalog
    const { canonicalItems, trustedSubtotal, trustedDiscount, trustedShipping, trustedGrandTotal } =
      calculateTrustedOrderTotals(validatedItems, couponCode);

    // 6. Check authenticated user status to gate email quota against unverified guest spoofing
    let user: any = null;
    let isEmailVerified = false;
    let confirmedAccountEmail: string | undefined = undefined;
    let supabaseClient: any = null;
    try {
      supabaseClient = await createClient();
      const authResponse = await supabaseClient.auth.getUser();
      user = authResponse?.data?.user || null;
      confirmedAccountEmail = getConfirmedUserEmail(user) || undefined;
      isEmailVerified = isMailboxVerified(user, validatedCustomer.email);
    } catch {
      // In offline/test environments without Supabase client, user remains null (unverified)
    }

    // 7. Server-side Rate Limiting & Duplicate Request Idempotency Guard (especially for public COD creation)
    const clientIp = await getClientIp();
    if (!clientIp) {
      console.error(
        '[Checkout] Order processing rejected: No trusted client IP could be derived. Deployment must configure trusted proxy settings (e.g. TRUSTED_PLATFORM, TRUSTED_INGRESS_HEADER, or TRUSTED_PROXY_COUNT).'
      );
      return {
        success: false,
        error:
          'Order processing is temporarily unavailable due to unconfigured network proxy settings. Please configure trusted proxy headers (e.g. TRUSTED_PLATFORM, TRUSTED_INGRESS_HEADER, or TRUSTED_PROXY_COUNT).',
      };
    }

    fingerprint = computeOrderFingerprint(validatedCustomer, validatedItems, trustedGrandTotal, paymentMethod);

    const throttleResult = await checkAndAcquireOrderSlot({
      ip: clientIp,
      email: validatedCustomer.email,
      isEmailVerified,
      accountEmail: confirmedAccountEmail,
      fingerprint,
    });

    if (!throttleResult.allowed) {
      return { success: false, error: throttleResult.error };
    }

    // If duplicate identical request within idempotency window, return existing order
    if (throttleResult.isDuplicate && throttleResult.existingOrder) {
      return { success: true, order: throttleResult.existingOrder };
    }

    // Track reservation ownership: only true if THIS invocation genuinely reserved the slot
    slotAcquired = Boolean(throttleResult.slotAcquired ?? true);

    // 7. Payment verification & status assignment
    let orderStatus: PlacedOrder['status'] = 'Confirmed';
    let paymentStatus = 'Unpaid';

    if (paymentMethod === 'cod') {
      orderStatus = 'Confirmed';
      paymentStatus = 'Pending COD Collection';
    } else if (paymentMethod === 'upi' || paymentMethod === 'card') {
      if (
        paymentVerification &&
        paymentVerification.paymentId &&
        paymentVerification.sessionId &&
        paymentVerification.signature
      ) {
        // Step 1: Pre-verify payment signature, session validity, amount match, and currency
        // Set autoConsume: false so payment session is NOT consumed before order is committed to DB
        const verificationResult = await verifyPaymentProviderServer({
          paymentId: paymentVerification.paymentId,
          sessionId: paymentVerification.sessionId,
          signature: paymentVerification.signature,
          amount: trustedGrandTotal,
          currency: 'INR',
          autoConsume: false,
        });

        if (!verificationResult.verified) {
          // If transaction was already consumed, check if this is an idempotent retry of an already-persisted order
          if (verificationResult.duplicate) {
            try {
              const supabase = supabaseClient || (await createClient());
              if (!user) {
                const authData = await supabase.auth.getUser();
                user = authData?.data?.user || null;
              }

              const existingDbOrder = await findOwnedExistingOrder({
                supabase,
                orderNumber: verificationResult.orderNumber,
                paymentId: paymentVerification.paymentId,
                user,
                validatedCustomer,
              });

              if (existingDbOrder) {
                const recoveredOrder: PlacedOrder = toPlacedOrder(
                  existingDbOrder,
                  validatedCustomer,
                  new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                  canonicalItems,
                  trustedSubtotal,
                  trustedDiscount,
                  trustedShipping,
                  trustedGrandTotal,
                  paymentMethod
                );
                orderCreated = recoveredOrder;
                return { success: true, order: recoveredOrder };
              }
            } catch (recoveryErr) {
              console.error('[Checkout] Error checking existing order for duplicate payment:', recoveryErr);
            }

            return {
              success: false,
              error:
                'Duplicate transaction detected. This payment transaction has already been consumed or claimed for another order.',
            };
          }

          return {
            success: false,
            error:
              verificationResult.error ||
              'Payment provider verification failed: invalid signature or transaction mismatch.',
          };
        }

        orderStatus = 'Confirmed';
        paymentStatus = `Verified & Captured (${paymentMethod.toUpperCase()}: ${paymentVerification.paymentId})`;
      } else {
        return {
          success: false,
          error:
            'Online payment gateway integration is currently in progress. Please select Cash on Delivery for instant order confirmation.',
        };
      }
    }

    const orderNumber = 'PLV-' + Math.floor(100000 + Math.random() * 900000);
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const verifiedOrder: PlacedOrder = {
      id: orderNumber,
      orderNumber,
      date: dateStr,
      status: orderStatus,
      items: canonicalItems,
      subtotal: trustedSubtotal,
      discountAmount: trustedDiscount,
      shippingFee: trustedShipping,
      grandTotal: trustedGrandTotal,
      paymentMethod,
      customer: validatedCustomer,
    };

    // 8. Persist to Supabase orders table with RLS, atomic payment reservation claim, and duplicate protection
    let paymentClaimed = false;
    try {
      const supabase = supabaseClient || (await createClient());
      if (!user) {
        const authData = await supabase.auth.getUser();
        user = authData?.data?.user || null;
      }

      // Check for existing order with this paymentId before creating a new one (idempotency guard)
      if (paymentVerification?.paymentId) {
        const existingPaymentOrder = await findOwnedExistingOrder({
          supabase,
          paymentId: paymentVerification.paymentId,
          user,
          validatedCustomer,
        });

        if (existingPaymentOrder) {
          const duplicateOrder: PlacedOrder = toPlacedOrder(
            existingPaymentOrder,
            validatedCustomer,
            verifiedOrder.date,
            canonicalItems,
            trustedSubtotal,
            trustedDiscount,
            trustedShipping,
            trustedGrandTotal,
            paymentMethod
          );
          orderCreated = duplicateOrder;
          return { success: true, order: duplicateOrder };
        }
      }

      // Check for recent duplicate order in Supabase within the deduplication window
      const dedupeWindowAgo = new Date(Date.now() - ORDER_RATE_LIMIT_CONFIG.IDEMPOTENCY_WINDOW_MS).toISOString();
      const { data: recentDbOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('customer->>email', validatedCustomer.email)
        .gte('created_at', dedupeWindowAgo)
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentDbOrders && recentDbOrders.length > 0) {
        const matchingDbOrder = recentDbOrders.find((dbo: any) => {
          if (Number(dbo.grand_total) !== trustedGrandTotal) return false;
          if (dbo.payment_method && dbo.payment_method !== paymentMethod) return false;
          if (!isCanonicalItemMultisetEqual(canonicalItems, dbo.items)) return false;
          if (dbo.customer) {
            const dboFp = computeOrderFingerprint(
              dbo.customer,
              Array.isArray(dbo.items) ? dbo.items : [],
              Number(dbo.grand_total),
              dbo.payment_method || 'cod'
            );
            if (dboFp !== fingerprint) return false;
          }
          return true;
        });

        if (matchingDbOrder) {
          const duplicateOrder: PlacedOrder = {
            id: matchingDbOrder.id,
            orderNumber: matchingDbOrder.order_number || matchingDbOrder.id,
            date: verifiedOrder.date,
            status: matchingDbOrder.status || 'Confirmed',
            items: matchingDbOrder.items || canonicalItems,
            subtotal: matchingDbOrder.subtotal || trustedSubtotal,
            discountAmount: matchingDbOrder.discount_amount || trustedDiscount,
            shippingFee: matchingDbOrder.shipping_fee || trustedShipping,
            grandTotal: matchingDbOrder.grand_total || trustedGrandTotal,
            paymentMethod: matchingDbOrder.payment_method || paymentMethod,
            customer: matchingDbOrder.customer || validatedCustomer,
          };
          orderCreated = duplicateOrder;
          return { success: true, order: duplicateOrder };
        }
      }

      // Atomically claim payment ID before order creation to prevent concurrent double-order submissions
      if (paymentMethod === 'upi' || paymentMethod === 'card') {
        if (paymentVerification?.sessionId && paymentVerification?.paymentId) {
          const claimRes = await claimPaymentSession({
            sessionId: paymentVerification.sessionId,
            paymentId: paymentVerification.paymentId,
            orderNumber,
            amount: trustedGrandTotal,
            currency: 'INR',
          });

          if (!claimRes.success) {
            if (claimRes.duplicate) {
              // Concurrent submission or already claimed: locate and return existing winner order scoped to requester
              let existingWinnerOrder: any = null;
              for (let attempt = 0; attempt < 3; attempt++) {
                existingWinnerOrder = await findOwnedExistingOrder({
                  supabase,
                  orderNumber: claimRes.orderNumber,
                  paymentId: paymentVerification.paymentId,
                  user,
                  validatedCustomer,
                });

                if (existingWinnerOrder) break;
                await new Promise((resolve) => setTimeout(resolve, 100));
              }

              if (existingWinnerOrder) {
                const recoveredOrder: PlacedOrder = toPlacedOrder(
                  existingWinnerOrder,
                  validatedCustomer,
                  verifiedOrder.date,
                  canonicalItems,
                  trustedSubtotal,
                  trustedDiscount,
                  trustedShipping,
                  trustedGrandTotal,
                  paymentMethod
                );
                orderCreated = recoveredOrder;
                return { success: true, order: recoveredOrder };
              }

              return {
                success: false,
                error:
                  'A concurrent transaction for this payment is currently being processed. Please check your order history or wait a moment.',
              };
            }

            return {
              success: false,
              error: claimRes.error || 'Payment session could not be claimed for this order.',
            };
          }

          paymentClaimed = true;
        }
      }

      const orderPayload: Record<string, any> = {
        id: orderNumber,
        order_number: orderNumber,
        user_id: user?.id || null,
        items: canonicalItems,
        subtotal: trustedSubtotal,
        discount_amount: trustedDiscount,
        shipping_fee: trustedShipping,
        grand_total: trustedGrandTotal,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        payment_id: paymentVerification?.paymentId || null,
        customer: verifiedOrder.customer,
        status: orderStatus,
        created_at: new Date().toISOString(),
      };

      let { error: insertError } = await supabase.from('orders').insert([orderPayload]);

      // If insert failed because payment_id column does not exist yet in database schema, retry without it
      if (insertError && (insertError.code === 'PGRST204' || insertError.message?.includes('payment_id'))) {
        console.warn('[Checkout] orders table does not have payment_id column yet, retrying insertion without payment_id');
        const fallbackPayload = { ...orderPayload };
        delete fallbackPayload.payment_id;
        const fallbackRes = await supabase.from('orders').insert([fallbackPayload]);
        insertError = fallbackRes.error;
      }

      if (insertError) {
        console.error('Supabase orders table insertion error:', insertError);
        // Release atomic payment claim so customer can retry without lockout
        if (paymentClaimed && paymentVerification?.sessionId && paymentVerification?.paymentId) {
          await releasePaymentClaim({
            sessionId: paymentVerification.sessionId,
            paymentId: paymentVerification.paymentId,
            orderNumber,
          }).catch((relErr) => console.error('[Checkout] Error releasing payment claim on insert failure:', relErr));
        }
        return {
          success: false,
          error: `Order could not be saved to the database (${insertError.message}). Please try again or contact customer support.`,
        };
      }
    } catch (dbException) {
      console.error('Supabase client exception during order insertion:', dbException);
      if (paymentClaimed && paymentVerification?.sessionId && paymentVerification?.paymentId) {
        await releasePaymentClaim({
          sessionId: paymentVerification.sessionId,
          paymentId: paymentVerification.paymentId,
          orderNumber,
        }).catch((relErr) => console.error('[Checkout] Error releasing payment claim on DB exception:', relErr));
      }
      return {
        success: false,
        error:
          dbException instanceof Error
            ? dbException.message
            : 'Database connection error during order placement. Please try again.',
      };
    }

    // 9. Order committed successfully to database! Durably confirm payment session and finalize replay state
    if (paymentMethod === 'upi' || paymentMethod === 'card') {
      if (paymentVerification?.sessionId && paymentVerification?.paymentId) {
        try {
          const confirmRes = await confirmPaymentSession({
            sessionId: paymentVerification.sessionId,
            paymentId: paymentVerification.paymentId,
            orderNumber: verifiedOrder.orderNumber,
            amount: trustedGrandTotal,
            currency: 'INR',
          });
          if (!confirmRes.success) {
            console.warn('[Checkout] Payment confirmation returned non-success:', confirmRes.error);
          }
        } catch (confirmErr) {
          console.error('[Checkout] Error committing payment session confirmation:', confirmErr);
          // Order was already persisted to database, so checkout completes successfully
        }
      }
    }

    orderCreated = verifiedOrder;
    return {
      success: true,
      order: verifiedOrder,
    };
  } catch (err: unknown) {
    console.error('Server error in placeVerifiedOrder:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected server error occurred. Please try again.',
    };
  } finally {
    if (slotAcquired && fingerprint) {
      await finalizeOrderSlot(fingerprint, orderCreated);
    }
  }
}
