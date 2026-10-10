'use server';

import { SAREE_PRODUCTS } from '@/data/products';
import { createClient } from '@/utils/supabase/server';
import { CartItem, OrderCustomerDetails, PlacedOrder } from '@/types';
import {
  createServerPaymentSession,
  verifyPaymentProviderServer,
  isPaymentGatewayConfigured,
  PaymentSession,
} from '@/utils/payment/provider';

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
    if (!items || items.length === 0) {
      return { success: false, isGatewayConfigured: false, error: 'Shopping bag is empty.' };
    }

    const { trustedSubtotal, trustedDiscount, trustedShipping, trustedGrandTotal } =
      calculateTrustedOrderTotals(items, couponCode);

    const isConfigured = isPaymentGatewayConfigured();
    const session = isConfigured ? createServerPaymentSession(trustedGrandTotal, 'INR') : undefined;

    return {
      success: true,
      isGatewayConfigured: isConfigured,
      session: session || undefined,
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
 * Propagates Supabase insert errors and only returns success upon durable storage.
 */
export async function placeVerifiedOrder(input: PlaceOrderServerInput): Promise<PlaceOrderServerResult> {
  try {
    const { items, couponCode, paymentMethod, paymentVerification, customer } = input;

    // 1. Validate customer details
    if (
      !customer ||
      !customer.firstName?.trim() ||
      !customer.email?.trim() ||
      !customer.phone?.trim() ||
      !customer.address?.trim() ||
      !customer.city?.trim() ||
      !customer.pincode?.trim()
    ) {
      return { success: false, error: 'Mandatory shipping and contact details are required.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email.trim())) {
      return { success: false, error: 'Invalid customer email address.' };
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return { success: false, error: 'Your shopping bag is empty.' };
    }

    // 2. Compute trusted totals from canonical catalog
    const { canonicalItems, trustedSubtotal, trustedDiscount, trustedShipping, trustedGrandTotal } =
      calculateTrustedOrderTotals(items, couponCode);

    // 3. Payment verification & status assignment
    let orderStatus: PlacedOrder['status'] = 'Confirmed';
    let paymentStatus = 'Unpaid';

    if (paymentMethod === 'cod') {
      // Cash on Delivery is confirmed for dispatch with doorstep collection
      orderStatus = 'Confirmed';
      paymentStatus = 'Pending COD Collection';
    } else if (paymentMethod === 'upi' || paymentMethod === 'card') {
      if (
        paymentVerification &&
        paymentVerification.paymentId &&
        paymentVerification.sessionId &&
        paymentVerification.signature
      ) {
        // Attempt strict cryptographic verification against payment provider
        const verificationResult = verifyPaymentProviderServer({
          paymentId: paymentVerification.paymentId,
          sessionId: paymentVerification.sessionId,
          signature: paymentVerification.signature,
          amount: trustedGrandTotal,
          currency: 'INR',
        });

        if (verificationResult.verified) {
          orderStatus = 'Confirmed';
          paymentStatus = `Verified & Captured (${paymentMethod.toUpperCase()}: ${paymentVerification.paymentId})`;
        } else {
          return {
            success: false,
            error: verificationResult.error || 'Payment provider verification failed: invalid signature or transaction mismatch.',
          };
        }
      } else {
        // Online payments without an active provider completion flow are disabled
        return {
          success: false,
          error: 'Online payment gateway integration is currently in progress. Please select Cash on Delivery for instant order confirmation.',
        };
      }
    } else {
      return { success: false, error: 'Unsupported payment method.' };
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
      customer: {
        firstName: customer.firstName.trim(),
        lastName: (customer.lastName || '').trim(),
        email: customer.email.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
        city: customer.city.trim(),
        state: (customer.state || '').trim(),
        pincode: customer.pincode.trim(),
      },
    };

    // 4. Persist to Supabase orders table with RLS and strictly verify database result
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: insertError } = await supabase.from('orders').insert([
        {
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
          customer: verifiedOrder.customer,
          status: orderStatus,
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertError) {
        console.error('Supabase orders table insertion error:', insertError);
        return {
          success: false,
          error: `Order could not be saved to the database (${insertError.message}). Please try again or contact customer support.`,
        };
      }
    } catch (dbException) {
      console.error('Supabase client exception during order insertion:', dbException);
      return {
        success: false,
        error: dbException instanceof Error ? dbException.message : 'Database connection error during order placement. Please try again.',
      };
    }

    // Return success strictly after database insertion succeeds
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
  }
}
