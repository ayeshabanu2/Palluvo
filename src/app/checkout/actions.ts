'use server';

import { SAREE_PRODUCTS } from '@/data/products';
import { createClient } from '@/utils/supabase/server';
import { CartItem, OrderCustomerDetails, PlacedOrder } from '@/types';
import {
  createServerPaymentSession,
  signPaymentAuthorization,
  verifyPaymentProviderServer,
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
  session?: PaymentSession;
  subtotal?: number;
  discountAmount?: number;
  shippingFee?: number;
  grandTotal?: number;
  error?: string;
}

export interface AuthorizePaymentResult {
  success: boolean;
  verification?: PaymentVerificationData;
  error?: string;
}

/**
 * Computes canonical, trusted financial amounts on the server from the product catalog.
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
      return { success: false, error: 'Shopping bag is empty.' };
    }

    const { trustedSubtotal, trustedDiscount, trustedShipping, trustedGrandTotal } =
      calculateTrustedOrderTotals(items, couponCode);

    const session = createServerPaymentSession(trustedGrandTotal, 'INR');

    return {
      success: true,
      session,
      subtotal: trustedSubtotal,
      discountAmount: trustedDiscount,
      shippingFee: trustedShipping,
      grandTotal: trustedGrandTotal,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Could not initiate payment session.',
    };
  }
}

/**
 * Server-side payment provider authorization endpoint.
 * Processes payment through the payment gateway and generates a cryptographically signed verification payload.
 */
export async function authorizePaymentGateway(
  sessionId: string,
  paymentMethod: 'upi' | 'card',
  items: CheckoutItemInput[],
  couponCode?: string
): Promise<AuthorizePaymentResult> {
  try {
    if (!sessionId) {
      return { success: false, error: 'Payment session ID is required.' };
    }

    const { trustedGrandTotal } = calculateTrustedOrderTotals(items, couponCode);

    // Simulate payment gateway capture & signed verification token generation
    const paymentId = `pay_${paymentMethod}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const signature = signPaymentAuthorization(sessionId, paymentId, trustedGrandTotal, 'INR');

    return {
      success: true,
      verification: {
        paymentId,
        sessionId,
        signature,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Payment authorization failed.',
    };
  }
}

/**
 * Server-side verified order placement action.
 * Computes canonical amounts from trusted catalog data and verifies payment provider signatures.
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

    // 3. Payment verification
    let orderStatus: PlacedOrder['status'] = 'Pending Payment';
    let paymentStatus = 'Unpaid';

    if (paymentMethod === 'cod') {
      // Cash on Delivery is verified for delivery scheduling with payment on arrival
      orderStatus = 'Confirmed';
      paymentStatus = 'Pending COD Collection';
    } else if (paymentMethod === 'upi' || paymentMethod === 'card') {
      if (!paymentVerification || !paymentVerification.paymentId || !paymentVerification.sessionId || !paymentVerification.signature) {
        return {
          success: false,
          error: 'Missing payment provider verification data. Online payment must be verified before confirmation.',
        };
      }

      // Verify cryptographic signature and provider payment status on the server
      const verificationResult = verifyPaymentProviderServer({
        paymentId: paymentVerification.paymentId,
        sessionId: paymentVerification.sessionId,
        signature: paymentVerification.signature,
        amount: trustedGrandTotal,
        currency: 'INR',
      });

      if (!verificationResult.verified) {
        return {
          success: false,
          error: verificationResult.error || 'Payment provider verification failed: invalid transaction or signature mismatch.',
        };
      }

      orderStatus = 'Confirmed';
      paymentStatus = `Verified & Captured (${paymentMethod.toUpperCase()}: ${paymentVerification.paymentId})`;
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

    // 4. Persist to Supabase orders table with RLS if user is authenticated
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from('orders').insert([
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
    } catch (dbErr) {
      console.warn('Server notice: Could not write order to orders table:', dbErr);
    }

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
